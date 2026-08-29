import React from 'react';
import { useState, MouseEvent, useEffect } from 'react';
import { Scan, CheckCircle, XCircle, Clock, Plus, X, Search, Unlock } from 'lucide-react';

export default function LiveScanPage() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [latestScan, setLatestScan] = useState<{name: string, category: string, photo?: string} | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTab, setManualTab] = useState<'cari' | 'baru'>('cari');
  const [selectedEvent, setSelectedEvent] = useState(() => {
    return localStorage.getItem('livescan_selected_event') || '';
  });
  
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [jemaatData, setJemaatData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrCodeInput, setQrCodeInput] = useState('');

  useEffect(() => {
    const loadJemaat = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.getJemaat();
        setJemaatData(data);
        return;
      }
      const saved = localStorage.getItem('mock_jemaat_data');
      if (saved) {
        try { setJemaatData(JSON.parse(saved)); } catch(e) {}
      }
    };
    loadJemaat();
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.getEvents();
        setEventsData(data);
        return;
      }
      
      let savedEvents = localStorage.getItem('mock_event_data');
      if (!savedEvents) {
        savedEvents = "[]";
      }
      try {
        const parsed = JSON.parse(savedEvents);
        setEventsData(parsed);
      } catch(e) {}
    };

    loadEvents();
    if (!window.electronAPI) {
      window.addEventListener('storage', loadEvents);
      return () => window.removeEventListener('storage', loadEvents);
    }
  }, [selectedEvent]);

  useEffect(() => {
    localStorage.setItem('livescan_selected_event', selectedEvent);
  }, [selectedEvent]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filteredEvents = eventsData.filter(e => e.date === todayStr);

  const selectedEventObj = selectedEvent ? eventsData.find(e => e.id === selectedEvent) : null;
  const isEventLocked = selectedEventObj ? (selectedEventObj.is_locked === true) : false;

  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [unlockPromptOpen, setUnlockPromptOpen] = useState(false);
  const [unlockUsername, setUnlockUsername] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  const executeToggleLock = async (newLockStatus: boolean) => {
    if (window.electronAPI) {
      const result = newLockStatus
        ? await window.electronAPI.lockEvent(selectedEvent)
        : await window.electronAPI.unlockEvent(selectedEvent);
      if (!result.success) { setUnlockError(result.error || 'Status event gagal diperbarui.'); return; }
    } else {
      const updatedEvents = eventsData.map((event: any) => event.id === selectedEvent ? { ...event, is_locked: newLockStatus } : event);
      setEventsData(updatedEvents);
      localStorage.setItem('mock_event_data', JSON.stringify(updatedEvents));
    }
    setEventsData(eventsData.map((event: any) => event.id === selectedEvent ? { ...event, is_locked: newLockStatus } : event));
  };

  const handleConfirmLock = () => {
    executeToggleLock(true);
    setLockConfirmOpen(false);
  };

  const handleConfirmUnlock = async () => {
    if (!window.electronAPI) {
      setUnlockError('Aplikasi harus dijalankan melalui Electron.');
      return;
    }
    const result = await window.electronAPI.login({ username: unlockUsername, password: unlockPassword });
    if (!result.success) {
      setUnlockError('Kredensial tidak valid!');
      return;
    }
    executeToggleLock(false);
    setUnlockPromptOpen(false);
    setUnlockUsername('');
    setUnlockPassword('');
    setUnlockError('');
  };

  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (selectedEvent) {
        if (window.electronAPI) {
          const data = await window.electronAPI.getAttendance(selectedEvent);
          setHistoryData(data);
        } else {
          const saved = localStorage.getItem(`mock_history_${selectedEvent}`);
          if (saved) {
            try {
              setHistoryData(JSON.parse(saved));
            } catch(e) { setHistoryData([]); }
          } else {
            setHistoryData([]);
          }
        }
      } else {
        setHistoryData([]);
      }
    };
    loadHistory();
  }, [selectedEvent]);

  useEffect(() => {
    if (selectedEvent && !window.electronAPI) {
      localStorage.setItem(`mock_history_${selectedEvent}`, JSON.stringify(historyData));
    }
  }, [historyData, selectedEvent]);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<'Jemaat' | 'Guest'>('Jemaat');

  const getFormattedTime = () => {
    const d = new Date();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms} WIB`;
  };

  const handleHadirkanTerdaftar = async (jemaatItem: any) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.manualAddAttendance({ event_id: selectedEvent, jemaat_id: jemaatItem.id });
      if (!result.success) { setDuplicateError(result.error || 'Gagal mencatat attendance.'); return; }
      setHistoryData(prev => [result.data, ...prev]);
      setLatestScan({ name: result.data.name, category: result.data.category, photo: result.data.photo || '' });
      setScanStatus('success');
      setSearchQuery('');
      setIsManualModalOpen(false);
      return;
    }
    // 1. Validasi Duplikat (Ubah perbandingan menjadi string agar tidak meleset)
    const isDuplicate = historyData.some(item => String(item.id) === String(jemaatItem.id));
    
    if (isDuplicate) {
      setDuplicateError(`Jemaat atas nama ${jemaatItem.name} sudah terdaftar hadir di event ini!`);
      return;
    }

    // 2. Jika lolos validasi, tambahkan data ke state riwayat
    const newAttendance = {
      ...jemaatItem,
      time: new Date().toISOString()
    };
    setHistoryData(prev => [newAttendance, ...prev]);

    setLatestScan({
      name: jemaatItem.name,
      category: jemaatItem.category,
      photo: jemaatItem.photo || ''
    });
    setScanStatus('success');
    setSearchQuery('');

    // 3. Tutup modal secara eksplisit
    setIsManualModalOpen(false);
  };

  const filteredJemaat = searchQuery 
    ? jemaatData.filter(j => j.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : jemaatData;

  const handleSimpanManual = async (e: MouseEvent) => {
    e.preventDefault();
    const submittedName = newName || 'Tanpa Nama';
    if (window.electronAPI) {
      if (manualTab === 'cari') return;
      const memberResult = await window.electronAPI.createJemaat({
        qr_code_id: `GS-${Date.now()}`,
        name: submittedName,
        phone: newPhone || null,
        birth_date: newDob || null,
        address: newAddress || null,
        category: newCategory === 'Jemaat' ? 'Tetap' : newCategory
      });
      if (!memberResult.success) { setDuplicateError(memberResult.error || 'Gagal menyimpan jemaat.'); return; }
      const attendanceResult = await window.electronAPI.manualAddAttendance({ event_id: selectedEvent, jemaat_id: memberResult.data.id });
      if (!attendanceResult.success) { setDuplicateError(attendanceResult.error || 'Gagal mencatat attendance.'); return; }
      setJemaatData(prev => [memberResult.data, ...prev]);
      setHistoryData(prev => [attendanceResult.data, ...prev]);
      setLatestScan({ name: attendanceResult.data.name, category: attendanceResult.data.category, photo: '' });
      setScanStatus('success');
      setNewName(''); setNewPhone(''); setNewDob(''); setNewAddress(''); setIsManualModalOpen(false);
      return;
    }
    const isDuplicate = historyData.some(item => item.name === submittedName);
    if (isDuplicate) {
      setDuplicateError("Jemaat ini sudah terdaftar hadir di event ini!");
      return;
    }
    const currentTime = getFormattedTime();
    
    const submittedCategory = newCategory;

    if (manualTab === 'baru') {
      let currentJemaatData = jemaatData;
      
      const generateNewId = (category: string, dataArray: any[]) => {
        const prefix = category === 'Jemaat' ? 'JM' : 'GS';
        const filtered = dataArray.filter((item: any) => item.qrId && item.qrId.startsWith(prefix + '-'));
        
        let maxNum = 0;
        filtered.forEach((item: any) => {
          const numPart = parseInt(item.qrId.split('-')[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        });
        
        return `${prefix}-${(maxNum + 1).toString().padStart(4, '0')}`;
      };

      const newJemaat = {
        id: Date.now(),
        qrId: generateNewId(submittedCategory, currentJemaatData),
        name: submittedName,
        phone: newPhone || '-',
        dob: newDob || '-',
        address: newAddress || '-',
        category: submittedCategory
      };
      
      currentJemaatData = [newJemaat, ...currentJemaatData];
      setJemaatData(currentJemaatData);
      
      localStorage.setItem('mock_jemaat_data', JSON.stringify(currentJemaatData));
    }

    const newEntry = {
      id: Date.now(),
      name: submittedName,
      category: submittedCategory,
      time: currentTime,
      photo: ''
    };

    setHistoryData(prev => [newEntry, ...prev]);
    
    setLatestScan({
      name: submittedName,
      category: submittedCategory,
      photo: ''
    });
    setScanStatus('success');
    
    // reset form
    setNewName('');
    setNewPhone('');
    setNewDob('');
    setNewAddress('');
    setNewCategory('Jemaat');
    setIsManualModalOpen(false);
  };

  const handleQrScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput.trim() || !selectedEvent) return;
    if (!window.electronAPI) {
      const member = jemaatData.find(item => item.qrId === qrCodeInput.trim());
      if (member) handleHadirkanTerdaftar(member);
      else setScanStatus('error');
      return;
    }
    const result = await window.electronAPI.scanAttendance({ event_id: selectedEvent, qr_code_id: qrCodeInput.trim() });
    if (!result.success) {
      setScanStatus('error');
      setDuplicateError(result.error || 'Scan gagal.');
      setTimeout(() => setScanStatus('idle'), 2000);
      return;
    }
    setHistoryData(prev => [result.data, ...prev]);
    setLatestScan({ name: result.data.name, category: result.data.category, photo: result.data.photo || '' });
    setScanStatus('success');
    setQrCodeInput('');
    setTimeout(() => setScanStatus('idle'), 2000);
  };

  return (
    <div className="flex flex-col gap-8 p-6 h-full w-full">
      {/* Header Dropdown (Biarkan render seperti aslinya) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Live Attendance</h2>
        <select 
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow shadow-sm cursor-pointer min-w-[320px]"
        >
          <option value="">Pilih Event...</option>
          {filteredEvents.map(evt => (
            <option key={evt.id} value={evt.id}>{evt.name} - {evt.time}</option>
          ))}
        </select>
      </div>

      {/* Blok Kondisional untuk Konten Bawah */}
      {(!selectedEvent || !filteredEvents.some(evt => evt.id === selectedEvent)) ? (
        <div className="w-full mt-8 p-12 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-500 text-lg font-medium">Silakan pilih event terlebih dahulu untuk memulai absensi.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col items-center justify-center shrink-0 w-full">
            {isEventLocked ? (
              <div className="w-full max-w-4xl rounded-2xl shadow-md p-16 flex flex-col items-center justify-center text-center transition-all duration-300 bg-gray-50 border border-gray-200">
                <p className="text-3xl font-bold text-gray-600 mb-8">🔒 Data Absensi Telah Dikunci & Disimpan</p>
                <button 
                  onClick={() => setUnlockPromptOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 bg-white shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  Buka Kunci Data
                </button>
              </div>
            ) : (
              <>
                <div className={`w-full max-w-4xl rounded-2xl shadow-md p-16 flex flex-col items-center justify-center text-center transition-all duration-300 border ${
                  scanStatus === 'idle' ? 'bg-white border-gray-100' : 
                  scanStatus === 'success' ? 'bg-green-50 border-green-200' : 
                  'bg-red-50 border-red-200'
                }`}>
                  {scanStatus === 'idle' && (
                    <>
                      <div className="w-32 h-32 rounded-full bg-gray-50 flex items-center justify-center mb-6 border border-gray-100">
                        <Scan className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-2xl text-gray-500 font-medium">Siap Menerima Scan...</p>
                      <form onSubmit={handleQrScan} className="mt-6 flex gap-2 w-full max-w-md">
                        <input value={qrCodeInput} onChange={(e) => setQrCodeInput(e.target.value)} autoFocus placeholder="Scan atau masukkan QR ID..." className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900" />
                        <button type="submit" className="px-4 py-2.5 rounded-lg bg-[#8f213e] text-white text-sm font-medium">Scan</button>
                      </form>
                    </>
                  )}
                  
                  {scanStatus === 'success' && (
                    <>
                      {latestScan?.photo ? (
                        <img src={latestScan.photo} alt={latestScan.name} className="w-32 h-32 rounded-full object-cover shadow-md mb-6 bg-gray-100" />
                      ) : (
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(latestScan?.name || 'User')}&background=8f213e&color=fff&size=256`} alt={latestScan?.name} className="w-32 h-32 rounded-full object-cover shadow-md mb-6 bg-gray-100" />
                      )}
                      <p className="text-xl text-green-700 font-medium mb-4 flex items-center gap-2">
                        ✅ Berhasil Masuk
                      </p>
                      <h3 className="text-5xl font-bold text-green-900 tracking-tight mb-3">
                        {latestScan ? latestScan.name : 'Budi Santoso'}
                      </h3>
                      <p className="text-2xl text-green-700 opacity-90">
                        ({latestScan ? latestScan.category : 'Jemaat'})
                      </p>
                    </>
                  )}

                  {scanStatus === 'error' && (
                    <>
                      <XCircle className="w-24 h-24 text-red-500 mb-6" />
                      <p className="text-3xl font-bold text-red-700 flex items-center gap-3">
                        ❌ QR Tidak Ditemukan / Sudah Terabsen
                      </p>
                    </>
                  )}
                </div>

              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col w-full">
            {/* Header Blok */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Riwayat Terakhir
                </h3>
              </div>
              <button 
                onClick={() => setIsManualModalOpen(true)}
                disabled={isEventLocked}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  isEventLocked ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#8f213e] text-white hover:bg-[#7a1c35]'
                }`}
              >
                <Plus className="w-4 h-4" />
                Tambah Manual
              </button>
            </div>

            {/* Tabel Mini */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Jam Kedatangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyData.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6 text-sm text-gray-500">{index + 1}</td>
                      <td className="py-3 px-6 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <img 
                            src={row.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=8f213e&color=fff`} 
                            alt={row.name} 
                            className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 shadow-sm"
                          />
                          <span>{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          row.category === 'Jemaat' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-[#cca353]/10 text-[#cca353] border-[#cca353]/30'
                        }`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600 font-mono text-right">
                        {(() => {
                          const raw = row.scan_timestamp || row.time;
                          if (!raw) return '-';
                          const d = new Date(raw);
                          if (isNaN(d.getTime())) return raw;
                          return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!isEventLocked && (
            <button 
              onClick={() => setLockConfirmOpen(true)}
              className="w-full py-4 rounded-xl shadow-sm text-white font-bold text-lg flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 transition-colors"
            >
              🔒 Kunci & Simpan Laporan
            </button>
          )}
        </div>
      )}

      {/* Modal Tambah Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Tambah Manual</h3>
              <button 
                onClick={() => setIsManualModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setManualTab('cari')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  manualTab === 'cari' 
                    ? 'text-[#8f213e] border-b-2 border-[#8f213e] bg-gray-50/50' 
                    : 'text-gray-500 hover:text-[#8f213e] hover:bg-gray-50'
                }`}
              >
                Cari Terdaftar
              </button>
              <button 
                onClick={() => setManualTab('baru')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  manualTab === 'baru' 
                    ? 'text-[#8f213e] border-b-2 border-[#8f213e] bg-gray-50/50' 
                    : 'text-gray-500 hover:text-[#8f213e] hover:bg-gray-50'
                }`}
              >
                Daftar Baru
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {manualTab === 'cari' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ketik Nama Jemaat..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow bg-white text-gray-900"
                    />
                  </div>
                  
                  {/* Search Results */}
                  <div className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto pr-2">
                    {filteredJemaat.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-6">Jemaat tidak ditemukan.</p>
                    ) : (
                      filteredJemaat.map(jemaat => (
                        <div key={jemaat.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <img 
                              src={jemaat.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(jemaat.name)}&background=8f213e&color=fff`} 
                              alt={jemaat.name} 
                              className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 shadow-sm"
                            />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{jemaat.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  jemaat.category === 'Jemaat' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-[#cca353]/10 text-[#cca353] border-[#cca353]/30'
                                }`}>
                                  {jemaat.category}
                                </span>
                                <span className="text-xs text-gray-500">• {jemaat.phone}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleHadirkanTerdaftar(jemaat)}
                            className="bg-[#8f213e] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors"
                          >
                            Hadirkan
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={newName || ""}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Masukkan nama lengkap..."
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Handphone</label>
                      <input 
                        type="tel" 
                        value={newPhone || ""}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="08xx-xxxx-xxxx"
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                      <input 
                        type="date" 
                        value={newDob || ""}
                        onChange={(e) => setNewDob(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
                    <textarea 
                      rows={2}
                      value={newAddress || ""}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Masukkan alamat lengkap..."
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Kedatangan</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'Jemaat' | 'Guest')}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900 bg-white"
                    >
                      <option value="Guest">Guest / Tamu</option>
                      <option value="Jemaat">Jemaat</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button 
                      onClick={handleSimpanManual}
                      className="w-full bg-[#8f213e] text-white py-3 rounded-lg text-sm font-bold hover:bg-[#7a1c35] transition-colors shadow-sm"
                    >
                      Simpan & Hadirkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lock Confirm Modal */}
      {lockConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Kunci Laporan?</h3>
            <p className="text-sm text-gray-600 mb-6">Apakah Anda yakin ingin mengunci data ini? Anda tidak dapat melakukan perubahan data</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setLockConfirmOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                No
              </button>
              <button 
                onClick={handleConfirmLock}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Prompt Modal */}
      {unlockPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Otorisasi Buka Kunci</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  type="text" 
                  value={unlockUsername}
                  onChange={e => setUnlockUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#8f213e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#8f213e]"
                />
              </div>
              {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => setUnlockPromptOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmUnlock}
                className="px-4 py-2 bg-[#8f213e] text-white rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Alert Modal */}
      {duplicateError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 text-center border-t-4 border-red-500">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Duplikat Terdeteksi</h3>
            <p className="text-sm text-gray-600 mb-6">{duplicateError}</p>
            <button 
              onClick={() => setDuplicateError('')}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
