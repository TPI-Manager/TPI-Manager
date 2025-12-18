import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
// Uses VITE_ keys because this runs in the browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

export function useRealtime(table, onUpdate, filterField = null, filterValue = null) {
    useEffect(() => {
        if (!supabase) return;

        // Create channel
        let channel = supabase.channel(`public:${table}:${filterValue || 'all'}`);

        const handleChange = (payload) => {
            onUpdate(payload);
        };

        if (filterField && filterValue) {
            // Filter by specific column (e.g., department or room)
            channel = channel
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: table, filter: `${filterField}=eq.${filterValue}` },
                    handleChange
                );
        } else {
            // Listen to entire table
            channel = channel
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: table },
                    handleChange
                );
        }

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filterField, filterValue, onUpdate]);
}