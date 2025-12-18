import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import "../Styles/event.css";

export default function EventPage({ student }) {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
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
            setForm({ title: "", body: "" });
            toast.success("Event Created");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create event");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const userId = student.id || student.studentId || student.employeeId || student.adminId;
            await axios.delete(`${API_BASE}/api/events/${deleteTarget}`, {
                headers: { 'x-user-id': userId }
            });
            toast.success("Event Removed");
            setDeleteTarget(null);
        } catch {
            toast.error("Delete failed");
            setDeleteTarget(null);
        }
    };

    return (
        <div className="page">
            <div className="header">
                <h2>Events ({dept})</h2>
                {isAdmin && (
                    <button className="add-btn" onClick={() => setShowModal(true)}>
                        <i className="bi bi-calendar-plus"></i> New Event
                    </button>
                )}
            </div>
            <div className="grid">
                {events.length === 0 && <p>No events found.</p>}
                {events.map(ev => (
                    <div key={ev.id} className="card">
                        <h3>{ev.title}</h3>
                        <p>{ev.body}</p>
                        {isAdmin && (
                            <button className="delete-action" onClick={() => setDeleteTarget(ev.id)}>
                                <i className="bi bi-trash"></i> Remove
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="New Event"
                footer={
                    <>
                        <button className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                        <button onClick={save}>Save Event</button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Event Title</label>
                    <input
                        placeholder="e.g. Annual Sports Day"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Details</label>
                    <textarea
                        rows={4}
                        placeholder="Event description..."
                        value={form.body}
                        onChange={e => setForm({ ...form, body: e.target.value })}
                    />
                </div>
            </Modal>

            <Modal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Confirm Deletion"
                footer={
                    <>
                        <button className="secondary-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                        <button style={{ backgroundColor: 'var(--error)' }} onClick={confirmDelete}>Delete</button>
                    </>
                }
            >
                <p>Are you sure you want to remove this event?</p>
            </Modal>
        </div>
    );
}