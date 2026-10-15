const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const crypto = require('crypto');

let db;

function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(secret, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifySecret(secret, stored) {
  try {
    const [saltHex, hashHex] = stored.split(':');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(secret, Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(item => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function initDb() {
  const dbDir = path.join(app.getPath('userData'), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'rocklumajang.sqlite');
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS komsel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_komsel VARCHAR NOT NULL,
      kode_warna VARCHAR NOT NULL DEFAULT '#6B7280'
    );

    CREATE TABLE IF NOT EXISTS jemaat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Tetap' CHECK (category IN ('Tetap', 'Guest')),
      phone TEXT,
      address TEXT,
      birth_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      qrId TEXT,
      photo TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      dateFormatted TEXT,
      time TEXT,
      location TEXT,
      speaker TEXT,
      is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      pin TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      jemaat_id INTEGER,
      scan_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (jemaat_id) REFERENCES jemaat(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId TEXT NOT NULL,
      jemaatId INTEGER,
      name TEXT NOT NULL,
      category TEXT,
      photo TEXT,
      time TEXT NOT NULL,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (jemaatId) REFERENCES jemaat(id) ON DELETE CASCADE
    );
  `);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_event_jemaat ON attendances(event_id, jemaat_id)');

  // Kolom lama yang mungkin belum ada (migrasi database existing)
  addColumnIfMissing('jemaat', 'qr_code_id', 'TEXT');
  addColumnIfMissing('jemaat', 'address', 'TEXT');
  addColumnIfMissing('jemaat', 'birth_date', 'TEXT');
  addColumnIfMissing('jemaat', 'created_at', 'TEXT');
  addColumnIfMissing('events', 'title', 'TEXT');
  addColumnIfMissing('events', 'created_at', 'TEXT');

  // Kolom baru untuk fitur Komsel & Gender
  addColumnIfMissing('jemaat', 'pronouns', 'VARCHAR');
  addColumnIfMissing('jemaat', 'tanggal_nikah', 'TEXT');
  addColumnIfMissing('jemaat', 'tanggal_baptis', 'TEXT');
  addColumnIfMissing('jemaat', 'catatan', 'TEXT');
  addColumnIfMissing('jemaat', 'komsel_id', 'INTEGER REFERENCES komsel(id) ON DELETE SET NULL');
  addColumnIfMissing('jemaat', 'gender', 'VARCHAR');

  db.prepare("UPDATE jemaat SET gender = 'L' WHERE pronouns = 'Bapak' AND gender IS NULL").run();
  db.prepare("UPDATE jemaat SET gender = 'P' WHERE pronouns = 'Ibu' AND gender IS NULL").run();

  db.prepare("UPDATE jemaat SET qr_code_id = qrId WHERE qr_code_id IS NULL AND qrId IS NOT NULL").run();
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_jemaat_qr_code_id ON jemaat(qr_code_id) WHERE qr_code_id IS NOT NULL');
  db.prepare("UPDATE events SET title = name WHERE title IS NULL").run();
  db.prepare("UPDATE jemaat SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL").run();
  db.prepare("UPDATE events SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL").run();

  // Seed data komsel default jika tabel masih kosong
  const komselCount = db.prepare('SELECT COUNT(*) as cnt FROM komsel').get();
  if (komselCount.cnt === 0) {
    const seedKomsel = db.prepare('INSERT INTO komsel (nama_komsel, kode_warna) VALUES (?, ?)');
    [
      ['Adulam', '#3B82F6'],
      ['Betlehem 1', '#10B981'],
      ['Betlehem 2', '#059669'],
      ['Bethel', '#F59E0B'],
      ['Bukit Sion', '#D97706'],
      ['Efata', '#8B5CF6'],
      ['Exousia (1)', '#EC4899'],
      ['Exousia (2) Kuliah', '#DB2777'],
      ['Quiver', '#6366F1'],
      ['Exousia (3)', '#4F46E5'],
      ['Filadelfia', '#14B8A6'],
      ['Galilea 1', '#06B6D4'],
      ['Galilea 2', '#0891B2'],
      ['Galilea 3', '#0284C7'],
      ['Galilea 4', '#0369A1'],
      ['Gosyen', '#EAB308'],
      ['Hineni', '#F97316'],
      ['Nazareth', '#EF4444'],
      ['Purim', '#A855F7'],
      ['Pison', '#D946EF'],
      ['Obed Edom', '#84CC16'],
    ].forEach(([nama, warna]) => seedKomsel.run(nama, warna));
  }

  // FIX BUG: Admin hanya dibuat sekali, tidak di-overwrite setiap kali app dibuka
  const adminUsername = process.env.ROCK_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ROCK_ADMIN_PASSWORD || 'rocklmj123';
  const adminPin = process.env.ROCK_ADMIN_PIN || '1234';

  const existingAdmin = db.prepare('SELECT id FROM admins LIMIT 1').get();
  if (!existingAdmin) {
    // Hanya buat admin pertama kali, tidak pernah overwrite
    db.prepare('INSERT INTO admins (username, password_hash, pin) VALUES (?, ?, ?)').run(
      adminUsername, hashSecret(adminPassword), hashSecret(adminPin)
    );
  }
}

// Menyeragamkan ID format lama pada data backup sebelum di-restore.
// Jemaat: ROCKLMJxxxx | Guest: ROCKLMJxxxx / GSxxxx | Event: #EYYYYMMDDnnn
function normalizeBackupIds(data) {
  const EVENT_RE = /^#E\d{8}\d{3}$/;
  const getQr = (m) => m.qr_code_id || m.qrId;

  // --- Jemaat ---
  let maxJm = 0, maxGs = 0;
  for (const m of data.jemaat) {
    const q = String(getQr(m) || '');
    let r = q.match(/^ROCKLMJ(\d+)$/); if (r) maxJm = Math.max(maxJm, +r[1]);
    r = q.match(/^GS(\d{1,6})$/); if (r) maxGs = Math.max(maxGs, +r[1]);
  }
  for (const m of data.jemaat) {
    const q = String(getQr(m) || '');
    const isGuest = m.category === 'Guest';
    const ok = isGuest ? /^(ROCKLMJ|GS)\d+$/.test(q) : /^ROCKLMJ\d+$/.test(q);
    if (ok) continue;
    const next = isGuest
      ? `GS${String(++maxGs).padStart(4, '0')}`
      : `ROCKLMJ${String(++maxJm).padStart(4, '0')}`;
    m.qr_code_id = next;
    m.qrId = next;
  }

  // --- Event ---
  const idMap = {};
  const perDate = {};
  for (const e of data.events) {
    if (EVENT_RE.test(e.id)) {
      const k = e.id.slice(2, 10);
      perDate[k] = Math.max(perDate[k] || 0, +e.id.slice(10));
    }
  }
  for (const e of data.events) {
    if (EVENT_RE.test(e.id)) continue;
    const k = String(e.date || '').replace(/-/g, '').slice(0, 8);
    if (k.length !== 8) continue;
    perDate[k] = (perDate[k] || 0) + 1;
    const newId = `#E${k}${String(perDate[k]).padStart(3, '0')}`;
    idMap[e.id] = newId;
    e.id = newId;
  }
  if (Object.keys(idMap).length) {
    for (const a of data.attendances || []) if (idMap[a.event_id]) a.event_id = idMap[a.event_id];
    for (const a of data.attendance || []) if (idMap[a.eventId]) a.eventId = idMap[a.eventId];
  }
  return data;
}

module.exports = {
  initDb,
  getEvents: () => db.prepare('SELECT * FROM events').all().map(e => ({...e, is_locked: e.is_locked === 1})),
  getAllEvents: ({ from, to } = {}) => {
    let query = 'SELECT *, COALESCE(title, name) AS title FROM events WHERE 1 = 1';
    const params = [];
    if (from) { query += ' AND date >= ?'; params.push(from); }
    if (to) { query += ' AND date <= ?'; params.push(to); }
    query += ' ORDER BY date ASC, time ASC, created_at ASC';
    return db.prepare(query).all(...params).map(event => ({ ...event, is_locked: event.is_locked === 1 }));
  },
  getUpcomingEvents: (limit = 5) => db.prepare(`
    SELECT *, COALESCE(title, name) AS title
    FROM events
    WHERE date >= date('now')
    ORDER BY date ASC, time ASC, created_at ASC
    LIMIT ?
  `).all(Math.max(0, Math.min(Number(limit) || 5, 5))).map(event => ({ ...event, is_locked: event.is_locked === 1 })),
  scanAttendance: (eventId, qrCodeId) => recordAttendance(eventId, qrCodeId, 'qr'),
  manualAddAttendance: (eventId, jemaatId) => recordAttendance(eventId, jemaatId, 'id'),
  getEventSummary: (eventId) => {
    const event = db.prepare('SELECT id, COALESCE(title, name) AS title, date FROM events WHERE id = ?').get(eventId);
    if (!event) throw new Error('Event not found');
    const rows = db.prepare(`
      SELECT CASE WHEN j.category IN ('Tetap', 'Jemaat') THEN 'Jemaat Tetap' ELSE 'Guest' END AS category,
        COUNT(a.id) AS total
      FROM attendances a
      INNER JOIN jemaat j ON j.id = a.jemaat_id
      WHERE a.event_id = ?
      GROUP BY CASE WHEN j.category IN ('Tetap', 'Jemaat') THEN 'Jemaat Tetap' ELSE 'Guest' END
    `).all(eventId);
    const genderRows = db.prepare(`
      SELECT j.gender, COUNT(a.id) AS total
      FROM attendances a
      INNER JOIN jemaat j ON j.id = a.jemaat_id
      WHERE a.event_id = ?
      GROUP BY j.gender
    `).all(eventId);
    
    const totals = Object.fromEntries(rows.map(row => [row.category, row.total]));
    const genderTotals = Object.fromEntries(genderRows.map(row => [row.gender || 'Unknown', row.total]));
    
    return {
      event_id: event.id, event_title: event.title, event_date: event.date,
      total_attendance: rows.reduce((sum, row) => sum + row.total, 0),
      by_category: { 'Jemaat Tetap': totals['Jemaat Tetap'] || 0, Guest: totals.Guest || 0 },
      by_gender: { 'L': genderTotals['L'] || 0, 'P': genderTotals['P'] || 0 }
    };
  },
  getJemaatHistory: (jemaatId) => {
    const member = db.prepare('SELECT id, name, COALESCE(qr_code_id, qrId) AS qr_code_id FROM jemaat WHERE id = ?').get(jemaatId);
    if (!member) throw new Error('Jemaat not found');
    const history = db.prepare(`
      SELECT e.id AS event_id, COALESCE(e.title, e.name) AS event_title, e.date AS event_date,
        e.time, a.scan_timestamp
      FROM attendances a
      INNER JOIN events e ON e.id = a.event_id
      WHERE a.jemaat_id = ?
      ORDER BY e.date DESC, e.time DESC, a.scan_timestamp DESC
    `).all(jemaatId);
    return { jemaat_id: member.id, name: member.name, qr_code_id: member.qr_code_id, history };
  },
  getAttendanceRanking: (startDate, endDate) => {
    let query = `
      SELECT id, name, qr_code_id, category, SUM(total) as total_attendance
      FROM (
        SELECT j.id, j.name, COALESCE(j.qr_code_id, j.qrId) AS qr_code_id, 
               CASE WHEN j.category = 'Tetap' THEN 'Jemaat' ELSE j.category END AS category, 
               COUNT(a.id) as total
        FROM jemaat j
        JOIN attendances a ON j.id = a.jemaat_id
        JOIN events e ON a.event_id = e.id
        WHERE 1=1
    `;
    const params = [];
    if (startDate) { query += " AND e.date >= ?"; params.push(startDate); }
    if (endDate) { query += " AND e.date <= ?"; params.push(endDate); }
    query += `
        GROUP BY j.id
        UNION ALL
        SELECT j.id, j.name, COALESCE(j.qr_code_id, j.qrId) AS qr_code_id, j.category, COUNT(a.id) as total
        FROM jemaat j
        JOIN attendance a ON j.id = a.jemaatId
        JOIN events e ON a.eventId = e.id
        WHERE 1=1
    `;
    if (startDate) { query += " AND e.date >= ?"; params.push(startDate); }
    if (endDate) { query += " AND e.date <= ?"; params.push(endDate); }
    query += `
        GROUP BY j.id
      )
      GROUP BY id
      ORDER BY total_attendance DESC
    `;
    return db.prepare(query).all(...params);
  },
  getMonthlyRecap: (month, year) => {
    const numericMonth = Number(month);
    const numericYear = Number(year);
    if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 ||
      !Number.isInteger(numericYear) || numericYear < 1) throw new Error('Valid month and year are required');
    const monthKey = `${String(numericYear).padStart(4, '0')}-${String(numericMonth).padStart(2, '0')}`;
    const rows = db.prepare(`
      SELECT e.id AS event_id, COALESCE(e.title, e.name) AS event_title, e.date AS event_date,
        e.time, COUNT(a.id) AS total_attendance,
        SUM(CASE WHEN j.category IN ('Tetap', 'Jemaat') THEN 1 ELSE 0 END) AS jemaat_tetap,
        SUM(CASE WHEN j.category = 'Guest' THEN 1 ELSE 0 END) AS guest
      FROM events e
      LEFT JOIN attendances a ON a.event_id = e.id
      LEFT JOIN jemaat j ON j.id = a.jemaat_id
      WHERE strftime('%Y-%m', e.date) = ?
      GROUP BY e.id, e.title, e.name, e.date, e.time
      ORDER BY e.date ASC, e.time ASC, e.created_at ASC
    `).all(monthKey).map(row => ({
      ...row,
      jemaat_tetap: row.jemaat_tetap || 0,
      guest: row.guest || 0
    }));
    return { month: numericMonth, year: numericYear, events: rows };
  },
  createEvent: (event) => {

    const id = event.id || `event-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const title = event.title || event.name;
    if (!title || !event.date) throw new Error('Event title and date are required');
    db.prepare(`INSERT INTO events
      (id, title, name, date, dateFormatted, time, location, speaker, is_locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, title, title, event.date, event.dateFormatted || event.date, event.time || null,
      event.location || null, event.speaker || null, event.is_locked ? 1 : 0
    );
    return db.prepare('SELECT *, COALESCE(title, name) AS title FROM events WHERE id = ?').get(id);
  },
  updateEvent: (id, event) => {
    const current = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
    if (!current) throw new Error('Event not found');
    const title = event.title || event.name;
    if (!title || !event.date) throw new Error('Event title and date are required');
    const result = db.prepare(`UPDATE events SET title = ?, name = ?, date = ?, dateFormatted = ?,
      time = ?, location = ?, speaker = ?, is_locked = ? WHERE id = ?`).run(
      title, title, event.date, event.dateFormatted || event.date, event.time || null,
      event.location || null, event.speaker || null, event.is_locked ? 1 : 0, id
    );
    return result.changes > 0;
  },
  deleteEvent: (id) => {
    const event = db.prepare('SELECT id, is_locked FROM events WHERE id = ?').get(id);
    if (!event) throw new Error('Event not found');
    return db.transaction(() => {
      db.prepare('DELETE FROM attendances WHERE event_id = ?').run(id);
      db.prepare('DELETE FROM attendance WHERE eventId = ?').run(id);
      return db.prepare('DELETE FROM events WHERE id = ?').run(id).changes > 0;
    })();
  },
  saveEvents: (events) => {
    const insert = db.prepare('INSERT OR REPLACE INTO events (id, name, date, dateFormatted, time, location, speaker, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    db.transaction((arr) => {
      db.prepare('DELETE FROM events').run();
      for (const ev of arr) insert.run(ev.id, ev.name, ev.date, ev.dateFormatted, ev.time, ev.location, ev.speaker, ev.is_locked ? 1 : 0);
    })(events);
    return true;
  },
  getJemaat: () => db.prepare("SELECT *, CASE WHEN category = 'Tetap' THEN 'Jemaat' ELSE category END AS category FROM jemaat").all().map(member => ({
    ...member,
    qrId: member.qrId || member.qr_code_id,
    dob: member.dob || member.birth_date
  })),
  getBackupData: () => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    komsel: db.prepare('SELECT * FROM komsel').all(),
    events: db.prepare('SELECT * FROM events').all(),
    jemaat: db.prepare('SELECT * FROM jemaat').all(),
    attendance: db.prepare('SELECT * FROM attendance').all(),
    attendances: db.prepare('SELECT * FROM attendances').all()
  }),
  restoreBackup: (backup) => db.transaction((data) => {
    if (!data || !Array.isArray(data.events) || !Array.isArray(data.jemaat)) {
      throw new Error('Invalid backup format');
    }
    normalizeBackupIds(data);
    db.prepare('DELETE FROM attendance').run();
    db.prepare('DELETE FROM attendances').run();
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM jemaat').run();
    // Komsel: dipulihkan hanya jika backup memuatnya (backup lama tidak punya)
    if (Array.isArray(data.komsel) && data.komsel.length > 0) {
      db.prepare('DELETE FROM komsel').run();
      const insertKomsel = db.prepare('INSERT INTO komsel (id, nama_komsel, kode_warna) VALUES (?, ?, ?)');
      for (const k of data.komsel) insertKomsel.run(k.id, k.nama_komsel, k.kode_warna || '#6B7280');
    }
    const validKomselIds = new Set(db.prepare('SELECT id FROM komsel').all().map(k => k.id));
    const insertMember = db.prepare(`INSERT INTO jemaat
      (id, qr_code_id, qrId, name, category, phone, address, birth_date, created_at, photo,
       pronouns, tanggal_nikah, tanggal_baptis, catatan, komsel_id, gender)
      VALUES (@id, @qr_code_id, @qrId, @name, @category, @phone, @address, @birth_date, @created_at, @photo,
       @pronouns, @tanggal_nikah, @tanggal_baptis, @catatan, @komsel_id, @gender)`);
    for (const member of data.jemaat) insertMember.run({
      id: member.id, qr_code_id: member.qr_code_id || member.qrId || null, qrId: member.qrId || member.qr_code_id || null,
      name: member.name, category: member.category === 'Jemaat' ? 'Tetap' : member.category || 'Tetap',
      phone: member.phone || null, address: member.address || null, birth_date: member.birth_date || member.dob || null,
      created_at: member.created_at || new Date().toISOString(), photo: member.photo || null,
      pronouns: member.pronouns || null, tanggal_nikah: member.tanggal_nikah || null,
      tanggal_baptis: member.tanggal_baptis || null, catatan: member.catatan || null,
      komsel_id: validKomselIds.has(member.komsel_id) ? member.komsel_id : null,
      gender: member.gender || null
    });
    const insertEvent = db.prepare(`INSERT INTO events
      (id, title, name, date, dateFormatted, time, location, speaker, is_locked, created_at)
      VALUES (@id, @title, @name, @date, @dateFormatted, @time, @location, @speaker, @is_locked, @created_at)`);
    for (const event of data.events) insertEvent.run({
      id: event.id, title: event.title || event.name, name: event.name || event.title, date: event.date,
      dateFormatted: event.dateFormatted || event.date, time: event.time || null, location: event.location || null,
      speaker: event.speaker || null, is_locked: event.is_locked ? 1 : 0, created_at: event.created_at || new Date().toISOString()
    });
    const insertAttendance = db.prepare('INSERT INTO attendance (id, eventId, jemaatId, name, category, photo, time) VALUES (@id, @eventId, @jemaatId, @name, @category, @photo, @time)');
    for (const row of data.attendance || []) insertAttendance.run(row);
    const insertCanonical = db.prepare('INSERT INTO attendances (id, event_id, jemaat_id, scan_timestamp) VALUES (@id, @event_id, @jemaat_id, @scan_timestamp)');
    for (const row of data.attendances || []) insertCanonical.run(row);
    
    // Otomatis terjemahkan sapaan lama ke gender
    db.prepare("UPDATE jemaat SET gender = 'L' WHERE pronouns = 'Bapak' AND gender IS NULL").run();
    db.prepare("UPDATE jemaat SET gender = 'P' WHERE pronouns = 'Ibu' AND gender IS NULL").run();

    return { restored: true };
  })(backup),
  getJemaatForExport: (filters) => getJemaatForExport(filters),
  saveJemaat: (jemaatArray) => {
    const insert = db.prepare('INSERT OR REPLACE INTO jemaat (id, qrId, name, category, phone, photo) VALUES (?, ?, ?, ?, ?, ?)');
    db.transaction((arr) => {
      db.prepare('DELETE FROM jemaat').run();
      for (const j of arr) insert.run(j.id, j.qrId, j.name, j.category === 'Jemaat' ? 'Tetap' : j.category, j.phone, j.photo);
    })(jemaatArray);
    return true;
  },
  getAttendance: (eventId) => db.prepare(`
    SELECT id, eventId, jemaatId, name, category, photo, time, NULL AS gender FROM attendance WHERE eventId = ?
    UNION ALL
    SELECT a.id, a.event_id AS eventId, a.jemaat_id AS jemaatId, j.name,
      CASE WHEN j.category = 'Tetap' THEN 'Jemaat' ELSE j.category END AS category,
      j.photo, a.scan_timestamp AS time, j.gender
    FROM attendances a INNER JOIN jemaat j ON j.id = a.jemaat_id WHERE a.event_id = ?
    ORDER BY time DESC
  `).all(eventId, eventId),
  saveAttendance: (eventId, attendanceArray) => {
    const insert = db.prepare('INSERT INTO attendance (eventId, jemaatId, name, category, photo, time) VALUES (?, ?, ?, ?, ?, ?)');
    const deleteAllForEvent = db.prepare('DELETE FROM attendance WHERE eventId = ?');
    db.transaction((evtId, arr) => {
      deleteAllForEvent.run(evtId);
      for (const a of arr) insert.run(evtId, a.jemaatId || null, a.name, a.category, a.photo || '', a.time);
    })(eventId, attendanceArray);
    return true;
  },
  getAllAttendance: () => db.prepare(`
    SELECT * FROM attendance
    UNION ALL
    SELECT a.id, a.event_id AS eventId, a.jemaat_id AS jemaatId, j.name,
      CASE WHEN j.category = 'Tetap' THEN 'Jemaat' ELSE j.category END AS category,
      j.photo, a.scan_timestamp AS time
    FROM attendances a INNER JOIN jemaat j ON j.id = a.jemaat_id
    ORDER BY time DESC
  `).all(),
  login: (username, password) => {
   
    const admin = db.prepare('SELECT id, username, password_hash FROM admins WHERE username = ?').get(username);

    if (!admin) {
      console.log(`Hasil: GAGAL (Username tidak ditemukan di SQLite)`);
      return null;
    }
    
    return admin && verifySecret(password, admin.password_hash) ? { id: admin.id, username: admin.username } : null;
  },
  verifyPin: (username, pin) => {
    const admin = db.prepare('SELECT pin FROM admins WHERE username = ?').get(username);
    return Boolean(admin && verifySecret(pin, admin.pin));
  },
  lockEvent: (eventId, locked) => db.prepare('UPDATE events SET is_locked = ? WHERE id = ?').run(locked ? 1 : 0, eventId).changes > 0,
  getAllKomsel: () => db.prepare('SELECT * FROM komsel ORDER BY nama_komsel COLLATE NOCASE').all(),
  createKomsel: ({ nama_komsel, kode_warna }) => {
    if (!nama_komsel || !nama_komsel.trim()) throw new Error('Nama komsel tidak boleh kosong');
    const result = db.prepare('INSERT INTO komsel (nama_komsel, kode_warna) VALUES (?, ?)').run(
      nama_komsel.trim(), kode_warna || '#6B7280'
    );
    return db.prepare('SELECT * FROM komsel WHERE id = ?').get(result.lastInsertRowid);
  },
  getAllJemaat: ({ search = '', category = '', birthMonth = '', komselId = '' } = {}) => {
    let query = `
      SELECT j.*, COALESCE(j.qr_code_id, j.qrId) AS qr_code_id,
        k.nama_komsel, k.kode_warna
      FROM jemaat j
      LEFT JOIN komsel k ON j.komsel_id = k.id
      WHERE 1 = 1
    `;
    const params = [];
    if (search) { query += ' AND (j.name LIKE ? OR j.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (category) { query += ' AND j.category = ?'; params.push(category); }
    if (birthMonth) { query += " AND CAST(strftime('%m', j.birth_date) AS INTEGER) = ?"; params.push(Number(birthMonth)); }
    if (komselId === 'null') {
      query += ' AND j.komsel_id IS NULL AND j.category = \'Tetap\'';
    } else if (komselId) {
      query += ' AND j.komsel_id = ?'; params.push(Number(komselId));
    }
    return db.prepare(`${query} ORDER BY j.name COLLATE NOCASE`).all(...params);
  },
  createJemaat: (member) => {
    const result = db.prepare(`
      INSERT INTO jemaat (qr_code_id, qrId, name, category, phone, address, birth_date, photo,
        pronouns, tanggal_nikah, tanggal_baptis, catatan, komsel_id, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      member.qr_code_id, member.qr_code_id, member.name,
      member.category || 'Tetap', member.phone || null, member.address || null,
      member.birth_date || null, member.photo || null,
      member.pronouns || null, member.tanggal_nikah || null,
      member.tanggal_baptis || null, member.catatan || null,
      member.komsel_id || null, member.gender || null
    );
    return db.prepare(`
      SELECT j.*, COALESCE(j.qr_code_id, j.qrId) AS qr_code_id, k.nama_komsel, k.kode_warna
      FROM jemaat j LEFT JOIN komsel k ON j.komsel_id = k.id WHERE j.id = ?
    `).get(result.lastInsertRowid);
  },
  updateJemaat: (id, member) => db.prepare(`
    UPDATE jemaat SET qr_code_id = ?, qrId = ?, name = ?, category = ?, phone = ?,
      address = ?, birth_date = ?, photo = ?,
      pronouns = ?, tanggal_nikah = ?, tanggal_baptis = ?, catatan = ?, komsel_id = ?, gender = ?
    WHERE id = ?
  `).run(
    member.qr_code_id, member.qr_code_id, member.name, member.category || 'Tetap',
    member.phone || null, member.address || null, member.birth_date || null, member.photo || null,
    member.pronouns || null, member.tanggal_nikah || null,
    member.tanggal_baptis || null, member.catatan || null,
    member.komsel_id || null, member.gender || null, id
  ).changes > 0,
  deleteJemaat: (id) => db.prepare('DELETE FROM jemaat WHERE id = ?').run(id).changes > 0,
  importJemaat: (members) => db.transaction((rows) => {
    const insert = db.prepare(`INSERT INTO jemaat (qr_code_id, qrId, name, category, phone, address, birth_date)
      VALUES (@qr_code_id, @qr_code_id, @name, @category, @phone, @address, @birth_date)`);
    for (const row of rows) insert.run({ qr_code_id: row.qr_code_id || row.qrId, name: row.name, category: row.category || 'Tetap', phone: row.phone || null, address: row.address || null, birth_date: row.birth_date || row.dob || null });
    return rows.length;
  })(members),
  upsertJemaat: (members) => db.transaction((rows) => {
    const findByQr = db.prepare('SELECT id FROM jemaat WHERE qr_code_id = ? OR qrId = ? LIMIT 1');
    const findByIdentity = db.prepare('SELECT id FROM jemaat WHERE name = ? AND birth_date IS ? LIMIT 1');
    
    // Cache komsel id
    const komselMap = {};
    const getKomselId = (namaKomsel) => {
      if (!namaKomsel) return null;
      const lower = namaKomsel.toLowerCase().trim();
      if (lower === 'belum ber-kc' || lower === 'belum kc') return null;
      if (komselMap[lower] !== undefined) return komselMap[lower];
      const found = db.prepare('SELECT id FROM komsel WHERE LOWER(nama_komsel) = ?').get(lower);
      if (found) {
        komselMap[lower] = found.id;
        return found.id;
      }
      // If not found, create new komsel temporarily (fallback)
      const res = db.prepare('INSERT INTO komsel (nama_komsel, kode_warna) VALUES (?, ?)').run(namaKomsel.trim(), '#6B7280');
      komselMap[lower] = res.lastInsertRowid;
      return res.lastInsertRowid;
    };

    const insert = db.prepare(`INSERT INTO jemaat
      (qr_code_id, qrId, name, category, phone, address, birth_date, pronouns, tanggal_nikah, tanggal_baptis, catatan, komsel_id, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const update = db.prepare(`UPDATE jemaat SET qr_code_id = ?, qrId = ?, name = ?, category = ?,
      phone = ?, address = ?, birth_date = ?, pronouns = ?, tanggal_nikah = ?, tanggal_baptis = ?, catatan = ?, komsel_id = ?, gender = ? WHERE id = ?`);
    
    const result = { totalInserted: 0, totalUpdated: 0, errors: [] };
    for (let index = 0; index < rows.length; index += 1) {
      const member = rows[index];
      try {
        const existing = member.qr_code_id
          ? findByQr.get(member.qr_code_id, member.qr_code_id)
          : findByIdentity.get(member.name, member.birth_date || null);
        const qrCodeId = member.qr_code_id || createUniqueQrCode(findByQr);
        
        const komselId = getKomselId(member.nama_komsel);
        const values = [
          qrCodeId, qrCodeId, member.name, member.category, 
          member.phone || null, member.address || null, member.birth_date || null,
          member.pronouns || null, member.tanggal_nikah || null, member.tanggal_baptis || null,
          member.catatan || null, komselId, member.gender || null
        ];

        if (existing) {
          update.run(...values, existing.id);
          result.totalUpdated += 1;
        } else {
          insert.run(...values);
          result.totalInserted += 1;
        }
      } catch (error) {
        throw new Error(`Row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return result;
  })(members)
};

function getJemaatForExport({ category = '', birthMonth = '' } = {}) {
  let query = `
    SELECT
      COALESCE(j.qr_code_id, j.qrId) AS qr_code_id,
      j.name,
      j.pronouns,
      j.category,
      j.gender,
      j.phone,
      j.address,
      j.birth_date,
      j.tanggal_nikah,
      j.tanggal_baptis,
      j.catatan,
      j.photo,
      k.nama_komsel,
      j.created_at
    FROM jemaat j
    LEFT JOIN komsel k ON j.komsel_id = k.id
    WHERE 1 = 1
  `;
  const params = [];
  if (category) { query += ' AND j.category = ?'; params.push(category); }
  if (birthMonth) { query += " AND CAST(strftime('%m', j.birth_date) AS INTEGER) = ?"; params.push(Number(birthMonth)); }
  return db.prepare(`${query} ORDER BY j.name COLLATE NOCASE`).all(...params);
}

function createUniqueQrCode(findByQr) {
  let qrCodeId;
  do {
    qrCodeId = `QR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  } while (findByQr.get(qrCodeId, qrCodeId));
  return qrCodeId;
}

function recordAttendance(eventId, memberIdentifier, identifierType) {
  if (!eventId || memberIdentifier === undefined || memberIdentifier === null || memberIdentifier === '') {
    throw new Error('Event and member identifiers are required');
  }

  return db.transaction(() => {
    const event = db.prepare('SELECT id, is_locked FROM events WHERE id = ?').get(eventId);
    if (!event) throw new Error('Event not found');
    if (event.is_locked === 1) throw new Error('Attendance scanning is disabled for this locked event');

    const member = identifierType === 'qr'
      ? db.prepare('SELECT id, name, category, qr_code_id, photo, gender FROM jemaat WHERE qr_code_id = ? OR qrId = ?').get(memberIdentifier, memberIdentifier)
      : db.prepare('SELECT id, name, category, qr_code_id, photo, gender FROM jemaat WHERE id = ?').get(memberIdentifier);
    if (!member) throw new Error('Jemaat not found');

    const duplicate = db.prepare('SELECT id FROM attendances WHERE event_id = ? AND jemaat_id = ?').get(eventId, member.id);
    if (duplicate) throw new Error('Duplicate attendance scan for this event');

    const scanTimestamp = new Date().toISOString();
    const result = db.prepare(`INSERT INTO attendances (event_id, jemaat_id, scan_timestamp)
      VALUES (?, ?, ?)`).run(eventId, member.id, scanTimestamp);
    return {
      id: result.lastInsertRowid,
      event_id: eventId,
      jemaat_id: member.id,
      qr_code_id: member.qr_code_id,
      name: member.name,
      category: member.category === 'Tetap' ? 'Jemaat' : member.category,
      photo: member.photo || '',
      gender: member.gender || null,
      time: scanTimestamp,
      scan_timestamp: scanTimestamp
    };
  })();
}
