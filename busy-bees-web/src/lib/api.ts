/**
 * Shared Database API Helper — Web App
 *
 * This file is how the web dashboard talks to the shared database.
 * The database runs at http://localhost:3011.
 */

import { dbClient } from './dbClient';

// Helper: make a GET request (read data)
async function get<T>(path: string): Promise<T> {
    return await dbClient.get(path) as T;
}

// Helper: make a POST request (add new data)
async function post<T>(path: string, body: object): Promise<T> {
    return await dbClient.post(path, body) as T;
}

// Helper: make a PATCH request (update existing data)
async function patch<T>(path: string, body: object): Promise<T> {
    return await dbClient.patch(path, body) as T;
}

// ─────────────────────────────────────────────
// EMPLOYEES / USERS
// ─────────────────────────────────────────────

/** Get all employees (shown on the employees page) */
export async function fetchAllUsers() {
    return get<any[]>('/users');
}

/** Get only field workers (not supervisors) */
export async function fetchFieldWorkers() {
    return get<any[]>('/users?role=field_worker');
}

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────

/** Get all clients */
export async function fetchAllClients() {
    return get<any[]>('/clients');
}

/** Get only active clients */
export async function fetchActiveClients() {
    return get<any[]>('/clients?status=active');
}

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────

/** Get all sessions (completed jobs) — shown on the dashboard */
export async function fetchAllSessions() {
    return get<any[]>('/sessions');
}

/** Get sessions for a specific worker (for filtering by employee) */
export async function fetchSessionsByUser(userId: string) {
    return get<any[]>(`/sessions?userId=${userId}`);
}

// ─────────────────────────────────────────────
// ACTIVITY FEED
// ─────────────────────────────────────────────

/** Get recent activity feed entries for the dashboard */
export async function fetchActivityFeed() {
    return get<any[]>('/activity_feed?_sort=time&_order=desc&_limit=10');
}

// ─────────────────────────────────────────────
// SCHEDULE
// ─────────────────────────────────────────────

/** Get all scheduled appointments */
export async function fetchAllSchedule() {
    return get<any[]>('/schedule');
}
