import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Plus, Search, Pencil, Trash2, QrCode, X, Camera, Image as ImageIcon } from 'lucide-react';
import QRGenerator from './QRGenerator';
// @ts-ignore
import QRCode from 'qrcode';

interface KomselData {
  id: number;
  nama_komsel: string;
  kode_warna: string;
}

const toUiMember = (member: any) => ({
  ...member,
  qrId: member.qrId || member.qr_code_id,
  dob: member.dob || member.birth_date,
  category: member.category === 'Tetap' ? 'Jemaat' : member.category,
});

export default function JemaatTablePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedMemberForQR, setSelectedMemberForQR] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [selectedDetailData, setSelectedDetailData] = useState<any>(null);

  // Komsel State
  const [komselList, setKomselList] = useState<KomselData[]>([]);
  const [isKomselModalOpen, setIsKomselModalOpen] = useState(false);
  const [newKomselName, setNewKomselName] = useState('');
  const [newKomselColor, setNewKomselColor] = useState('#3B82F6');

  // Data Persistence
  const [jemaatData, setJemaatData] = useState<any[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      if (!window.electronAPI) return;
      const [jemaatResult, komselResult] = await Promise.all([
        window.electronAPI.getAllJemaat(),
        window.electronAPI.getAllKomsel(),
      ]);
      if (jemaatResult.success) setJemaatData((jemaatResult.data || []).map(toUiMember));
      if (komselResult.success) setKomselList(komselResult.data || []);
    };
    loadAll();
  }, []);

  // Filter State
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [filterKomsel, setFilterKomsel] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState<'Jemaat' | 'Guest'>('Jemaat');
  const [formPhoto, setFormPhoto] = useState('');
  const [formPronouns, setFormPronouns] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formTanggalNikah, setFormTanggalNikah] = useState('');
  const [formTanggalBaptis, setFormTanggalBaptis] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formKomselId, setFormKomselId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormPhone(''); setFormDob(''); setFormAddress('');
    setFormCategory('Jemaat'); setFormPhoto(''); setFormPronouns(''); setFormGender('');
    setFormTanggalNikah(''); setFormTanggalBaptis(''); setFormCatatan('');
    setFormKomselId(null);
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
      setFormGender(member.gender || '');
      
      let pronoun = member.pronouns || '';
      const pLower = pronoun.toLowerCase().replace(/[^a-z]/g, '');
      if (pLower.includes('bpk') || pLower.includes('bapak')) pronoun = 'Bapak';
      else if (pLower.includes('ibu')) pronoun = 'Ibu';
      else if (pLower.includes('sdr') || pLower.includes('saudara')) pronoun = 'Sdr/i';
      
      setFormPronouns(pronoun);
      setFormTanggalNikah(member.tanggal_nikah || '');
      setFormTanggalBaptis(member.tanggal_baptis || '');
      setFormCatatan(member.catatan || '');
      setFormKomselId(member.komsel_id || null);
      setEditingId(member.id);
      setInitialFormData({
        name: member.name || '', phone: member.phone || '', dob: member.dob || '',
        address: member.address || '', category: member.category || 'Jemaat',
        photo: member.photo || '', pronouns: member.pronouns || '', gender: member.gender || '',
        tanggal_nikah: member.tanggal_nikah || '', tanggal_baptis: member.tanggal_baptis || '',
        catatan: member.catatan || '', komsel_id: member.komsel_id || null,
      });
    } else {
      resetForm();
      setEditingId(null);
      setInitialFormData(null);
    }
    setIsModalOpen(true);
  };

  const generateNewId = (category: string, dataArray: any[]) => {
    const prefix = category === 'Jemaat' ? 'ROCKLMJ' : 'GS';
    const filtered = dataArray.filter((item: any) => item.qrId && item.qrId.startsWith(prefix));
    let maxNum = 0;
    filtered.forEach((item: any) => {
      const numPartStr = item.qrId.replace(prefix, ''); // ambil angkanya saja, e.g. "0001"
      const numPart = parseInt(numPartStr, 10);
      if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
    });
    return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
  };

  const buildMemberPayload = (qrId?: string) => ({
    qr_code_id: qrId,
    name: formName || 'Tanpa Nama',
    phone: formPhone || '-',
    birth_date: formDob || null,
    address: formAddress || '-',
    category: formCategory === 'Jemaat' ? 'Tetap' : formCategory,
    photo: formPhoto,
    pronouns: formPronouns || null,
    gender: formGender || null,
    tanggal_nikah: formTanggalNikah || null,
    tanggal_baptis: formTanggalBaptis || null,
    catatan: formCatatan || null,
    komsel_id: formCategory === 'Jemaat' ? (formKomselId || null) : null,
  });

  const handleSimpan = async () => {
    if (!formGender) {
      alert('Jenis Kelamin wajib diisi.');
      return;
    }

    if (modalMode === 'edit' && editingId) {
      const existingQrId = jemaatData.find(item => item.id === editingId)?.qrId;
      const payload = buildMemberPayload(existingQrId);
      if (window.electronAPI) {
        const result = await window.electronAPI.updateJemaat(editingId, payload);
        if (!result.success) { alert(result.error || 'Gagal memperbarui jemaat.'); return; }
      }
      const komsel = komselList.find(k => k.id === formKomselId);
      setJemaatData(prev => prev.map(item =>
        item.id === editingId
          ? { ...item, ...payload, qrId: existingQrId, dob: formDob || '-',
              category: formCategory, komsel_id: formKomselId,
              nama_komsel: komsel?.nama_komsel || null, kode_warna: komsel?.kode_warna || null }
          : item
      ));
    } else {
      const newQrId = generateNewId(formCategory, jemaatData);
      const payload = buildMemberPayload(newQrId);
      if (window.electronAPI) {
        const result = await window.electronAPI.createJemaat(payload);
        if (!result.success) { alert(result.error || 'Gagal menambahkan jemaat.'); return; }
        setJemaatData(prev => [toUiMember(result.data), ...prev]);
      } else {
        setJemaatData(prev => [{ ...payload, id: Date.now(), qrId: newQrId, dob: formDob || '-', category: formCategory }, ...prev]);
      }
    }
    setIsModalOpen(false);
  };

  const handleAddKomsel = async () => {
    if (!newKomselName.trim()) return;
    if (window.electronAPI) {
      const result = await window.electronAPI.createKomsel({ nama_komsel: newKomselName.trim(), kode_warna: newKomselColor });
      if (!result.success) { alert(result.error || 'Gagal membuat komsel.'); return; }
      const created: KomselData = result.data;
      setKomselList(prev => [...prev, created].sort((a, b) => a.nama_komsel.localeCompare(b.nama_komsel)));
      setFormKomselId(created.id);
    }
    setIsKomselModalOpen(false);
    setNewKomselName('');
    setNewKomselColor('#3B82F6');
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
      formName !== initialFormData.name || formPhone !== initialFormData.phone ||
      formDob !== initialFormData.dob || formAddress !== initialFormData.address ||
      formCategory !== initialFormData.category || formPhoto !== initialFormData.photo ||
      formPronouns !== initialFormData.pronouns || formGender !== initialFormData.gender ||
      formTanggalNikah !== initialFormData.tanggal_nikah ||
      formTanggalBaptis !== initialFormData.tanggal_baptis || formCatatan !== initialFormData.catatan ||
      formKomselId !== initialFormData.komsel_id
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
      (row.name?.toLowerCase() || '').includes(searchLower) ||
      (row.phone?.toString() || '').includes(searchQuery) ||
      (row.qrId?.toLowerCase() || '').includes(searchLower);
    let matchesBulan = true;
    if (filterBulan !== 'Semua Bulan') {
      if (!row.dob || row.dob === '-') { matchesBulan = false; }
      else {
        const dobDate = new Date(row.dob);
        if (!isNaN(dobDate.getTime())) matchesBulan = dobDate.getMonth() === bulanMap[filterBulan];
        else matchesBulan = false;
      }
    }
    let matchesKomsel = true;
    if (filterKomsel === 'belum-kc') {
      matchesKomsel = row.category === 'Jemaat' && !row.komsel_id;
    } else if (filterKomsel !== 'Semua') {
      matchesKomsel = String(row.komsel_id) === filterKomsel;
    }
    return matchesCategory && matchesSearch && matchesBulan && matchesKomsel;
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
    
    // Refresh both jemaat and komsel lists to get newly added komsels
    const [jemaatResult, komselResult] = await Promise.all([
      window.electronAPI.getAllJemaat(),
      window.electronAPI.getAllKomsel(),
    ]);
    if (jemaatResult.success) setJemaatData((jemaatResult.data || []).map(toUiMember));
    if (komselResult.success) setKomselList(komselResult.data || []);
  };

  const [exportQRProgress, setExportQRProgress] = useState({ current: 0, total: 0, isOpen: false });

  const handleExportQRCodes = async () => {
    if (!window.electronAPI) return;
    const dirResult = await window.electronAPI.selectDirectory();
    if (!dirResult.success || !dirResult.data) return;

    setExportQRProgress({ current: 0, total: filteredData.length, isOpen: true });

    const qrSize = 380;
    const padding = 40;
    const nameAreaHeight = 80;

    for (let i = 0; i < filteredData.length; i++) {
      const member = filteredData[i];
      try {
        const qrDataUrl = await QRCode.toDataURL(member.qrId, { 
          margin: 1, 
          width: qrSize, 
          color: { dark: '#111827', light: '#ffffff' } 
        });
        
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = qrSize + padding * 2;
        outputCanvas.height = qrSize + padding * 2 + nameAreaHeight;
        const ctx = outputCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
        
        ctx.shadowColor = 'rgba(0,0,0,0.07)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(padding - 10, padding - 10, qrSize + 20, qrSize + 20, 14);
        ctx.fill();
        ctx.shadowBlur = 0;

        const img = new Image();
        img.src = qrDataUrl;
        await new Promise(r => { img.onload = r; });
        ctx.drawImage(img, padding, padding);

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, qrSize + padding + 18);
        ctx.lineTo(qrSize + padding, qrSize + padding + 18);
        ctx.stroke();

        ctx.fillStyle = '#111827';
        ctx.font = `bold ${Math.round(qrSize * 0.07)}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(member.name, outputCanvas.width / 2, qrSize + padding + 46);

        ctx.fillStyle = '#6b7280';
        ctx.font = `${Math.round(qrSize * 0.045)}px "Courier New", monospace`;
        ctx.fillText(member.qrId, outputCanvas.width / 2, qrSize + padding + 68);

        const safeName = member.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-') || `jemaat-${member.qrId}`;
        const finalDataUrl = outputCanvas.toDataURL('image/png');
        const filepath = `${dirResult.data}\\QR-${safeName}.png`;
        
        await window.electronAPI.saveBase64Image(filepath, finalDataUrl);
      } catch (e) {
        console.error('Error generating QR for', member.name, e);
      }
      setExportQRProgress({ current: i + 1, total: filteredData.length, isOpen: true });
    }

    setTimeout(() => {
      setExportQRProgress({ current: 0, total: 0, isOpen: false });
      alert('Export QR Code massal berhasil!');
    }, 500);
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900 bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Database Jemaat</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleExportQRCodes} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8f213e] text-[#8f213e] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <QrCode className="w-4 h-4" /> Export QR
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8f213e] text-[#8f213e] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Upload className="w-4 h-4" /> Export XLSX
          </button>
          <button onClick={handleImportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8f213e] text-[#8f213e] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Import Data
          </button>
          <button onClick={() => openModal('add')} className="flex items-center gap-2 px-4 py-2 bg-[#8f213e] text-white rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Tambah Jemaat
          </button>
        </div>
      </div>

      {/* Modal Progress Export QR */}
      {exportQRProgress.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 flex flex-col items-center">
            <QrCode className="w-12 h-12 text-[#8f213e] mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mengekspor QR Code...</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">Tunggu sebentar, sedang menyimpan gambar QR Code ke folder yang dipilih.</p>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
              <div 
                className="bg-[#8f213e] h-3 rounded-full transition-all duration-300" 
                style={{ width: `${(exportQRProgress.current / exportQRProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm font-medium text-gray-700">{exportQRProgress.current} dari {exportQRProgress.total} diekspor</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, QR ID, atau No HP..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow bg-white text-gray-700" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm cursor-pointer">
          <option value="Semua">Semua Kategori</option>
          <option value="Jemaat">Jemaat</option>
          <option value="Guest">Guest</option>
        </select>
        <select value={filterKomsel} onChange={(e) => setFilterKomsel(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm cursor-pointer">
          <option value="Semua">Semua Komsel</option>
          <option value="belum-kc">Belum ber-KC</option>
          {komselList.map(k => (
            <option key={k.id} value={String(k.id)}>{k.nama_komsel}</option>
          ))}
        </select>
        <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm cursor-pointer">
          <option value="Semua Bulan">Semua Bulan</option>
          {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama Lengkap</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">L/P</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No. HP</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tgl Lahir</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tgl Nikah</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tgl Baptis</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Kategori</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Komsel</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Catatan</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody 
              ref={tableBodyRef}
              className="divide-y divide-gray-100"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = Math.min(focusedRowIndex + 1, filteredData.length - 1);
                  setFocusedRowIndex(next);
                  (tableBodyRef.current?.children[next] as HTMLElement)?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prev = Math.max(focusedRowIndex - 1, 0);
                  setFocusedRowIndex(prev);
                  (tableBodyRef.current?.children[prev] as HTMLElement)?.focus();
                }
              }}
            >
              {filteredData.map((row, idx) => (
                <tr 
                  key={row.id} 
                  tabIndex={0}
                  className={`transition-colors outline-none ${
                    focusedRowIndex === idx 
                      ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-200' 
                      : 'hover:bg-gray-50/50'
                  }`}
                  onFocus={() => setFocusedRowIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal('edit', row); }
                    else if (e.key === 'Delete') { e.preventDefault(); setItemToDelete(row); }
                  }}
                >
                  <td className="py-3 px-4 text-sm text-gray-600 font-mono whitespace-nowrap">{row.qrId}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setSelectedDetailData(row)}>
                      <img
                        src={row.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=8f213e&color=fff`}
                        alt={row.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 shadow-sm group-hover:ring-2 group-hover:ring-[#8f213e] transition-all"
                      />
                      <div>
                        <span className="group-hover:text-[#8f213e] group-hover:underline transition-colors whitespace-nowrap">{row.name}</span>
                        {row.pronouns && <span className="ml-1 text-xs text-gray-400">({row.pronouns})</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{row.gender || '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{row.phone}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                    {row.dob && row.dob !== '-'
                      ? new Date(row.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                    {row.tanggal_nikah
                      ? new Date(row.tanggal_nikah).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                    {row.tanggal_baptis
                      ? new Date(row.tanggal_baptis).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      row.category === 'Jemaat' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-[#cca353]/10 text-[#cca353] border-[#cca353]/30'
                    }`}>{row.category}</span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {row.category === 'Jemaat' ? (
                      row.nama_komsel ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-700 bg-white shadow-sm whitespace-nowrap">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.kode_warna || '#6B7280' }} />
                          {row.nama_komsel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 bg-gray-50 whitespace-nowrap">Belum ber-KC</span>
                      )
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-[180px]">
                    {row.catatan
                      ? <span className="block truncate text-gray-600" title={row.catatan}>{row.catatan}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-1">
                      {row.category === 'Jemaat' ? (
                        <button onClick={() => setSelectedMemberForQR(row)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="Lihat QR">
                          <QrCode className="w-4 h-4" />
                        </button>
                      ) : (<div className="w-7 h-7" />)}
                      <button onClick={() => openModal('edit', row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Data">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setItemToDelete(row)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus Data">
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

      {/* ===== Modal Tambah / Edit Jemaat ===== */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'add' ? 'Tambah Jemaat Baru' : 'Edit Data Jemaat'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Foto */}
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <div onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group">
                    {formPhoto ? (
                      <img src={formPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400 group-hover:text-gray-500" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className={labelClass}>Nama Lengkap</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukkan nama lengkap..." className={inputClass} />
              </div>

              {/* Pronouns + Kategori + Gender */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Sapaan</label>
                  <select value={formPronouns} onChange={(e) => setFormPronouns(e.target.value)} className={inputClass}>
                    <option value="">— Pilih Sapaan —</option>
                    <option value="Bapak">Bapak</option>
                    <option value="Ibu">Ibu</option>
                    <option value="Sdr/i">Sdr/i</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>L/P <span className="text-red-500">*</span></label>
                  <select value={formGender} onChange={(e) => setFormGender(e.target.value)} className={inputClass}>
                    <option value="">— Pilih —</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Kategori</label>
                  <div className="flex gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="kategori" value="Jemaat" checked={formCategory === 'Jemaat'} onChange={() => setFormCategory('Jemaat')} className="text-gray-900 focus:ring-gray-900" />
                      <span className="text-sm text-gray-700">Jemaat</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="kategori" value="Guest" checked={formCategory === 'Guest'} onChange={() => { setFormCategory('Guest'); setFormKomselId(null); }} className="text-gray-900 focus:ring-gray-900" />
                      <span className="text-sm text-gray-700">Guest</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* HP + Tgl Lahir */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>No. Handphone</label>
                  <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="08xx-xxxx-xxxx" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tanggal Lahir</label>
                  <input type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)}
                    max="9999-12-31" className={inputClass} />
                </div>
              </div>

              {/* Tgl Nikah + Tgl Baptis */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tanggal Nikah <span className="text-gray-400 font-normal">(opsional)</span></label>
                  <input type="date" value={formTanggalNikah} onChange={(e) => setFormTanggalNikah(e.target.value)}
                    max="9999-12-31" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tanggal Baptis <span className="text-gray-400 font-normal">(opsional)</span></label>
                  <input type="date" value={formTanggalBaptis} onChange={(e) => setFormTanggalBaptis(e.target.value)}
                    max="9999-12-31" className={inputClass} />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className={labelClass}>Alamat</label>
                <textarea rows={2} value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap..." className={`${inputClass} resize-none`} />
              </div>

              {/* Komsel — hanya tampil untuk Jemaat */}
              {formCategory === 'Jemaat' && (
                <div>
                  <label className={labelClass}>Komsel</label>
                  <select
                    value={formKomselId !== null ? String(formKomselId) : ''}
                    onChange={(e) => {
                      if (e.target.value === 'add_new') {
                        setIsKomselModalOpen(true);
                      } else {
                        setFormKomselId(e.target.value ? Number(e.target.value) : null);
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">— Belum ber-KC —</option>
                    {komselList.map(k => (
                      <option key={k.id} value={String(k.id)}>{k.nama_komsel}</option>
                    ))}
                    <option value="add_new">+ Tambah Komsel Baru...</option>
                  </select>
                </div>
              )}

              {/* Catatan */}
              <div>
                <label className={labelClass}>Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
                <textarea rows={2} value={formCatatan} onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Catatan tambahan..." className={`${inputClass} resize-none`} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button onClick={handleSimpan} disabled={isSaveDisabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSaveDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#8f213e] text-white hover:bg-[#7a1c35] shadow-sm'}`}>
                {modalMode === 'add' ? 'Simpan' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Tambah Komsel Baru (Nested) ===== */}
      {isKomselModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Tambah Komsel Baru</h3>
              <button onClick={() => { setIsKomselModalOpen(false); }} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Nama Komsel</label>
                <input type="text" value={newKomselName} onChange={(e) => setNewKomselName(e.target.value)}
                  placeholder="Contoh: Komsel Epsilon..." className={inputClass} autoFocus />
              </div>
              <div>
                <label className={labelClass}>Warna Label</label>
                <div className="flex items-center gap-4">
                  <input type="color" value={newKomselColor} onChange={(e) => setNewKomselColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1 bg-white" />
                  <div className="flex flex-wrap gap-2">
                    {['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899','#F97316','#06B6D4'].map(c => (
                      <button key={c} onClick={() => setNewKomselColor(c)} title={c}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${newKomselColor === c ? 'border-gray-800 scale-110' : 'border-white shadow'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: newKomselColor }} />
                  <span className="text-sm text-gray-500 font-mono">{newKomselColor}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => { setIsKomselModalOpen(false); }}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button onClick={handleAddKomsel} disabled={!newKomselName.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!newKomselName.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#8f213e] text-white hover:bg-[#7a1c35] shadow-sm'}`}>
                Simpan Komsel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
      {selectedMemberForQR && (
        <QRGenerator member={selectedMemberForQR} onClose={() => setSelectedMemberForQR(null)} />
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
              <button onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Batal</button>
              <button onClick={confirmDelete}
                className="px-4 py-2 bg-[#8f213e] text-white rounded-lg text-sm font-medium hover:bg-[#7a1c35] transition-colors">Ya, Hapus</button>
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
                <img src={selectedDetailData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDetailData.name)}&background=8f213e&color=fff&size=256`}
                  alt={selectedDetailData.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center">
                {selectedDetailData.pronouns && <span className="text-gray-500 font-normal mr-1">{selectedDetailData.pronouns}</span>}
                {selectedDetailData.name}
              </h3>
              <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                selectedDetailData.category === 'Jemaat' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-[#cca353]/10 text-[#cca353] border-[#cca353]/30'
              }`}>{selectedDetailData.category}</span>

              <div className="w-full mt-5 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ID / QR Code</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 py-1.5 px-3 rounded border border-gray-100">{selectedDetailData.qrId}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Jenis Kelamin</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedDetailData.gender === 'L' ? 'Laki-laki' : selectedDetailData.gender === 'P' ? 'Perempuan' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">No. Handphone</p>
                  <p className="text-sm text-gray-900 font-medium">{selectedDetailData.phone}</p>
                </div>
                {selectedDetailData.category === 'Jemaat' && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Komsel</p>
                    {selectedDetailData.nama_komsel ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border border-gray-200 text-gray-700 bg-white">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedDetailData.kode_warna || '#6B7280' }} />
                        {selectedDetailData.nama_komsel}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Belum ber-KC</span>
                    )}
                  </div>
                )}
                {selectedDetailData.catatan && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Catatan</p>
                    <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg p-2">{selectedDetailData.catatan}</p>
                  </div>
                )}
              </div>

              <button onClick={() => setSelectedDetailData(null)}
                className="mt-6 w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
