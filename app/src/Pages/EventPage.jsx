import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import "../Styles/event.css";

export default function EventPage({ student }) {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: "", body: "" });

    const isAdmin = student.role === "admin" || student.role === "teacher";
    const dept = student.department || "CST";

    const fetchEvents = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/events/${dept}`);
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch {
            setEvents([]);
        }
    }, [dept]);

    useEffect(() => {
        const load = async () => {
            await fetchEvents();
        };
        load();
    }, [fetchEvents]);

    useRealtime('events', () => {
        fetchEvents();
    });

    const save = async () => {
        try {
            const userId = student.id || student.studentId || student.employeeId || student.adminId;
            await axios.post(`${API_BASE}/api/events`, {
                ...form,
                department: dept,
                creatorId: userId
            });
            setShowModal(false);
        } catch (error) { console.error(error); }
    };

    const del = async (id) => {
        try {
            const userId = student.id || student.studentId || student.employeeId || student.adminId;
            await axios.delete(`${API_BASE}/api/events/${id}`, {
                headers: { 'x-user-id': userId }
            });
        } catch { alert("Delete failed"); }
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
                        <h3>New Event</h3>
                        <input placeholder="Title" onChange={e => setForm({ ...form, title: e.target.value })} />
                        <input placeholder="Details" onChange={e => setForm({ ...form, body: e.target.value })} />
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>Close</button>
                            <button onClick={save}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}