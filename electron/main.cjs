const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const XLSX = require('xlsx');
const dbModule = require('./database.cjs');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(e => {
      dialog.showErrorBox('Error loading file', e.toString());
    });
  }
}

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = cellText(value);
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const [, first, second, third] = match;
    const year = first.length === 4 ? first : third;
    const month = first.length === 4 ? second : second;
    const day = first.length === 4 ? third : first;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() === Number(year) && date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)) {
      return `${year.padStart(4, '0')}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    }
  }
  throw new Error('Birth_Date must be a valid date');
}

function parseJemaatWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Workbook does not contain a worksheet');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true, blankrows: false });
  if (!rows.length) throw new Error('The worksheet is empty');

  const aliases = {
    name: ['name', 'nama'],
    qr: ['qrid', 'qrcodeid', 'qrcode'],
    category: ['category', 'kategori'],
    phone: ['phone', 'telepon', 'telephone'],
    address: ['address', 'alamat'],
    birthDate: ['birthdate', 'tanggallahir', 'dateofbirth']
  };
  const headerIndexes = {};
  rows[0].forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const [field, accepted] of Object.entries(aliases)) {
      if (accepted.includes(normalized) && headerIndexes[field] === undefined) headerIndexes[field] = index;
    }
  });
  const missing = Object.entries(aliases).filter(([field]) => headerIndexes[field] === undefined).map(([field]) => field);
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);

  return rows.slice(1).filter(row => row.some(value => cellText(value))).map((row, index) => {
    const rowNumber = index + 2;
    const name = cellText(row[headerIndexes.name]);
    const categoryValue = cellText(row[headerIndexes.category]).toLowerCase();
    if (!name) throw new Error(`Row ${rowNumber}: Name is required`);
    const category = ['tetap', 'jemaat', 'jemaat tetap'].includes(categoryValue)
      ? 'Tetap' : categoryValue === 'guest' || categoryValue === 'tamu' ? 'Guest' : null;
    if (!category) throw new Error(`Row ${rowNumber}: Category must be Tetap or Guest`);
    const birthValue = row[headerIndexes.birthDate];
    return {
      qr_code_id: cellText(row[headerIndexes.qr]),
      name,
      category,
      phone: cellText(row[headerIndexes.phone]),
      address: cellText(row[headerIndexes.address]),
      birth_date: cellText(birthValue) ? normalizeDate(birthValue) : null
    };
  }).filter(member => member.name);
}

app.whenReady().then(() => {
  try {
    dbModule.initDb();
  } catch(e) {
    dialog.showErrorBox('Database Init Error', e.toString());
  }
  
  ipcMain.handle('get-events', () => dbModule.getEvents());
  ipcMain.handle('save-events', (e, events) => dbModule.saveEvents(events));
  
  ipcMain.handle('get-jemaat', () => dbModule.getJemaat());
  ipcMain.handle('save-jemaat', (e, jemaat) => dbModule.saveJemaat(jemaat));
  
  ipcMain.handle('get-attendance', (e, eventId) => dbModule.getAttendance(eventId));
  ipcMain.handle('save-attendance', (e, eventId, attendance) => dbModule.saveAttendance(eventId, attendance));
  ipcMain.handle('get-all-attendance', () => dbModule.getAllAttendance());
  
  ipcMain.handle('verify-password', (e, password) => {
    return Boolean(dbModule.login('admin', password));
  });

  const response = (operation) => async (...args) => {
    try {
      const data = await operation(...args);
      return data === null || data === false
        ? { success: false, error: 'Operation was not successful' }
        : { success: true, data };
    }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
  };
  ipcMain.handle('auth:login', response((e, credentials) => dbModule.login(credentials.username, credentials.password)));
  ipcMain.handle('auth:verifyPin', response((e, credentials) => dbModule.verifyPin(credentials.username, credentials.pin)));
  ipcMain.handle('event:lock', response((e, eventId) => dbModule.lockEvent(eventId, true)));
  ipcMain.handle('event:unlock', response((e, eventId) => dbModule.lockEvent(eventId, false)));
  ipcMain.handle('event:getAll', response((e, filters) => dbModule.getAllEvents(filters)));
  ipcMain.handle('event:getUpcoming', response(() => dbModule.getUpcomingEvents()));
  ipcMain.handle('event:create', response((e, event) => dbModule.createEvent(event)));
  ipcMain.handle('event:update', response((e, eventId, event) => dbModule.updateEvent(eventId, event)));
  ipcMain.handle('event:delete', response((e, eventId) => dbModule.deleteEvent(eventId)));
  ipcMain.handle('attendance:scan', response((e, payload) => dbModule.scanAttendance(payload.event_id, payload.qr_code_id)));
  ipcMain.handle('attendance:manualAdd', response((e, payload) => dbModule.manualAddAttendance(payload.event_id, payload.jemaat_id)));
  ipcMain.handle('report:getEventSummary', response((e, eventId) => dbModule.getEventSummary(eventId)));
  ipcMain.handle('report:getJemaatHistory', response((e, jemaatId) => dbModule.getJemaatHistory(jemaatId)));
  ipcMain.handle('report:getMonthlyRecap', response((e, payload) => dbModule.getMonthlyRecap(payload.month, payload.year)));
  ipcMain.handle('report:getAttendanceRanking', response((e, payload) => dbModule.getAttendanceRanking(payload.startDate, payload.endDate)));
  ipcMain.handle('jemaat:exportExcel', response(async (e, filters = {}) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Data Jemaat',
      defaultPath: `jemaat-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });
    if (result.canceled) return { cancelled: true };
    const rows = dbModule.getJemaatForExport(filters);
    const worksheet = XLSX.utils.json_to_sheet(rows.map(row => ({
      Name: row.name,
      QR_ID: row.qr_code_id,
      Category: row.category,
      Phone: row.phone || '',
      Address: row.address || '',
      Birth_Date: row.birth_date || ''
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jemaat');
    fs.writeFileSync(result.filePath, XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
    return { filePath: result.filePath, totalExported: rows.length };
  }));
  ipcMain.handle('jemaat:importExcel', response(async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Data Jemaat',
      properties: ['openFile'],
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx', 'xls'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { cancelled: true };
    const rows = parseJemaatWorkbook(result.filePaths[0]);
    return dbModule.upsertJemaat(rows);
  }));
  ipcMain.handle('app:exportBackup', response(async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Backup Database',
      defaultPath: `rocklumajang-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON Backup', extensions: ['json'] }]
    });
    if (result.canceled) return { cancelled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(dbModule.getBackupData(), null, 2), { encoding: 'utf8', flag: 'w' });
    return { filePath: result.filePath };
  }));
  ipcMain.handle('app:importBackup', response(async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Backup Database',
      properties: ['openFile'],
      filters: [{ name: 'JSON Backup', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { cancelled: true };
    const backup = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
    return dbModule.restoreBackup(backup);
  }));
  ipcMain.handle('jemaat:getAll', response((e, filters) => dbModule.getAllJemaat(filters)));
  ipcMain.handle('jemaat:create', response((e, member) => dbModule.createJemaat(member)));
  ipcMain.handle('jemaat:update', response((e, id, member) => dbModule.updateJemaat(id, member)));
  ipcMain.handle('jemaat:delete', response((e, id) => dbModule.deleteJemaat(id)));

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(e => {
  dialog.showErrorBox('App Ready Error', e.toString());
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
