import { useState, useEffect } from 'react';
import { Trophy, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RankingData {
  id: number;
  name: string;
  qr_code_id: string;
  category: string;
  total_attendance: number;
}

export default function RankingPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRankings = async () => {
    setIsLoading(true);
    try {
      const res = await window.electronAPI.getAttendanceRanking(startDate || null, endDate || null);
      if (res && res.success) {
        setRankings(res.data || []);
      } else {
        setRankings([]);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      setRankings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  const handleExportExcel = () => {
    if (rankings.length === 0) return;
    
    const worksheetData = rankings.map((data, index) => ({
      'Peringkat': index + 1,
      'Nama Jemaat': data.name,
      'ID Jemaat': data.qr_code_id,
      'Kategori': data.category,
      'Total Kehadiran': data.total_attendance
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peringkat_Kehadiran');
    
    const dateRangeStr = (startDate || 'Awal') + '_sd_' + (endDate || 'Akhir');
    XLSX.writeFile(workbook, `Peringkat_Kehadiran_${dateRangeStr}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2.5 rounded-xl">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Peringkat Kehadiran (Leaderboard)</h2>
          </div>
          
          <button 
            onClick={handleExportExcel}
            disabled={rankings.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              rankings.length === 0 
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                : 'bg-[#8f213e] text-white hover:bg-[#7a1c35]'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Data (.xlsx)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center bg-gray-50/50">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input 
              type="date" 
              max="9999-12-31"
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="text-sm outline-none bg-transparent text-gray-700" 
              title="Dari Tanggal"
            />
            <span className="text-gray-400 font-medium">-</span>
            <input 
              type="date" 
              max="9999-12-31"
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="text-sm outline-none bg-transparent text-gray-700"
              title="Sampai Tanggal" 
            />
          </div>

          <button 
            onClick={fetchRankings}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
          >
            Tampilkan
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-gray-50/30">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-center">Rank</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Jemaat</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Total Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-[#8f213e] rounded-full animate-spin"></div>
                      Memuat data peringkat...
                    </div>
                  </td>
                </tr>
              ) : rankings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Belum ada data kehadiran pada periode ini.
                  </td>
                </tr>
              ) : (
                rankings.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        idx === 1 ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        idx === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-white text-gray-600 border-gray-100'
                      }`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{row.qr_code_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        row.category === 'Tetap' || row.category === 'Jemaat'
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-[#8f213e]/10 text-[#8f213e] rounded-xl font-bold">
                        {row.total_attendance}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
