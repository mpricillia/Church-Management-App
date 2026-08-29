export {};

declare module '*.png' {
  const source: string;
  export default source;
}

declare global {
  interface Window {
    electronAPI: {
      getEvents: () => Promise<any[]>;
      saveEvents: (events: any[]) => Promise<boolean>;
      getJemaat: () => Promise<any[]>;
      saveJemaat: (jemaat: any[]) => Promise<boolean>;
      getAttendance: (eventId: string) => Promise<any[]>;
      saveAttendance: (eventId: string, attendance: any[]) => Promise<boolean>;
      getAllAttendance: () => Promise<any[]>;
      verifyPassword: (password: string) => Promise<boolean>;
      login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
      verifyPin: (credentials: { username: string; pin: string }) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      lockEvent: (eventId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      unlockEvent: (eventId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      getAllEvents: (filters?: { from?: string; to?: string }) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      getUpcomingEvents: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      createEvent: (event: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      updateEvent: (eventId: string, event: any) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      deleteEvent: (eventId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      scanAttendance: (payload: { event_id: string; qr_code_id: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
      manualAddAttendance: (payload: { event_id: string; jemaat_id: number }) => Promise<{ success: boolean; data?: any; error?: string }>;
      getEventSummary: (eventId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      getJemaatHistory: (jemaatId: number) => Promise<{ success: boolean; data?: any; error?: string }>;
      getMonthlyRecap: (month: number, year: number) => Promise<{ success: boolean; data?: any; error?: string }>;
      getAllJemaat: (filters?: { search?: string; category?: string; birthMonth?: string | number }) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      createJemaat: (member: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      updateJemaat: (id: number, member: any) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      deleteJemaat: (id: number) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      exportJemaat: (filters?: { category?: string; birthMonth?: string | number }) => Promise<{ success: boolean; data?: { filePath?: string; totalExported?: number; cancelled?: boolean }; error?: string }>;
      importJemaat: () => Promise<{ success: boolean; data?: { totalInserted?: number; totalUpdated?: number; errors?: string[]; cancelled?: boolean }; error?: string }>;
      exportBackup: () => Promise<{ success: boolean; data?: { filePath?: string; cancelled?: boolean }; error?: string }>;
      importBackup: () => Promise<{ success: boolean; data?: { cancelled?: boolean }; error?: string }>;
    };
  }
}
