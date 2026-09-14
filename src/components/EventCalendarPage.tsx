import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User, Pencil, Trash2, X, MapPin } from 'lucide-react';

export default function EventCalendarPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);

  // Calendar State
  const today = new Date();
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Dummy Event Data
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      if (window.electronAPI) {
        const result = await window.electronAPI.getAllEvents();
        if (result.success) setEvents(result.data || []);
        return;
      }
      
      const saved = localStorage.getItem('mock_event_data');
      if (saved) {
        try {
          setEvents(JSON.parse(saved));
          return;
        } catch(e) {}
      }
      
      setEvents([]);
    };
    loadEvents();
  }, []);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSpeaker, setFormSpeaker] = useState('');

  const handleSimpan = async () => {
    let updatedEvents: any[];

    if (editEventId) {
      // MODE EDIT: update field tanpa ganti ID
      updatedEvents = events.map(ev => {
        if (ev.id !== editEventId) return ev;
        const dateFormatted = formDate
          ? new Date(formDate).toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })
          : ev.dateFormatted;
        return {
          ...ev,
          name: formName,
          date: formDate,
          dateFormatted,
          time: formTime,
          location: formLocation,
          speaker: formSpeaker,
        };
      });
    } else {
      // MODE TAMBAH BARU: generate ID dengan auto-increment
      let lastNum = 0;
      events.forEach(ev => {
        const match = ev.id.match(/#EV-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > lastNum) lastNum = num;
        }
      });
      const newId = `#EV-${String(lastNum + 1).padStart(3, '0')}`;
      const dateFormatted = formDate
        ? new Date(formDate).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })
        : '';
      const newEvent = {
        id: newId,
        name: formName,
        date: formDate,
        dateFormatted,
        time: formTime,
        location: formLocation,
        speaker: formSpeaker,
        is_locked: false,
      };
      updatedEvents = [...events, newEvent];
    }

    if (window.electronAPI) {
      const result = editEventId
        ? await window.electronAPI.updateEvent(editEventId, updatedEvents.find(event => event.id === editEventId))
        : await window.electronAPI.createEvent(updatedEvents[updatedEvents.length - 1]);
      if (!result.success) {
        alert(result.error || 'Gagal menyimpan event.');
        return;
      }
      setEvents(updatedEvents);
    } else {
      setEvents(updatedEvents);
      localStorage.setItem('mock_event_data', JSON.stringify(updatedEvents));
    }

    // Reset form & state
    setFormName('');
    setFormDate('');
    setFormTime('');
    setFormLocation('');
    setFormSpeaker('');
    setEditEventId(null);
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEventToDelete(eventId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    if (window.electronAPI) {
      const result = await window.electronAPI.deleteEvent(eventToDelete);
      if (!result.success) {
        alert(result.error || 'Event tidak dapat dihapus.');
        return;
      }
      setEvents(events.filter(event => event.id !== eventToDelete));
    } else {
      const updatedEvents = events.filter(event => event.id !== eventToDelete);
      setEvents(updatedEvents);
      localStorage.setItem('mock_event_data', JSON.stringify(updatedEvents));
    }
    setIsDeleteModalOpen(false);
    setEventToDelete(null);
    setIsDetailModalOpen(false);
    setSelectedEventDetail(null);
  };

  const openModal = (mode: 'add' | 'edit') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleEditClick = (event: any) => {
    // Pre-fill form dengan data event yang dipilih
    setFormName(event.name);
    setFormDate(event.date);
    setFormTime(event.time);
    setFormLocation(event.location);
    setFormSpeaker(event.speaker);
    // Tandai mode edit
    setEditEventId(event.id);
    setModalMode('edit');
    setIsModalOpen(true);
    // Tutup detail modal jika terbuka
    setIsDetailModalOpen(false);
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  // Calculate Year Range for Years View (decade chunks)
  const startYear = Math.floor(currentYear / 12) * 12;
  const yearsRange = Array.from({ length: 12 }, (_, i) => startYear + i);

  // Dynamic Header Title
  let headerTitle = '';
  if (viewMode === 'days') headerTitle = `${monthNames[currentMonth]} ${currentYear}`;
  if (viewMode === 'months') headerTitle = `${currentYear}`;
  if (viewMode === 'years') headerTitle = `${yearsRange[0]} - ${yearsRange[yearsRange.length - 1]}`;

  // Handle Navigation
  const handlePrev = () => {
    if (viewMode === 'days') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else if (viewMode === 'months') {
      setCurrentYear((y) => y - 1);
    } else if (viewMode === 'years') {
      setCurrentYear((y) => y - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    } else if (viewMode === 'months') {
      setCurrentYear((y) => y + 1);
    } else if (viewMode === 'years') {
      setCurrentYear((y) => y + 12);
    }
  };

  const handleHeaderClick = () => {
    if (viewMode === 'days') setViewMode('months');
    else if (viewMode === 'months') setViewMode('years');
  };

  // Calendar Visual Data Generation for Days View
  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  // Calculate first day of the month
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const emptyCells = Array(firstDay).fill(null);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...emptyCells, ...daysArray];
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header & Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Event & Kalender</h2>
        <button 
          onClick={() => openModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Event
        </button>
      </div>

      {/* Main Content (Grid 2 Kolom) */}
      <div className="flex gap-8 flex-1 items-start min-h-0">
        {/* Kolom Kiri (Visual Kalender Interaktif) */}
        <div className="flex-[3] bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col min-w-[500px] h-auto min-h-fit">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={handleHeaderClick}
              className={`text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors ${viewMode === 'years' ? 'cursor-default hover:text-gray-900' : 'cursor-pointer'}`}
            >
              {headerTitle}
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrev}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNext}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Body */}
          <div className="flex-1 flex flex-col">
            {/* --- DAYS VIEW --- */}
            {viewMode === 'days' && (
              <>
                <div className="grid grid-cols-7 mb-4">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-400">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 flex-1 rounded-lg overflow-hidden">
                  {calendarCells.map((day, index) => {
                    const cellDateFormatted = day ? `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` : '';
                    const dayEvents = day ? events.filter(e => e.date === cellDateFormatted) : [];

                    return (
                      <div key={index} className="bg-white min-h-[110px] p-2 flex flex-col transition-colors hover:bg-gray-50">
                        {day && (
                          <>
                            <div className="flex justify-end mb-2">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                                day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear() 
                                  ? 'bg-gray-900 text-white shadow-sm' 
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}>
                                {day}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                              {dayEvents.map(evt => (
                                <button 
                                  key={evt.id}
                                  onClick={() => {
                                    setSelectedEventDetail(evt);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="text-left w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-md text-xs transition-colors group/event"
                                >
                                  <div className="font-semibold truncate">{evt.time}</div>
                                  <div className="truncate opacity-90 group-hover/event:opacity-100">{evt.name}</div>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* --- MONTHS VIEW --- */}
            {viewMode === 'months' && (
              <div className="grid grid-cols-3 gap-4 flex-1 content-center">
                {monthNames.map((month, index) => (
                  <button 
                    key={month} 
                    onClick={() => {
                      setCurrentMonth(index);
                      setViewMode('days');
                    }}
                    className={`py-6 rounded-xl text-sm font-medium transition-colors ${
                      index === currentMonth 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            {/* --- YEARS VIEW --- */}
            {viewMode === 'years' && (
              <div className="grid grid-cols-3 gap-4 flex-1 content-center">
                {yearsRange.map((year) => (
                  <button 
                    key={year} 
                    onClick={() => {
                      setCurrentYear(year);
                      setViewMode('months');
                    }}
                    className={`py-6 rounded-xl text-sm font-medium transition-colors ${
                      year === currentYear 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan (Daftar Event Mendatang) */}
        <div className="flex-[2] flex flex-col shrink-0 min-w-[350px] sticky top-0">
          <h3 className="text-base font-semibold text-gray-900 mb-4 px-1">Event Mendatang</h3>
          <div className="space-y-4 pb-4">
            {[...events]
              .filter((event) => {
                const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                const maxDate = todayMidnight + 7 * 24 * 60 * 60 * 1000;
                const eventTime = new Date(event.date).getTime();
                return eventTime >= todayMidnight && eventTime <= maxDate;
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative group hover:shadow-md transition-shadow">
                {/* Action Buttons (Hover) */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditClick(event); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Content */}
                <span className="text-xs font-mono text-gray-400 mb-2 block">{event.id}</span>
                <h4 className="text-lg font-bold text-gray-900 mb-4">{event.name}</h4>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{event.dateFormatted}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{event.speaker}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {isDetailModalOpen && selectedEventDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsDetailModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Detail Event</h3>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 mb-4">
                {selectedEventDetail.id}
              </span>
              <h4 className="text-2xl font-bold text-gray-900 mb-6">{selectedEventDetail.name}</h4>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                    <Calendar className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tanggal</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedEventDetail.dateFormatted}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                    <Clock className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Jam</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedEventDetail.time}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                    <MapPin className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Lokasi</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedEventDetail.location}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pembicara</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedEventDetail.speaker}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
              <button 
                onClick={() => handleDeleteEvent(selectedEventDetail.id)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Event
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleEditClick(selectedEventDetail)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulasi Modal Form (CRUD Event) */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'add' ? 'Tambah Event Baru' : 'Edit Event'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Event</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Ibadah Raya 1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
                  <input 
                    type="date" 
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Jam</label>
                  <input 
                    type="time" 
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokasi</label>
                  <input 
                    type="text" 
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Ruangan / Hall"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pembicara</label>
                  <input 
                    type="text" 
                    value={formSpeaker}
                    onChange={(e) => setFormSpeaker(e.target.value)}
                    placeholder="Nama Pembicara"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow text-gray-900"
                  />
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
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Hapus Event?</h3>
            <p className="text-gray-600 mb-6">Apakah Anda yakin ingin menghapus event ini? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-[#8f213e] text-white rounded-lg hover:bg-opacity-90"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
