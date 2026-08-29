import { useState } from 'react';
import { Scan, Users, CalendarDays, BarChart3, Settings, Trophy } from 'lucide-react';
import LiveScanPage from './LiveScanPage';
import JemaatTablePage from './JemaatTablePage';
import EventCalendarPage from './EventCalendarPage';
import LaporanPage from './LaporanPage';
import RankingPage from './RankingPage';
import SettingsPage from './SettingsPage';
import Logo from '../assets/logo.png';

export default function MainLayout() {
  const [activeMenu, setActiveMenu] = useState('Live Scan');

  const menuItems = [
    { id: 'Live Scan', icon: Scan, label: 'Live Scan' },
    { id: 'Data Jemaat', icon: Users, label: 'Data Jemaat' },
    { id: 'Event & Kalender', icon: CalendarDays, label: 'Event & Kalender' },
    { id: 'Laporan', icon: BarChart3, label: 'Laporan' },
    { id: 'Peringkat Kehadiran', icon: Trophy, label: 'Peringkat Kehadiran' },
    { id: 'Pengaturan', icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <img src={Logo} alt="Logo" className="h-16 w-auto object-contain mx-auto mb-4" />
        </div>
        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-[#8f213e] text-white font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#8f213e]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#cca353]' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-auto">
        <div className="p-8 h-full flex flex-col">
          {activeMenu === 'Live Scan' ? (
            <LiveScanPage />
          ) : activeMenu === 'Data Jemaat' ? (
            <JemaatTablePage />
          ) : activeMenu === 'Event & Kalender' ? (
            <EventCalendarPage />
          ) : activeMenu === 'Laporan' ? (
            <LaporanPage />
          ) : activeMenu === 'Peringkat Kehadiran' ? (
            <RankingPage />
          ) : activeMenu === 'Pengaturan' ? (
            <SettingsPage />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex items-center justify-center">
              <p className="text-gray-500 text-lg">
                Halaman <span className="font-semibold text-gray-700">{activeMenu}</span> akan ada di sini
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
