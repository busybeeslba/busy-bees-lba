/**
 * Shared Database API Helper — Mobile App
 *
 * This file is how the mobile app talks to the shared database.
 * The database runs at http://localhost:3001 on your computer.
 *
 * Think of each function here as a "question" or "instruction"
 * sent to the shared whiteboard:
 *   - GET  = "read from the whiteboard"
 *   - POST = "add something new to the whiteboard"
 *   - PATCH = "update something on the whiteboard"
 *   - DELETE = "erase something from the whiteboard"
 */

// The address of our shared database server
// On a real phone, replace 'localhost' with your computer's IP address (e.g. 192.168.2.25)
const DB_URL = 'http://192.168.2.25:3001';

// Helper: make a GET request (read data)
async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${DB_URL}${path}`);
    if (!res.ok) throw new Error(`DB GET failed: ${path}`);
    return res.json();
}

// Helper: make a POST request (add new data)
async function post<T>(path: string, body: object): Promise<T> {
    const res = await fetch(`${DB_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`DB POST failed: ${path}`);
    return res.json();
}

// Helper: make a PATCH request (update existing data)
async function patch<T>(path: string, body: object): Promise<T> {
    const res = await fetch(`${DB_URL}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`DB PATCH failed: ${path}`);
    return res.json();
}

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────

/** Get the full list of clients from the shared database */
export async function fetchClients() {
    return get<any[]>('/clients');
}

/** Get a single client by their ID */
export async function fetchClientById(id: string) {
    return get<any>(`/clients/${id}`);
}

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────

/** Get all completed sessions (all workers) */
export async function fetchAllSessions() {
    return get<any[]>('/sessions');
}

/** Get sessions for a specific worker */
export async function fetchSessionsByUser(userId: string) {
    return get<any[]>(`/sessions?userId=${userId}`);
}

/**
 * Save a completed session to the shared database.
 * This is called when a field worker finishes a job — the manager
 * will then be able to see it on the web dashboard.
 */
export async function saveCompletedSession(session: object) {
    return post<any>('/sessions', session);
}

/** Add an activity feed entry (e.g. "Alex started a session") */
export async function addActivityFeedEntry(entry: object) {
    return post<any>('/activity_feed', entry);
}

// ─────────────────────────────────────────────
// SCHEDULE
// ─────────────────────────────────────────────

/** Get schedule events for a specific worker */
export async function fetchScheduleByUser(userId: string) {
    return get<any[]>(`/schedule?userId=${userId}`);
}

/** Get the full schedule (all workers — for the web dashboard) */
export async function fetchAllSchedule() {
    return get<any[]>('/schedule');
}

// ─────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────

/** Save an availability slot for a worker */
export async function saveAvailability(availabilitySlot: object) {
    return post<any>('/availability', availabilitySlot);
}

/** Fetch all availability slots for a specific worker */
export async function fetchAvailabilityByUser(employeeId: string) {
    return get<any[]>(`/availability?employeeId=${employeeId}`);
}
