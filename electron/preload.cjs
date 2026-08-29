const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Events
  getEvents: () => ipcRenderer.invoke('get-events'),
  saveEvents: (events) => ipcRenderer.invoke('save-events', events),
  
  // Jemaat
  getJemaat: () => ipcRenderer.invoke('get-jemaat'),
  saveJemaat: (jemaat) => ipcRenderer.invoke('save-jemaat', jemaat),
  
  // Attendance
  getAttendance: (eventId) => ipcRenderer.invoke('get-attendance', eventId),
  saveAttendance: (eventId, attendance) => ipcRenderer.invoke('save-attendance', eventId, attendance),
  getAllAttendance: () => ipcRenderer.invoke('get-all-attendance'),
  
  // Auth
  verifyPassword: (password) => ipcRenderer.invoke('verify-password', password),
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  verifyPin: (credentials) => ipcRenderer.invoke('auth:verifyPin', credentials),
  lockEvent: (eventId) => ipcRenderer.invoke('event:lock', eventId),
  unlockEvent: (eventId) => ipcRenderer.invoke('event:unlock', eventId),
  getAllEvents: (filters) => ipcRenderer.invoke('event:getAll', filters),
  getUpcomingEvents: () => ipcRenderer.invoke('event:getUpcoming'),
  createEvent: (event) => ipcRenderer.invoke('event:create', event),
  updateEvent: (eventId, event) => ipcRenderer.invoke('event:update', eventId, event),
  deleteEvent: (eventId) => ipcRenderer.invoke('event:delete', eventId),
  scanAttendance: (payload) => ipcRenderer.invoke('attendance:scan', payload),
  manualAddAttendance: (payload) => ipcRenderer.invoke('attendance:manualAdd', payload),
  getEventSummary: (eventId) => ipcRenderer.invoke('report:getEventSummary', eventId),
  getJemaatHistory: (jemaatId) => ipcRenderer.invoke('report:getJemaatHistory', jemaatId),
  getMonthlyRecap: (month, year) => ipcRenderer.invoke('report:getMonthlyRecap', { month, year }),
  getAttendanceRanking: (startDate, endDate) => ipcRenderer.invoke('report:getAttendanceRanking', { startDate, endDate }),
  getAllJemaat: (filters) => ipcRenderer.invoke('jemaat:getAll', filters),
  createJemaat: (member) => ipcRenderer.invoke('jemaat:create', member),
  updateJemaat: (id, member) => ipcRenderer.invoke('jemaat:update', id, member),
  deleteJemaat: (id) => ipcRenderer.invoke('jemaat:delete', id),
  exportJemaat: (filters) => ipcRenderer.invoke('jemaat:exportExcel', filters),
  importJemaat: () => ipcRenderer.invoke('jemaat:importExcel'),
  exportBackup: () => ipcRenderer.invoke('app:exportBackup'),
  importBackup: () => ipcRenderer.invoke('app:importBackup'),
});
