import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "../Styles/schedule.css";

export default function SchedulePage({ student }) {
    const [schedules, setSchedules] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: "", startTime: "", endTime: "", days: [] });

    const isAdmin = student.role === "admin" || student.role === "teacher";
    const dept = student.department || "CST";
    const sem = student.semester || "1st";
    const shift = student.shift || "Morning";

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/schedules/${dept}/${sem}/${shift}`);
                setSchedules(Array.isArray(res.data) ? res.data : []);
            } catch {
                setSchedules([]);
            }
        };
        fetchSchedule();
    }, [dept, sem, shift]);

    const refresh = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/schedules/${dept}/${sem}/${shift}`);
            setSchedules(Array.isArray(res.data) ? res.data : []);
        } catch {
            setSchedules([]);
        }
    };

    const save = async () => {
        try {
            await axios.post(`${API_BASE}/api/schedules`, { ...form, department: dept, semester: sem, shift });
            setShowModal(false);
            refresh();
        } catch (e) { console.error(e); }
    };

    const del = async (id) => {
        try {
            await axios.delete(`${API_BASE}/api/schedules/${dept}/${sem}/${shift}/${id}`);
            refresh();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="page">
            <div className="header">
                <h2>Schedule ({dept})</h2>
                {isAdmin && <button onClick={() => setShowModal(true)}>+</button>}
            </div>
            <div className="grid">
                {schedules.length === 0 && <p>No schedule found.</p>}
                {schedules.map(s => (
                    <div key={s.id} className="card">
                        <h3>{s.title}</h3>
                        <p>{s.startTime} - {s.endTime}</p>
                        <p>{Array.isArray(s.days) ? s.days.join(", ") : ""}</p>
                        {isAdmin && <button onClick={() => del(s.id)}>Delete</button>}
                    </div>
                ))}
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <input placeholder="Class Name" onChange={e => setForm({ ...form, title: e.target.value })} />
                        <input type="time" onChange={e => setForm({ ...form, startTime: e.target.value })} />
                        <input type="time" onChange={e => setForm({ ...form, endTime: e.target.value })} />
                        <input placeholder="Days (comma sep)" onChange={e => setForm({ ...form, days: e.target.value.split(',') })} />
                        <button onClick={save}>Save</button>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}