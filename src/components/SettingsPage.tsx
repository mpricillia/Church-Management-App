import React, { useState } from 'react';
import { Download, Upload, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.exportBackup();
      if (!result.success && !result.data?.cancelled) alert(result.error || 'Terjadi kesalahan saat mengekspor data.');
      return;
    }
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `church-app-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Terjadi kesalahan saat mengekspor data.');
    }
  };

  const handleImport = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.importBackup();
      if (result.success) {
        setImportStatus('success');
        setTimeout(() => window.location.reload(), 800);
      } else if (!result.data?.cancelled) {
        setImportStatus('error');
      }
      return;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
          <SettingsIcon className="w-5 h-5 text-gray-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pengaturan Sistem</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
        <div className="p-8 max-w-3xl">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Manajemen Data & Backup</h3>
          
          <div className="space-y-6">
            {/* Export Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border border-gray-100 rounded-xl bg-gray-50/50">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Backup Data (Export)
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Unduh seluruh data aplikasi (Data Jemaat, Event, & Riwayat Absensi) ke dalam format JSON.
                </p>
              </div>
              <button 
                onClick={handleExport}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-[#8f213e] text-[#8f213e] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4 text-[#8f213e]" />
                Export Data
              </button>
            </div>

            {/* Import Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border border-gray-100 rounded-xl bg-gray-50/50">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-orange-600" />
                  Restore Data (Import)
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Pulihkan data aplikasi dari file backup JSON yang sebelumnya telah di-export.
                </p>
              </div>
              
              <button 
                onClick={handleImport}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8f213e] text-white rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Import File
              </button>
            </div>

            {/* Status Messages */}
            {importStatus === 'success' && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-green-800">Berhasil Memulihkan Data</h5>
                  <p className="text-sm text-green-700 mt-0.5">Aplikasi akan segera dimuat ulang untuk menerapkan data terbaru...</p>
                </div>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-red-800">Gagal Mengimpor Data</h5>
                  <p className="text-sm text-red-700 mt-0.5">Pastikan file yang diunggah adalah file JSON valid hasil dari backup aplikasi ini.</p>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
