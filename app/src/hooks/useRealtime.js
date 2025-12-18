import { useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export function useRealtime(table, onUpdate, filterField = null, filterValue = null) {
    useEffect(() => {
        let unsubscribe = null;
        let isMounted = true;

        if (db) {
            try {
                let q = collection(db, table);
                if (filterField && filterValue) {
                    q = query(q, where(filterField, "==", filterValue));
                }

                unsubscribe = onSnapshot(q, (snapshot) => {
                    if (!isMounted) return;
                    snapshot.docChanges().forEach((change) => {
                        const docData = { id: change.doc.id, ...change.doc.data() };
                        if (change.type === "added") onUpdate({ eventType: 'INSERT', new: docData });
                        if (change.type === "modified") onUpdate({ eventType: 'UPDATE', new: docData });
                        if (change.type === "removed") onUpdate({ eventType: 'DELETE', old: { id: change.doc.id } });
                    });
                }, (error) => {
                    if (error.code === 'failed-precondition') {
                        console.warn("Firestore: Index required or listener limit reached.");
                    } else {
                        console.error("Firestore Error:", error.message);
                    }
                });
            } catch (err) {
                console.error("Setup Error:", err.message);
            }
        }

        const interval = setInterval(() => {
            if (isMounted) onUpdate({ eventType: 'POLL' });
        }, 5000);

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
            clearInterval(interval);
        };
    }, [table, filterField, filterValue, onUpdate]);
}