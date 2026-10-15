import { useState, useEffect } from 'react';
import { Download, Users, UserCheck, UserPlus, Search, User, CheckCircle2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<'event' | 'individu'>('event');

  const [eventsData, setEventsData] = useState<any[]>([]);
  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    const loadEvents = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.getEvents();
        setEventsData(data);
        return;
      }
      const saved = localStorage.getItem('mock_event_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setEventsData(parsed);
        } catch(e) {}
      }
    };

    loadEvents();

    if (!window.electronAPI) {
      window.addEventListener('storage', loadEvents);
      return () => window.removeEventListener('storage', loadEvents);
    }
  }, []);

  const filteredEventsForDate = eventsData.filter((event) => {
    if (!event.date) return false;
    
    // Ambil hanya bagian YYYY-MM-DD jika formatnya mengandung waktu (ISO)
    const eventDatePart = event.date.split('T')[0];
    
    // Jika tersimpan dengan format DD/MM/YYYY, lakukan konversi
    if (eventDatePart.includes('/')) {
        const [day, month, year] = eventDatePart.split('/');
        const formattedEventDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return formattedEventDate === selectedDate;
    }
    
    return eventDatePart === selectedDate;
  });

  useEffect(() => {
    if (filteredEventsForDate.length > 0) {
      if (!filteredEventsForDate.find(e => e.id === selectedEventId)) {
        setSelectedEventId(filteredEventsForDate[0].id);
      }
    } else {
      setSelectedEventId('');
    }
  }, [selectedDate, eventsData]);

  const currentEvent = eventsData.find(e => e.id === selectedEventId);
  const isLocked = currentEvent?.is_locked === true;

  const formatWib = (raw: any) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
  };

  const handleExportPDF = () => {
    if (!isLocked || !selectedEventId) return;

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(143, 33, 62);
    doc.text('Laporan Kehadiran', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    const eventName = currentEvent?.name || 'Unknown Event';
    const eventDate = currentEvent?.dateFormatted || '';
    doc.text(`Event: ${eventName}`, 14, 32);
    doc.text(`Tanggal: ${eventDate}`, 14, 38);

    const tableColumn = ["No.", "Waktu Masuk", "Nama Lengkap", "L/P", "Kategori"];
    const tableRows = eventAttendanceData.map((data, index) => [
      index + 1,
      formatWib(data.scan_timestamp || data.time),
      data.name,
      data.gender || '-',
      data.category
    ]);

    const pdfMale = eventAttendanceData.filter(d => d.gender === 'L').length;
    const pdfFemale = eventAttendanceData.filter(d => d.gender === 'P').length;

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [143, 33, 62] },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? 45;
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`Total Laki-laki: ${pdfMale}`, 14, finalY + 10);
    doc.text(`Total Perempuan: ${pdfFemale}`, 14, finalY + 17);
    doc.text(`Total Hadir: ${eventAttendanceData.length}`, 14, finalY + 24);

    doc.save(`Laporan_${eventName.replace(/\s+/g, '_')}.pdf`);
  };

  // Laporan per Event Stats & Data
  const [eventAttendanceData, setEventAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    const loadAttendance = async () => {
      if (selectedEventId) {
        if (window.electronAPI) {
          const data = await window.electronAPI.getAttendance(selectedEventId);
          setEventAttendanceData(data);
          return;
        }
        const saved = localStorage.getItem(`mock_history_${selectedEventId}`);
        if (saved) {
          try {
            setEventAttendanceData(JSON.parse(saved));
          } catch(e) { setEventAttendanceData([]); }
        } else {
          setEventAttendanceData([]);
        }
      } else {
        setEventAttendanceData([]);
      }
    };

    loadAttendance();
    if (!window.electronAPI) {
      window.addEventListener('storage', loadAttendance);
      return () => window.removeEventListener('storage', loadAttendance);
    }
  }, [selectedEventId]);

  const totalHadir = eventAttendanceData.length;
  const totalJemaat = eventAttendanceData.filter(d => d.category === 'Jemaat').length;
  const totalGuest = eventAttendanceData.filter(d => d.category === 'Guest').length;
  const totalMale = eventAttendanceData.filter(d => d.gender === 'L').length;
  const totalFemale = eventAttendanceData.filter(d => d.gender === 'P').length;

  const handleExportExcel = () => {
    if (!isLocked || !selectedEventId) return;
    const eventName = currentEvent?.name || 'Event';
    
    const worksheetData = eventAttendanceData.map((data, index) => ({
      'No.': index + 1,
      'Waktu Masuk': formatWib(data.scan_timestamp || data.time),
      'Nama Lengkap': data.name,
      'L/P': data.gender || '',
      'Kategori': data.category
    }));

    // Tambahkan baris total
    worksheetData.push({ 'No.': '', 'Waktu Masuk': '', 'Nama Lengkap': '', 'L/P': '', 'Kategori': '' } as any);
    worksheetData.push({ 'No.': '', 'Waktu Masuk': 'Total Laki-laki:', 'Nama Lengkap': totalMale, 'L/P': '', 'Kategori': '' } as any);
    worksheetData.push({ 'No.': '', 'Waktu Masuk': 'Total Perempuan:', 'Nama Lengkap': totalFemale, 'L/P': '', 'Kategori': '' } as any);
    worksheetData.push({ 'No.': '', 'Waktu Masuk': 'Total Hadir:', 'Nama Lengkap': totalHadir, 'L/P': '', 'Kategori': '' } as any);

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran');
    
    XLSX.writeFile(workbook, `Laporan_${eventName.replace(/\s+/g, '_')}.xlsx`);
  };

  // Riwayat Individu Stats & Data
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [individualHistoryData, setIndividualHistoryData] = useState<any[]>([]);
  const [individualStats, setIndividualStats] = useState({ name: '-', category: '-', id: '-' });
  const [individualStartDate, setIndividualStartDate] = useState('');
  const [individualEndDate, setIndividualEndDate] = useState('');

  const filteredIndividualHistoryData = individualHistoryData.filter((row) => {
    if (!individualStartDate && !individualEndDate) return true;
    const rowDate = row.date; // format YYYY-MM-DD
    if (individualStartDate && rowDate < individualStartDate) return false;
    if (individualEndDate && rowDate > individualEndDate) return false;
    return true;
  });

  useEffect(() => {
    if (!searchInputValue.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchInputValue.toLowerCase();
    if (window.electronAPI) {
      window.electronAPI.getAllJemaat({ search: query }).then(result => {
        setSearchResults(result.success ? (result.data || []).map(jemaat => ({
          ...jemaat,
          qrId: jemaat.qrId || jemaat.qr_code_id,
          category: jemaat.category === 'Tetap' ? 'Jemaat' : jemaat.category
        })) : []);
      });
      return;
    }
    const jemaatDataStr = localStorage.getItem('mock_jemaat_data');
    if (jemaatDataStr) {
      try {
        const jemaatData = JSON.parse(jemaatDataStr);
        setSearchResults(jemaatData.filter((j: any) => j.name.toLowerCase().includes(query)));
      } catch(e) { setSearchResults([]); }
    } else setSearchResults([]);
  }, [searchInputValue]);

  useEffect(() => {
    const loadIndividu = async () => {
      if (!individualSearchQuery.trim()) {
        setIndividualHistoryData([]);
        setIndividualStats({ name: '-', category: '-', id: '-' });
        return;
      }
      
      const query = individualSearchQuery.toLowerCase();
      const history: any[] = [];
      let foundName = '-';
      let foundCategory = '-';
      let foundId = '-';
      
      if (window.electronAPI) {
        const jemaatResult = await window.electronAPI.getAllJemaat({ search: query });
        const jemaat = jemaatResult.success ? jemaatResult.data?.[0] : undefined;
        if (jemaat) {
          foundName = jemaat.name;
          foundCategory = jemaat.category === 'Tetap' ? 'Jemaat' : jemaat.category;
          foundId = jemaat.qrId || jemaat.qr_code_id || '-';
          const historyResult = await window.electronAPI.getJemaatHistory(jemaat.id);
          if (historyResult.success) {
            (historyResult.data?.history || []).forEach((entry: any) => history.push({
              id: `${entry.event_id}_${entry.scan_timestamp}`,
              date: entry.event_date,
              event: entry.event_title,
              status: 'Hadir',
              time: entry.scan_timestamp
            }));
          }
        }
      } else {
        // Fallback
        const jemaatDataStr = localStorage.getItem('mock_jemaat_data');
        if (jemaatDataStr) {
          try {
            const jemaatData = JSON.parse(jemaatDataStr);
            const jemaat = jemaatData.find((j: any) => j.name.toLowerCase().includes(query));
            if (jemaat) {
              foundName = jemaat.name;
              foundCategory = jemaat.category;
              foundId = jemaat.qrId || '-';
            }
          } catch (e) {}
        }
    
        eventsData.forEach((evt) => {
          const saved = localStorage.getItem(`mock_history_${evt.id}`);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const attended = parsed.find((p: any) => p.name.toLowerCase().includes(query));
              if (attended) {
                if (foundName === '-') {
                  foundName = attended.name;
                  foundCategory = attended.category;
                }
                history.push({
                  id: `${evt.id}_${attended.id}`,
                  date: evt.date,
                  event: evt.name,
                  status: 'Hadir',
                  time: attended.time
                });
              }
            } catch(e) {}
          }
        });
      }
  
      setIndividualHistoryData(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIndividualStats({ name: foundName !== '-' ? foundName : individualSearchQuery, category: foundCategory !== '-' ? foundCategory : '-', id: foundId });
    };
    loadIndividu();
  }, [individualSearchQuery, eventsData]);

  const handleExportExcelIndividu = () => {
    if (filteredIndividualHistoryData.length === 0) return;
    
    const worksheetData = filteredIndividualHistoryData.map((data, index) => ({
      'No.': index + 1,
      'Tanggal': data.date,
      'Nama Event': data.event,
      'Jam Masuk': data.time,
      'Status': data.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat');
    
    XLSX.writeFile(workbook, `Riwayat_${individualStats.name.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header & Tabs Navigation */}
      <div className="flex flex-col gap-6 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan & Analitik</h2>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('event')}
            className={`pb-3 px-6 text-sm font-medium transition-colors relative ${
              activeTab === 'event' 
                ? 'text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Laporan per Event
            {activeTab === 'event' && (
              <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('individu')}
            className={`pb-3 px-6 text-sm font-medium transition-colors relative ${
              activeTab === 'individu' 
                ? 'text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Riwayat Individu
            {activeTab === 'individu' && (
              <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* --- MODE: LAPORAN PER EVENT --- */}
      {activeTab === 'event' && (
        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          {/* Filter & Aksi */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 w-full max-w-xl">
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow shadow-sm cursor-pointer"
              />
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow shadow-sm cursor-pointer"
              >
                {filteredEventsForDate.length > 0 ? filteredEventsForDate.map(evt => (
                  <option key={evt.id} value={evt.id}>{evt.name} - {evt.time}</option>
                )) : (
                  <option value="">Tidak ada event di tanggal ini</option>
                )}
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              {!isLocked && selectedEventId && (
                <span className="text-sm font-medium text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-100">
                  ⚠️ Riwayat belum fix (Absensi belum dikunci)
                </span>
              )}
              <button 
                disabled={!isLocked || !selectedEventId}
                onClick={handleExportPDF}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  (!isLocked || !selectedEventId) ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-[#8f213e] text-white hover:bg-[#7a1c35]'
                }`}
              >
                <FileText className="w-4 h-4" />
                Download PDF
              </button>
              <button 
                disabled={!isLocked || !selectedEventId}
                onClick={handleExportExcel}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  (!isLocked || !selectedEventId) ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Download className="w-4 h-4" />
                Export Data Event (.xlsx)
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4 shrink-0">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total Hadir</p>
                <h3 className="text-2xl font-bold text-gray-900">{!selectedEventId ? '-' : totalHadir}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shrink-0">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Jemaat Tetap</p>
                <h3 className="text-2xl font-bold text-gray-900">{!selectedEventId ? '-' : totalJemaat}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
                <UserPlus className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Guest</p>
                <h3 className="text-2xl font-bold text-gray-900">{!selectedEventId ? '-' : totalGuest}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                <span className="text-indigo-600 font-bold">L</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Laki-laki</p>
                <h3 className="text-2xl font-bold text-gray-900">{!selectedEventId ? '-' : totalMale}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center border border-pink-100 shrink-0">
                <span className="text-pink-600 font-bold">P</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Perempuan</p>
                <h3 className="text-2xl font-bold text-gray-900">{!selectedEventId ? '-' : totalFemale}</h3>
              </div>
            </div>
          </div>

          {/* Tabel Data Kehadiran */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Jam Kedatangan</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">L/P</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!selectedEventId ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-6 text-sm text-center text-gray-500 italic">
                        Belum ada data untuk event ini.
                      </td>
                    </tr>
                  ) : (
                    eventAttendanceData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-600 font-mono">{formatWib(row.scan_timestamp || row.time)}</td>
                        <td className="py-4 px-6 text-sm font-medium text-gray-900">{row.name}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{row.gender || '-'}</td>
                        <td className="py-4 px-6 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            row.category === 'Jemaat' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {row.category}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {selectedEventId && eventAttendanceData.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={4} className="py-4 px-6 text-sm font-semibold text-gray-800">
                        Total Hadir: {totalHadir} orang — Laki-laki: {totalMale} | Perempuan: {totalFemale}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODE: RIWAYAT INDIVIDU --- */}
      {activeTab === 'individu' && (
        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          {/* Filter & Aksi */}
          <div className="flex items-center justify-between shrink-0">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchInputValue}
                onChange={(e) => {
                  setSearchInputValue(e.target.value);
                  if (e.target.value === '') {
                    setIndividualSearchQuery('');
                  }
                }}
                placeholder="Cari Nama Jemaat..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8f213e] transition-shadow bg-white text-gray-900"
              />
              
              {/* Dropdown Hasil Pencarian */}
              {searchResults.length > 0 && searchInputValue !== individualSearchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(jemaat => (
                    <button
                      key={jemaat.id}
                      onClick={() => {
                        setIndividualSearchQuery(jemaat.name);
                        setSearchInputValue(jemaat.name);
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{jemaat.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{jemaat.phone}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-medium border ${
                        jemaat.category === 'Jemaat' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {jemaat.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                <input
                  type="date"
                  max="9999-12-31"
                  value={individualStartDate}
                  onChange={e => setIndividualStartDate(e.target.value)}
                  className="text-sm outline-none bg-transparent text-gray-700"
                  title="Dari Tanggal"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="date"
                  max="9999-12-31"
                  value={individualEndDate}
                  onChange={e => setIndividualEndDate(e.target.value)}
                  className="text-sm outline-none bg-transparent text-gray-700"
                  title="Sampai Tanggal"
                />
              </div>
              <button 
                onClick={handleExportExcelIndividu}
                disabled={filteredIndividualHistoryData.length === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  filteredIndividualHistoryData.length === 0 ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Download className="w-4 h-4" />
                Export Riwayat (.xlsx)
              </button>
            </div>
          </div>

          {individualSearchQuery ? (
            <>
              {/* Profil Ringkas */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <User className="w-7 h-7 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{individualStats.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">ID: {individualStats.id} • {individualStats.category}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 text-center">
                    Total Kehadiran{individualStartDate || individualEndDate ? ' (Terfilter)' : ''}
                  </p>
                  <p className="text-2xl font-bold text-blue-800 text-center mt-1">{filteredIndividualHistoryData.length} Kali</p>
                </div>
              </div>

              {/* Tabel Riwayat */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Tanggal</th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Event</th>
                        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredIndividualHistoryData.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 px-6 text-sm text-center text-gray-500 italic">
                            Tidak ada riwayat kehadiran.
                          </td>
                        </tr>
                      ) : (
                        filteredIndividualHistoryData.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-6 text-sm text-gray-600 font-mono">{row.date}</td>
                            <td className="py-4 px-6 text-sm font-medium text-gray-900">{row.event}</td>
                            <td className="py-4 px-6 text-sm">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Jemaat Terpilih</h3>
              <p className="text-gray-500 text-center max-w-md">
                Ketik nama jemaat pada kolom pencarian di atas, lalu pilih dari daftar yang muncul untuk melihat detail profil dan riwayat kehadirannya.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
