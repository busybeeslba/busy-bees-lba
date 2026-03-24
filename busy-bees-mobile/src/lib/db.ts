/**
 * db.ts — shared database API for the mobile app.
 * All reads / writes go through http://localhost:3011 (json-server).
 *
 * On a real device, replace DB_BASE_URL with your machine's LAN IP, e.g.:
 *   http://192.168.1.x:3011
 */

import { supabase } from './supabase';

// ── Generic fetch helpers ────────────────────────────────────────────────────

export async function dbGet<T>(path: string): Promise<T> {
    const parts = path.split('?');
    const table = parts[0].replace('/', '');
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`GET ${path} failed: ${error.message}`);
    return data as T;
}

export async function dbPost<T>(path: string, body: object): Promise<T> {
    const table = path.replace('/', '');
    const { data, error } = await supabase.from(table).insert(body).select().single();
    if (error) throw new Error(`POST ${path} failed: ${error.message}`);
    return data as T;
}

export async function dbPatch<T>(path: string, body: object): Promise<T> {
    const parts = path.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
    if (error) throw new Error(`PATCH ${path} failed: ${error.message}`);
    return data as T;
}

export async function dbDelete<T>(path: string): Promise<T> {
    const parts = path.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    const { data, error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`DELETE ${path} failed: ${error.message}`);
    return data as T;
}

// ── Clients ──────────────────────────────────────────────────────────────────

export interface DBClient {
    id: number | string;
    name: string;
    kidsName?: string;
    guardian?: string;
    guardianLastName?: string;
    dob?: string;
    status?: string;
    services?: { serviceId: string; hours: string }[];
    phones?: { id: string; value: string; type: string; isPrimary: boolean }[];
    emails?: { id: string; value: string; type: string; isPrimary: boolean }[];
    addresses?: { id: string; value: string; type: string; isPrimary: boolean }[];
    teacher?: string;
    iepMeeting?: string;
}

export const fetchClients = () => dbGet<DBClient[]>('/clients');

// ── Available Services ───────────────────────────────────────────────────────

export interface DBService {
    id: string;
    serviceId: string;
    name: string;
    provider: string;
}

export const fetchAvailableServices = () => dbGet<DBService[]>('/available_services');

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface DBSession {
    id?: string | number;
    sessionId?: string;  // Random SES-XXXXXX display ID
    userId?: string;
    workerName?: string;
    employeeName?: string;
    employeeId?: string;
    clientId: string | number;
    clientName: string;
    clientStatus?: string;
    serviceType: string;
    startTime: string;
    endTime?: string;
    durationSeconds: number;
    status: 'active' | 'completed';
    notes?: string;
    documents?: any[];
    route?: any[];
    signature?: string;
    signedAt?: string;
}

export const fetchSessions = () => dbGet<DBSession[]>('/sessions');
export const createSession = (s: Omit<DBSession, 'id'>) => dbPost<DBSession>('/sessions', s);
export const updateSession = (id: string | number, s: Partial<DBSession>) => dbPatch<DBSession>(`/sessions/${id}`, s);

// ── Providers ────────────────────────────────────────────────────────────────

export interface DBProvider {
    id: string;
    name: string;
    color: string;
    textColor: string;
}

export const fetchProviders = () => dbGet<DBProvider[]>('/providers');
