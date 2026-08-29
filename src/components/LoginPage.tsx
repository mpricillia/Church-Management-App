import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import Logo from '../assets/logo.png';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) {
      setError('Aplikasi harus dijalankan melalui Electron.');
      return;
    }
    const result = await window.electronAPI.login({ username, password });
    if (result.success) {
      setError('');
      onLoginSuccess();
    } else {
      setError('Username atau Password salah.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-10 border border-gray-100 flex flex-col">
        <div className="text-center mb-8">
          <img src={Logo} alt="Logo" className="h-24 w-auto object-contain mx-auto mb-6" />
          <p className="text-sm text-gray-500">Masuk untuk mengelola sistem kehadiran.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8f213e] transition-shadow bg-white text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8f213e] transition-shadow bg-white text-gray-900"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#8f213e] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#7a1c35] transition-colors shadow-sm"
          >
            Masuk Sistem
          </button>
        </form>
      </div>
    </div>
  );
}
