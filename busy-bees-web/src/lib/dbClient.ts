import { supabase } from './supabase';

const DB_BASE_URL = 'http://127.0.0.1:6011';

function isSupabaseTable(table: string) {
    return ['users', 'clients', 'available_services', 'activity_feed', 'daily_routines', 'transaction_sheets'].includes(table);
}

export const dbClient = {
    get: async (path: string) => {
        const [base, query] = path.split('?');
        const parts = base.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];
        
        if (!isSupabaseTable(table)) {
            const res = await fetch(`${DB_BASE_URL}${path}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`GET ${path} failed from json-server`);
            return await res.json();
        }

        let q: any = supabase.from(table).select('*');
        if (id) q = q.eq('id', id).single();
        if (query) {
            const params = new URLSearchParams(query);
            let sortProp = '';
            let sortOrder = '';
            for (const [k, v] of params.entries()) {
                if (k === '_sort') { sortProp = v; }
                else if (k === '_order') { sortOrder = v; }
                else if (k === '_limit') { q = q.limit(parseInt(v)); }
                else { q = q.eq(k, v); }
            }
            if (sortProp) {
                q = q.order(sortProp, { ascending: sortOrder === 'asc' });
            }
        }
        const { data, error } = await q;
        if (error) {
            throw error;
        }
        return data;
    },

    post: async (path: string, body: any) => {
        const table = path.replace('/', '');
        if (!isSupabaseTable(table)) {
            const res = await fetch(`${DB_BASE_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`POST ${path} failed`);
            return await res.json();
        }

        const { data, error } = await supabase.from(table).insert(body).select().single();
        if (error) throw error;
        return data;
    },

    patch: async (path: string, body: any) => {
        const parts = path.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];

        if (!isSupabaseTable(table)) {
            const res = await fetch(`${DB_BASE_URL}${path}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`PATCH ${path} failed`);
            return await res.json();
        }

        const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    delete: async (path: string) => {
        const parts = path.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];

        if (!isSupabaseTable(table)) {
            const res = await fetch(`${DB_BASE_URL}${path}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`DELETE ${path} failed`);
            return await res.json();
        }

        const { data, error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return data;
    }
};
