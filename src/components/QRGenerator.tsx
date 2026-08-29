import { useRef, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Printer, X, Download, ArrowLeft } from 'lucide-react';
import CardFront from '../assets/card-front.png';
import CardBack from '../assets/card-back.png';

interface Member {
  id: number;
  qrId: string;
  name: string;
  phone: string;
  category: string;
  dob?: string;
  address?: string;
  photo?: string;
}

interface QRGeneratorProps {
  member: Member;
  onClose: () => void;
}

export default function QRGenerator({ member, onClose }: QRGeneratorProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const formatDate = (dob?: string) => {
    if (!dob || dob === '-') return '-';
    try {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return dob;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dob;
    }
  };

  const handleDownloadQR = (): Promise<void> => {
    return new Promise((resolve) => {
      const qrCanvas = qrCanvasRef.current;
      if (!qrCanvas) { resolve(); return; }

      const qrSize = qrCanvas.width;
      const padding = 40;
      const nameAreaHeight = 80;

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = qrSize + padding * 2;
      outputCanvas.height = qrSize + padding * 2 + nameAreaHeight;
      const ctx = outputCanvas.getContext('2d')!;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      ctx.shadowColor = 'rgba(0,0,0,0.07)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(padding - 10, padding - 10, qrSize + 20, qrSize + 20, 14);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.drawImage(qrCanvas, padding, padding);

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

      const safeName = member.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-') || 'jemaat';
      const link = document.createElement('a');
      link.download = `qr-${safeName}.png`;
      link.href = outputCanvas.toDataURL('image/png');
      link.click();
      resolve();
    });
  };

  const handleSendWA = async () => {
    await handleDownloadQR();
    const digits = (member.phone || '').replace(/\D/g, '');
    let waNumber = digits;
    if (digits.startsWith('0')) waNumber = '62' + digits.slice(1);
    else if (!digits.startsWith('62')) waNumber = '62' + digits;

    const message = encodeURIComponent(
      `Shalom ${member.name}! 👋\n\nBerikut QR Code kamu untuk absensi GBI ROCK Lumajang.\nSimpan dan tunjukkan ke petugas scanner saat hadir ibadah/event. ☺️\n\nID: *${member.qrId}*`
    );
    setTimeout(() => window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank'), 700);
  };

  const renderCard = (forPrint: boolean) => (
    <div className={`w-full mx-auto ${forPrint ? 'hidden print:block max-w-[1014px]' : 'print:hidden max-w-2xl'}`}>
      
      {/* Sisi Depan */}
      <div className="mb-2 text-xs font-bold text-gray-500 tracking-wider uppercase print:hidden">Sisi Depan</div>
      <div className={`relative w-full ${forPrint ? 'mb-8' : 'mb-8 shadow-md rounded-xl overflow-hidden'}`} style={{ aspectRatio: '1014/567', pageBreakAfter: forPrint ? 'always' : 'auto' }}>
        <img src={CardFront} alt="Depan" className="absolute inset-0 w-full h-full object-fill" />
        
        {/* Foto */}
        <div className="absolute overflow-hidden bg-gray-900" style={{ left: '5.9%', top: '29.6%', width: '28.1%', height: '59.9%', borderRadius: forPrint ? '34px' : '20px' }}>
          <img src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a1a1a&color=fff&size=400`} className="w-full h-full object-cover" />
        </div>

        {/* Teks Data Jemaat */}
        <div className="absolute flex flex-col justify-between" style={{ left: '57%', top: '42.8%', width: '38%', height: '33%', fontSize: forPrint ? '18px' : 'clamp(10px, 1.8vw, 16px)', color: '#ffffff' }}>
          <div style={{ fontWeight: 700 }}>{member.name}</div>
          <div style={{ fontWeight: 700 }}>{member.qrId}</div>
          <div style={{ fontWeight: 500 }}>{formatDate(member.dob)}</div>
          <div style={{ fontWeight: 500, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {member.address || '-'}
          </div>
        </div>
      </div>

      {/* Sisi Belakang */}
      <div className="mb-2 text-xs font-bold text-gray-500 tracking-wider uppercase print:hidden">Sisi Belakang</div>
      <div className={`relative w-full ${forPrint ? '' : 'shadow-md rounded-xl overflow-hidden'}`} style={{ aspectRatio: '1014/567' }}>
        <img src={CardBack} alt="Belakang" className="absolute inset-0 w-full h-full object-fill" />
        
        {/* Kotak QR Code */}
        <div className="absolute bg-white flex items-center justify-center rounded-[24px]" style={{ right: '15.2%', top: '29%', width: '23.8%', aspectRatio: '1/1', padding: '1.5%' }}>
          <QRCodeSVG value={member.qrId} size={1000} level="M" includeMargin={false} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0">
      
      {/* =========================================================================
          UI MODE: PREVIEW CETAK (Overview layar penuh sebelum ke printer)
          ========================================================================= */}
      {showPreview && (
        <div className="bg-gray-100/90 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh] print:hidden">
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-bold text-gray-900">Print Preview</h3>
            </div>
            <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm">
              <Printer className="w-4 h-4" /> Cetak Sekarang
            </button>
          </div>
          
          <div className="overflow-y-auto p-6 lg:p-10 flex-1">
            {renderCard(false)}
          </div>
        </div>
      )}

      {/* =========================================================================
          UI MODE: DEFAULT QR SIMPLE (Kecil, Rapi)
          ========================================================================= */}
      {!showPreview && (
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 overflow-hidden flex flex-col print:hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h3 className="text-lg font-bold text-gray-900">QR Code Jemaat</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <QRCodeSVG value={member.qrId} size={220} level="M" includeMargin={false} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">{member.name}</h2>
            <p className="text-gray-500 font-mono mt-2 bg-gray-200/70 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide">
              {member.qrId}
            </p>
          </div>

          <div className="p-6 pt-0 bg-gray-50/50 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDownloadQR} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={handleSendWA} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#1ebd5a] transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg> WA
              </button>
            </div>
            <button onClick={() => setShowPreview(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm">
              <Printer className="w-4 h-4" /> Cetak Kartu Fisik
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT ONLY AREA - Tampilan ini HANYA terlihat saat ke printer/PDF 
          ========================================================================= */}
      {renderCard(true)}
      {/* ========================================================================= */}

      <div className="absolute opacity-0 pointer-events-none" style={{ left: '-9999px' }} aria-hidden="true">
        <QRCodeCanvas ref={qrCanvasRef} value={member.qrId} size={480} level="M" includeMargin={false} />
      </div>
    </div>
  );
}
