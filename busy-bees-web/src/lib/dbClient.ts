import { supabase } from './supabase';

export const dbClient = {
    get: async (path: string) => {
        const [base, query] = path.split('?');
        const parts = base.split('/').filter(Boolean);
        let table = parts[0];
        table = table.replace(/-/g, '_');
        const id = parts[1];
        
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
            console.error(`[Supabase GET ${table}] Error:`, error.message || error.code || JSON.stringify(error));
            throw error;
        }
        return data;
    },

    post: async (path: string, body: any) => {
        let table = path.replace('/', '');
        table = table.split('?')[0].replace(/-/g, '_');
        const { data, error } = await supabase.from(table).insert(body).select().single();
        if (error) {
            console.error(`[Supabase POST ${table}] Error:`, error);
            throw error;
        }
        return data;
    },

    upsert: async (path: string, body: any) => {
        let table = path.replace('/', '');
        table = table.split('?')[0].replace(/-/g, '_');
        const { data, error } = await supabase.from(table).upsert(body).select().single();
        if (error) {
            console.error(`[Supabase UPSERT ${table}] Error:`, error);
            throw error;
        }
        return data;
    },

    patch: async (path: string, body: any) => {
        const parts = path.split('/').filter(Boolean);
        let table = parts[0];
        table = table.split('?')[0].replace(/-/g, '_');
        const id = parts[1];

        const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
        if (error) {
            console.error(`[Supabase PATCH ${table}] Error:`, error);
            throw error;
        }
        return data;
    },

    delete: async (path: string) => {
        const parts = path.split('/').filter(Boolean);
        let table = parts[0];
        table = table.split('?')[0].replace(/-/g, '_');
        const id = parts[1];

        const { data, error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            console.error(`[Supabase DELETE ${table}] Error:`, error);
            throw error;
        }
        return data;
    }
};
