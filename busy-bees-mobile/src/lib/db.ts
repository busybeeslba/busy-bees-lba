/**
 * db.ts — shared database API for the mobile app.
 * All reads / writes go through http://localhost:6011 (json-server).
 *
 * On a real device, replace DB_BASE_URL with your machine's LAN IP, e.g.:
 *   http://192.168.1.x:6011
 */

import { supabase } from './supabase';

const DB_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6011';

function isSupabaseTable(table: string) {
    return ['users', 'clients', 'available_services', 'activity_feed', 'daily_routines', 'transaction_sheets'].includes(table);
}

// ── Generic fetch helpers ────────────────────────────────────────────────────

export async function dbGet<T>(path: string): Promise<T> {
    const parts = path.split('?');
    const table = parts[0].replace('/', '');
    
    if (!isSupabaseTable(table)) {
        const res = await fetch(`${DB_BASE_URL}${path}`);
        if (!res.ok) throw new Error(`GET ${path} failed from json-server`);
        return await res.json() as T;
    }

    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`GET ${path} failed: ${error.message}`);
    return data as T;
}

export async function dbPost<T>(path: string, body: object): Promise<T> {
    const table = path.replace('/', '');
    
    if (!isSupabaseTable(table)) {
        const res = await fetch(`${DB_BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`POST ${path} failed from json-server`);
        return await res.json() as T;
    }

    const { data, error } = await supabase.from(table).insert(body).select().single();
    if (error) throw new Error(`POST ${path} failed: ${error.message}`);
    return data as T;
}

export async function dbPatch<T>(path: string, body: object): Promise<T> {
    const parts = path.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    
    if (!isSupabaseTable(table)) {
        const res = await fetch(`${DB_BASE_URL}${path}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`PATCH ${path} failed from json-server`);
        return await res.json() as T;
    }

    const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
    if (error) throw new Error(`PATCH ${path} failed: ${error.message}`);
    return data as T;
}

export async function dbDelete<T>(path: string): Promise<T> {
    const parts = path.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    
    if (!isSupabaseTable(table)) {
        const res = await fetch(`${DB_BASE_URL}${path}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`DELETE ${path} failed from json-server`);
        return await res.json() as T;
    }

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
