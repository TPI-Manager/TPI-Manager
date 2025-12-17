import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "../Styles/event.css";

export default function EventPage({ student }) {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: "", body: "", startTime: "", endTime: "" });

    const isAdmin = student.role === "admin" || student.role === "teacher";
    const dept = student.department || "CST";
    const sem = student.semester || "1st";
    const shift = student.shift || "Morning";

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/events/${dept}/${sem}/${shift}`);
                setEvents(Array.isArray(res.data) ? res.data : []);
            } catch {
                setEvents([]);
            }
        };
        fetchEvents();
    }, [dept, sem, shift]);

    const refresh = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/events/${dept}/${sem}/${shift}`);
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch {
            setEvents([]);
        }
    };

    const save = async () => {
        try {
            await axios.post(`${API_BASE}/api/events`, { ...form, department: dept, semester: sem, shift });
            setShowModal(false);
            refresh();
        } catch (e) { console.error(e); }
    };

    const del = async (id) => {
        try {
            await axios.delete(`${API_BASE}/api/events/${dept}/${sem}/${shift}/${id}`);
            refresh();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="page">
            <div className="header">
                <h2>Events ({dept})</h2>
                {isAdmin && <button onClick={() => setShowModal(true)}>+</button>}
            </div>
            <div className="grid">
                {events.length === 0 && <p>No events found.</p>}
                {events.map(ev => (
                    <div key={ev.id} className="card">
                        <h3>{ev.title}</h3>
                        <p>{ev.body}</p>
                        {isAdmin && <button onClick={() => del(ev.id)}>Delete</button>}
                    </div>
                ))}
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <input placeholder="Title" onChange={e => setForm({ ...form, title: e.target.value })} />
                        <input placeholder="Details" onChange={e => setForm({ ...form, body: e.target.value })} />
                        <button onClick={save}>Save</button>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}