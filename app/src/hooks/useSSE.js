import { useEffect } from "react";
import { API_BASE } from "../config";

export function useSSE(onMessage) {
  useEffect(() => {
    const sseUrl = `${API_BASE || window.location.origin}/api/stream`;

    // In dev, API_BASE might be http://localhost:5000, so we need full URL.
    // In prod, API_BASE is empty, so we use relative or window.origin.
    // Actually, config.js says API_BASE is "" in prod, and "http://localhost:5000" in dev.
    // If API_BASE is empty, sseUrl starts with /api/stream (relative) which is fine if on same domain.
    // But if we use window.location.origin for safety when API_BASE is empty:

    const url = API_BASE ? `${API_BASE}/api/stream` : `/api/stream`;

    console.log("Connecting to SSE:", url);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "connected") {
            console.log("SSE Connected, ID:", parsed.id);
        } else {
            onMessage(parsed);
        }
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    eventSource.onerror = (e) => {
        // console.error("SSE Error", e);
        // EventSource automatically tries to reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [onMessage]);
}
