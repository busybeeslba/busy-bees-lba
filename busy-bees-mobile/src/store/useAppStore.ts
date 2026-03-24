import { create } from 'zustand';
import { AppState, Session, LocationPoint, User } from '../types';
import { fetchClients, fetchAvailableServices, createSession as dbCreateSession, updateSession as dbUpdateSession } from '../lib/db';


// Mock Initial Data
const MOCK_USER: User = {
    id: 'u1',
    name: 'Alex Bee',
    email: 'alex@busybees.com',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Bee&background=FFD700&color=000',
    phoneNumber: '+1 (555) 123-4567',
    employeeId: 'BB-1001',
};

// Helper for distance calculation
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export const useAppStore = create<AppState>((set, get) => ({
    user: null,
    isLoggedIn: false,
    activeSession: null,
    completedSessions: [],
    isGPSActive: false,
    currentLocation: null,
    showCoordinates: false, // Default off

    login: () => set({ user: MOCK_USER, isLoggedIn: true }),
    logout: () => set({ user: null, isLoggedIn: false, activeSession: null }),
    updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
    })),

    availability: [],
    setAvailability: (slots) => set({ availability: slots }),

    // ── Shared database data ──────────────────────────────────────────────────
    clients: [],
    availableServices: [],
    fetchFromDB: async () => {
        try {
            const [clients, services] = await Promise.all([
                fetchClients(),
                fetchAvailableServices(),
            ]);
            set({ clients, availableServices: services });
        } catch (err) {
            console.warn('[DB] Could not reach shared database:', err);
        }
    },

    // Unified startSession to handle both signatures (object or args) for compatibility
    startSession: (arg1: any, arg2?: string, arg3?: string) => {
        let clientId, clientName, serviceType, notes;
        if (typeof arg1 === 'object') {
            ({ clientName, serviceType, notes } = arg1);
            clientId = 'c1'; // Default
        } else {
            clientId = arg1;
            clientName = arg2;
            serviceType = arg3;
        }

        // Generate a random SES-XXXXXX ID (6 uppercase alphanumeric chars)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
        const randomPart = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const sessionId = `SES-${randomPart}`;

        const newSession: Session = {
            id: Date.now().toString(),
            clientId: clientId || 'c1',
            clientName: clientName || 'Unknown',
            serviceType: serviceType || 'General',
            startTime: new Date().toISOString(),
            durationSeconds: 0,
            status: 'active',
            documents: [],
            route: [],
            notes: notes || '',
        };
        set({ activeSession: { ...newSession, sessionId } as any, isGPSActive: true });

        // ✅ Persist to shared DB so the web app Session Summary can see it
        dbCreateSession({
            sessionId,
            clientId: newSession.clientId,
            clientName: newSession.clientName,
            serviceType: newSession.serviceType,
            startTime: newSession.startTime,
            durationSeconds: 0,
            status: 'active',
            documents: [],
            route: [],
            notes: newSession.notes || '',
            employeeName: get().user?.name || '',
            employeeId: get().user?.employeeId || '',
        }).then((saved: any) => {
            // Store the DB-assigned id so completeSession can PATCH it
            set(state => ({
                activeSession: state.activeSession
                    ? { ...state.activeSession, _dbId: saved.id }
                    : null,
            }));
        }).catch(() => { /* non-critical – app works offline */ });
    },

    updateSessionNotes: (sessionId: string, notes: string) => {
        set((state) => ({
            activeSession: state.activeSession ? { ...state.activeSession, notes } : null,
        }));
    },

    addDocument: (doc: any) => {
        set((state) => ({
            activeSession: state.activeSession
                ? { ...state.activeSession, documents: [...state.activeSession.documents, doc] }
                : null,
        }));
    },

    removeDocument: (sessionId: string, docId: string) => {
        set((state) => ({
            activeSession: state.activeSession
                ? { ...state.activeSession, documents: state.activeSession.documents.filter(d => d.id !== docId) }
                : null,
        }));
    },

    // Alias for compatibility
    endSession: () => get().completeSession(''),

    updateActiveSession: (updates) => {
        set((state) => ({
            activeSession: state.activeSession ? { ...state.activeSession, ...updates } : null,
        }));

        // ✅ Sync key fields to the shared DB — wait for _dbId if POST hasn't resolved yet
        const fieldsToSync = updates.clientName || updates.clientId || updates.serviceType || updates.notes !== undefined;
        if (!fieldsToSync) return;

        const patch: Record<string, any> = {};
        if (updates.clientName) patch.clientName = updates.clientName;
        if (updates.clientId) patch.clientId = updates.clientId;
        if (updates.serviceType) patch.serviceType = updates.serviceType;
        if (updates.notes !== undefined) patch.notes = updates.notes;

        // Retry up to 10 times (3 s total) in case the initial POST hasn't resolved yet
        let attempts = 0;
        const tryPatch = () => {
            const dbId = (get().activeSession as any)?._dbId;
            if (dbId) {
                dbUpdateSession(dbId, patch).catch(() => { /* non-critical */ });
            } else if (attempts < 10) {
                attempts++;
                setTimeout(tryPatch, 300);
            }
        };
        tryPatch();
    },

    addDocumentToSession: (doc) => {
        get().addDocument(doc);
    },

    completeSession: (signature) => {
        const { activeSession, completedSessions } = get();
        if (!activeSession) return;

        const endTime = new Date().toISOString();
        const startTimePayload = new Date(activeSession.startTime).getTime();
        const endTimePayload = new Date(endTime).getTime();
        const durationSeconds = Math.floor((endTimePayload - startTimePayload) / 1000);

        const completedSession: Session = {
            ...activeSession,
            endTime,
            durationSeconds,
            status: 'completed',
            signature,
            signedAt: endTime,
        };

        set({
            completedSessions: [completedSession, ...completedSessions],
            activeSession: null,
            isGPSActive: false,
        });

        // ✅ Update the shared DB record with final session data
        const dbId = (activeSession as any)._dbId;
        if (dbId) {
            dbUpdateSession(dbId, {
                endTime,
                durationSeconds,
                status: 'completed',
                notes: activeSession.notes || '',
                documents: activeSession.documents,
                employeeName: get().user?.name || '',
                employeeId: get().user?.employeeId || '',
                route: activeSession.route || [],
                // Look up the client status from the clients list
                clientStatus: (get().clients as any[]).find(
                    c => String(c.id) === activeSession.clientId?.replace('CLI-', '')
                )?.status || '',
            }).catch(() => { /* non-critical */ });
        }
    },

    updateLocation: (point) => {
        set((state) => {
            // Always update UI current location
            const newState = { currentLocation: point };

            if (!state.activeSession) return newState;

            // Smart Filter: Only add to route if distance > 10m
            const lastPoint = state.activeSession.route[state.activeSession.route.length - 1];
            if (lastPoint) {
                const dist = getDistanceFromLatLonInM(
                    lastPoint.latitude,
                    lastPoint.longitude,
                    point.latitude,
                    point.longitude
                );
                // If moved less than 30 meters, don't record point to history (filters Android drift)
                if (dist < 30) {
                    return { ...newState, activeSession: state.activeSession };
                }
            }

            return {
                ...newState,
                activeSession: {
                    ...state.activeSession,
                    route: [...state.activeSession.route, point],
                },
            };
        });
    },

    toggleGPS: (active) => set({ isGPSActive: active }),

    toggleShowCoordinates: (show) => set({ showCoordinates: show }),

    isDarkMode: false,
    toggleDarkMode: (enabled) => set({ isDarkMode: enabled }),

    notificationsEnabled: true,
    toggleNotifications: (enabled) => set({ notificationsEnabled: enabled }),
}));
