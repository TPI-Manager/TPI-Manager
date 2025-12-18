import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function useRealtime(table, onUpdate, filterField = null, filterValue = null) {
    useEffect(() => {
        // Basic channel setup
        let channel = supabase.channel(`public:${table}`);

        if (filterField && filterValue) {
            // Filtered subscription (e.g., chat room)
            channel = channel
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: table, filter: `${filterField}=eq.${filterValue}` },
                    (payload) => onUpdate(payload)
                );
        } else {
            // Global subscription (e.g., announcements)
            channel = channel
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: table },
                    (payload) => onUpdate(payload)
                );
        }

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filterField, filterValue, onUpdate]);
}