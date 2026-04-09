/**
 * db.ts — shared database API for the mobile app.
 * Migrated to exclusively use Supabase Native Connections!
 */

import { supabase } from './supabase';

// ── Generic fetch helpers ────────────────────────────────────────────────────

export async function dbGet<T>(path: string): Promise<T> {
    const parts = path.split('?');
    let table = parts[0].replace('/', '');
    table = table.replace(/-/g, '_');
    const query = parts[1];
    
    let q: any = supabase.from(table).select('*');
    
    if (query) {
        // Very basic query parsing if needed, but standard mobile app fetches /sessions, /clients etc.
        const params = query.split('&');
        for (const param of params) {
            const [k, v] = param.split('=');
            if (k && v && !k.startsWith('_')) {
                q = q.eq(k, decodeURIComponent(v));
            }
        }
    }

    const { data, error } = await q;
    if (error) throw new Error(`[Supabase GET ${table}] failed: ${error.message}`);
    return data as T;
}

export async function dbPost<T>(path: string, body: object): Promise<T> {
    let table = path.replace('/', '');
    table = table.split('?')[0].replace(/-/g, '_');
    const { data, error } = await supabase.from(table).insert(body).select().single();
    if (error) throw new Error(`[Supabase POST ${table}] failed: ${error.message}`);
    return data as T;
}

export async function dbPatch<T>(path: string, body: object): Promise<T> {
    const parts = path.split('/').filter(Boolean);
    let table = parts[0];
    table = table.split('?')[0].replace(/-/g, '_');
    const id = parts[1];
    
    const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
    if (error) throw new Error(`[Supabase PATCH ${table}] failed: ${error.message}`);
    return data as T;
}

export async function dbDelete<T>(path: string): Promise<T> {
    const parts = path.split('/').filter(Boolean);
    let table = parts[0];
    table = table.split('?')[0].replace(/-/g, '_');
    const id = parts[1];
    
    const { data, error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`[Supabase DELETE ${table}] failed: ${error.message}`);
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

export async function fetchClients(): Promise<DBClient[]> {
    return dbGet<DBClient[]>('/clients');
}

export async function createClient(c: Omit<DBClient, 'id'>) {
    return dbPost<DBClient>('/clients', c);
}

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
export const updateSession = (id: string | number, updates: Partial<DBSession>) => dbPatch<DBSession>(`/sessions/${id}`, updates);

// ── Providers ────────────────────────────────────────────────────────────────

export interface DBProvider {
    id: string;
    name: string;
    color: string;
    textColor: string;
}

export const fetchProviders = () => dbGet<DBProvider[]>('/providers');

// ── Documents ────────────────────────────────────────────────────────────────

export const fetchDocuments = () => dbGet<any[]>('/documents');
export const createDocument = (d: Omit<any, 'id'>) => dbPost<any>('/documents', d);

// ── Schedules ────────────────────────────────────────────────────────────────

export const fetchSchedule = () => dbGet<any[]>('/schedule');
export const createSchedule = (s: Omit<any, 'id'>) => dbPost<any>('/schedule', s);

// ── Users ────────────────────────────────────────────────────────────────────
export const fetchUsers = () => dbGet<any[]>('/users');
