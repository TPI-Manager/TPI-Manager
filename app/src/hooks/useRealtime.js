import { useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export function useRealtime(table, onUpdate, filterField = null, filterValue = null) {
    useEffect(() => {
        let unsubscribe = () => { };

        if (db) {
            let q = collection(db, table);

            if (filterField && filterValue) {
                q = query(q, where(filterField, "==", filterValue));
            }

            // console.log(`Subscribing to Firestore: ${table}`);

            unsubscribe = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const docData = { id: change.doc.id, ...change.doc.data() };

                    if (change.type === "added") {
                        onUpdate({ eventType: 'INSERT', new: docData });
                    }
                    if (change.type === "modified") {
                        onUpdate({ eventType: 'UPDATE', new: docData });
                    }
                    if (change.type === "removed") {
                        onUpdate({ eventType: 'DELETE', old: { id: change.doc.id } });
                    }
                });
            }, (error) => {
                console.error("Firestore Error:", error);
            });
        }

        // 🟢 Polling Fallback
        const interval = setInterval(() => {
            onUpdate({ eventType: 'POLL' });
        }, 4000);

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
            clearInterval(interval);
        };
    }, [table, filterField, filterValue, onUpdate]);
}