export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string;
  employeeId?: string;
}

export type SessionStatus = 'active' | 'completed';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
}

export interface GeneratedDocument {
  id: string;
  templateType: string;
  type: string; // "Site Assessment", "Maintenance Checklist", etc.
  createdAt: string;
  pdfUrl: string; // mock url
}

export interface Session {
  id: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationSeconds: number;
  status: SessionStatus;
  notes?: string;
  documents: GeneratedDocument[];
  signature?: string; // mock signature data/url
  signedAt?: string;
  route: LocationPoint[];
}

export interface AppState {
  // User State
  user: User | null;
  isLoggedIn: boolean;
  isInitializingAuth: boolean;
  initializeAuth: () => Promise<void>;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  availability: any[];
  setAvailability: (slots: any[]) => void;

  // Live data from shared database
  clients: any[];
  availableServices: any[];
  fetchFromDB: () => Promise<void>;

  // Session State
  activeSession: Session | null;
  completedSessions: Session[];
  isClockedIn: boolean;
  clockInRecord: { time: string; location: string } | null;
  setClockedIn: (status: boolean, record?: { time: string; location: string }) => void;

  // Actions
  startSession: (arg1: any, arg2?: string, arg3?: string) => void;
  updateActiveSession: (updates: Partial<Session>) => void;
  updateSessionNotes: (sessionId: string, notes: string) => void;

  // Document Management
  addDocumentToSession: (doc: GeneratedDocument) => void;
  addDocument: (doc: GeneratedDocument) => void;
  removeDocument: (sessionId: string, docId: string) => void;

  completeSession: (signature: string) => void;
  endSession: () => void;

  // GPS
  isGPSActive: boolean;
  currentLocation: LocationPoint | null;
  updateLocation: (point: LocationPoint) => void;
  toggleGPS: (active: boolean) => void;

  // Settings
  showCoordinates: boolean;
  toggleShowCoordinates: (show: boolean) => void;

  isDarkMode: boolean;
  toggleDarkMode: (enabled: boolean) => void;

  notificationsEnabled: boolean;
  toggleNotifications: (enabled: boolean) => void;
}
