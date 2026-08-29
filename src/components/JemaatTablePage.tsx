import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Plus, Search, Pencil, Trash2, QrCode, X, Camera, Gift } from 'lucide-react';
import QRGenerator from './QRGenerator';

const toUiMember = (member: any) => ({
  ...member,
  qrId: member.qrId || member.qr_code_id,
  dob: member.dob || member.birth_date,
  category: member.category === 'Tetap' ? 'Jemaat' : member.category
});

export default function JemaatTablePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedMemberForQR, setSelectedMemberForQR] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [selectedDetailData, setSelectedDetailData] = useState<any>(null);

  // Data Persistence
  const [jemaatData, setJemaatData] = useState(() => {
    if (window.electronAPI) return [];
    const saved = localStorage.getItem('mock_jemaat_data');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        // Migrasi otomatis: ubah semua QR- menjadi JM- atau GS- sesuai kategori
        let hasChanges = false;
        parsed = parsed.map((item: any) => {
          if (item.qrId && item.qrId.startsWith('QR-')) {
            hasChanges = true;
            const numPart = item.qrId.split('-')[1];
            const prefix = item.category === 'Jemaat' ? 'JM' : 'GS';
            return { ...item, qrId: `${prefix}-${numPart}` };
          }
          return item;
        });
        
        if (hasChanges) {
          localStorage.setItem('mock_jemaat_data', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [
      { id: 1, qrId: 'JM-0001', name: 'Budi Santoso', phone: '0812-3456-7890', dob: '1985-04-12', address: 'Jl. Merdeka No. 10, Jakarta', category: 'Jemaat' },
      { id: 2, qrId: 'JM-0002', name: 'Sarah Wijaya', phone: '0813-4567-8901', dob: '1990-08-25', address: 'Komp. Harmoni Blok C2, Bandung', category: 'Jemaat' },
      { id: 3, qrId: 'GS-0001', name: 'Michael Chen', phone: '0814-5678-9012', dob: '1992-11-05', address: 'Jl. Sudirman 45, Surabaya', category: 'Guest' },
      { id: 4, qrId: 'JM-0003', name: 'Keluarga Tan', phone: '0815-6789-0123', dob: '1980-02-15', address: 'Bukit Golf 88, Semarang', category: 'Jemaat' },
      { id: 5, qrId: 'GS-0002', name: 'Agus Pratama', phone: '0816-7890-1234', dob: '1995-09-30', address: 'Jl. Melati Raya, Medan', category: 'Guest' },
    ];
  });

  useEffect(() => {
    if (!window.electronAPI) localStorage.setItem('mock_jemaat_data', JSON.stringify(jemaatData));
  }, [jemaatData]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!window.electronAPI) return;
      const result = await window.electronAPI.getAllJemaat();
      if (result.success) setJemaatData((result.data || []).map(toUiMember));
    };
    loadMembers();
  }, []);

  // Filter State
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState<'Jemaat' | 'Guest'>('Jemaat');
  const [formPhoto, setFormPhoto] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openModal = (mode: 'add' | 'edit', member: any = null) => {
    setModalMode(mode);
    if (mode === 'edit' && member) {
      setFormName(member.name || '');
      setFormPhone(member.phone || '');
      setFormDob(member.dob || '');
      setFormAddress(member.address || '');
      setFormCategory(member.category || 'Jemaat');
      setFormPhoto(member.photo || '');
      setEditingId(member.id);
      setInitialFormData({
        name: member.name || '',
        phone: member.phone || '',
        dob: member.dob || '',
        address: member.address || '',
        category: member.category || 'Jemaat',
        photo: member.photo || ''
      });
    } else {
      setFormName('');
      setFormPhone('');
      setFormDob('');
      setFormAddress('');
      setFormCategory('Jemaat');
      setFormPhoto('');
      setEditingId(null);
      setInitialFormData(null);
    }
    setIsModalOpen(true);
  };

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

  const handleSimpan = async () => {
    if (modalMode === 'edit' && editingId) {
      const updatedMember = {
        qr_code_id: jemaatData.find(item => item.id === editingId)?.qrId,
        name: formName || 'Tanpa Nama',
        phone: formPhone || '-',
        birth_date: formDob || null,
        address: formAddress || '-',
        category: formCategory === 'Jemaat' ? 'Tetap' : formCategory,
        photo: formPhoto
      };
      if (window.electronAPI) {
        const result = await window.electronAPI.updateJemaat(editingId, updatedMember);
        if (!result.success) { alert(result.error || 'Gagal memperbarui jemaat.'); return; }
      }
      setJemaatData(prev => prev.map(item =>
        item.id === editingId 
          ? {
              ...item,
              ...updatedMember,
              qrId: updatedMember.qr_code_id,
              dob: updatedMember.birth_date || '-',
              category: formCategory,
            } 
          : item
      ));
    } else {
      const newData = {
        id: Date.now(),
        qrId: generateNewId(formCategory, jemaatData),
        name: formName || 'Tanpa Nama',
        phone: formPhone || '-',
        dob: formDob || '-',
        address: formAddress || '-',
        category: formCategory,
        photo: formPhoto
      };
      if (window.electronAPI) {
        const result = await window.electronAPI.createJemaat({
          qr_code_id: newData.qrId,
          name: newData.name,
          phone: newData.phone,
          birth_date: newData.dob === '-' ? null : newData.dob,
          address: newData.address,
          category: newData.category === 'Jemaat' ? 'Tetap' : newData.category,
          photo: newData.photo
        });
        if (!result.success) { alert(result.error || 'Gagal menambahkan jemaat.'); return; }
        setJemaatData(prev => [toUiMember(result.data), ...prev]);
      } else {
        setJemaatData(prev => [newData, ...prev]);
      }
    }
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteJemaat(itemToDelete.id);
        if (!result.success) { alert(result.error || 'Gagal menghapus jemaat.'); return; }
      }
      setJemaatData(prev => prev.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const hasChanges = () => {
    if (modalMode === 'add') return true;
    if (!initialFormData) return false;
    return (
      formName !== initialFormData.name ||
      formPhone !== initialFormData.phone ||
      formDob !== initialFormData.dob ||
      formAddress !== initialFormData.address ||
      formCategory !== initialFormData.category ||
      formPhoto !== initialFormData.photo
    );
  };

  const isSaveDisabled = modalMode === 'edit' && !hasChanges();

  const bulanMap: { [key: string]: number } = {
    "Januari": 0, "Februari": 1, "Maret": 2, "April": 3,
    "Mei": 4, "Juni": 5, "Juli": 6, "Agustus": 7,
    "September": 8, "Oktober": 9, "November": 10, "Desember": 11
  };

  const filteredData = jemaatData.filter(row => {
    const matchesCategory = filterCategory === 'Semua' || row.category === filterCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      row.name.toLowerCase().includes(searchLower) || 
      row.phone.includes(searchQuery) ||
      (row.qrId && row.qrId.toLowerCase().includes(searchLower));
    
    let matchesBulan = true;
    if (filterBulan !== 'Semua Bulan') {
      if (!row.dob || row.dob === '-') {
        matchesBulan = false;
      } else {
        const dobDate = new Date(row.dob);
        if (!isNaN(dobDate.getTime())) {
          matchesBulan = dobDate.getMonth() === bulanMap[filterBulan];
        } else {
          matchesBulan = false;
        }
      }
    }

    return matchesCategory && matchesSearch && matchesBulan;
  });

  const handleExportExcel = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.exportJemaat({
      category: filterCategory === 'Jemaat' ? 'Tetap' : filterCategory === 'Semua' ? '' : filterCategory,
      birthMonth: filterBulan === 'Semua Bulan' ? '' : bulanMap[filterBulan] + 1
    });
    if (!result.success && !result.data?.cancelled) alert(result.error || 'Export gagal.');
  };

  const handleImportExcel = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.importJemaat();
    if (!result.success) { alert(result.error || 'Import gagal.'); return; }
    const members = await window.electronAPI.getAllJemaat();
    if (members.success) setJemaatData((members.data || []).map(toUiMember));
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header & Top Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Database Jemaat</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8f213e] text-[#8f213e] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Upload className="w-4 h-4 text-[#8f213e]" />
            Export XLSX
          </button>
          <button onClick={handleImportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8f213e] text-[#8f213e] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 text-[#8f213e]" />
            Import Data
          </button>
          <button 
            onClick={() => openModal('add')}
            className="flex items-center gap-2 px-4 py-2 bg-[#8f213e] text-white rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Jemaat
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, QR ID, atau No HP..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow bg-white text-gray-700"
          />
        </div>
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow shadow-sm cursor-pointer"
        >
          <option value="Semua">Semua Kategori</option>
          <option value="Jemaat">Jemaat</option>
          <option value="Guest">Guest</option>
        </select>
        <select 
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow shadow-sm cursor-pointer"
        >
          <option value="Semua Bulan">Semua Bulan</option>
          <option value="Januari">Januari</option>
          <option value="Februari">Februari</option>
          <option value="Maret">Maret</option>
          <option value="April">April</option>
          <option value="Mei">Mei</option>
          <option value="Juni">Juni</option>
          <option value="Juli">Juli</option>
          <option value="Agustus">Agustus</option>
          <option value="September">September</option>
          <option value="Oktober">Oktober</option>
          <option value="November">November</option>
          <option value="Desember">Desember</option>
        </select>
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">No. HP</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal Lahir</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alamat</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-600 font-mono">{row.qrId}</td>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => setSelectedDetailData(row)}
                    >
                      <img 
                        src={row.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=8f213e&color=fff`} 
                        alt={row.name} 
                        className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 shadow-sm group-hover:ring-2 group-hover:ring-[#8f213e] transition-all"
                      />
                      <span className="group-hover:text-[#8f213e] group-hover:underline transition-colors">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{row.phone}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {row.dob && row.dob !== '-' 
                      ? new Date(row.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600 truncate max-w-[150px]" title={row.address}>{row.address}</td>
                  <td className="py-4 px-6 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      row.category === 'Jemaat' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-[#cca353]/10 text-[#cca353] border-[#cca353]/30'
                    }`}>
                      {row.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.category === 'Jemaat' ? (
                        <button 
                          onClick={() => setSelectedMemberForQR(row)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title="Lihat QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-7 h-7"></div>
                      )}
                      <button 
                        onClick={() => openModal('edit', row)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit Data"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setItemToDelete(row)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulasi Modal Form (Popup CRUD) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'add' ? 'Tambah Jemaat Baru' : 'Edit Data Jemaat'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group"
                  >
                    {formPhoto ? (
                      <img src={formPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400 group-hover:text-gray-500" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={formName || ""}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Handphone</label>
                  <input 
                    type="tel" 
                    value={formPhone || ""}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="08xx-xxxx-xxxx"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    value={formDob || ""}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
                <textarea 
                  rows={3}
                  value={formAddress || ""}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori / Tipe</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="kategori" 
                      value="Jemaat" 
                      checked={formCategory === 'Jemaat'}
                      onChange={() => setFormCategory('Jemaat')}
                      className="text-gray-900 focus:ring-gray-900" 
                    />
                    <span className="text-sm text-gray-700">Jemaat</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="kategori" 
                      value="Guest" 
                      checked={formCategory === 'Guest'}
                      onChange={() => setFormCategory('Guest')}
                      className="text-gray-900 focus:ring-gray-900" 
                    />
                    <span className="text-sm text-gray-700">Guest</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSimpan}
                disabled={isSaveDisabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSaveDisabled 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#8f213e] text-white hover:bg-[#7a1c35] shadow-sm'
                }`}
              >
                {modalMode === 'add' ? 'Simpan' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
      {selectedMemberForQR && (
        <QRGenerator 
          member={selectedMemberForQR} 
          onClose={() => setSelectedMemberForQR(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Data?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus data <span className="font-semibold text-gray-700">{itemToDelete.name}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-[#8f213e] text-white rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Card Modal */}
      {selectedDetailData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="h-24 bg-gradient-to-r from-[#8f213e] to-[#cca353]"></div>
            <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white -mt-12 mb-3 shadow-md">
                <img 
                  src={selectedDetailData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDetailData.name)}&background=8f213e&color=fff&size=256`} 
                  alt={selectedDetailData.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center">{selectedDetailData.name}</h3>
              <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                selectedDetailData.category === 'Jemaat' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-[#cca353]/10 text-[#cca353] border-[#cca353]/30'
              }`}>
                {selectedDetailData.category}
              </span>

              <div className="w-full mt-6 space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ID / QR Code</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 py-1.5 px-3 rounded border border-gray-100">{selectedDetailData.qrId}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">No. Handphone</p>
                  <p className="text-sm text-gray-900 font-medium">{selectedDetailData.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Alamat</p>
                  <p className="text-sm text-gray-900">{selectedDetailData.address}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedDetailData(null)}
                className="mt-8 w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
