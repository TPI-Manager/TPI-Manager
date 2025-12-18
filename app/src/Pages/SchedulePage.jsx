import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import "../Styles/schedule.css";

export default function SchedulePage({ student }) {
    const [schedules, setSchedules] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [form, setForm] = useState({ title: "", startTime: "", endTime: "", days: [] });

    const isAdmin = student.role === "admin" || student.role === "teacher";
    const dept = student.department || "CST";
    const sem = student.semester || "1st";
    const shift = student.shift || "Morning";

    const loadSchedule = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/schedules/${dept}`);
            const filtered = res.data.filter(s => s.semester === sem && s.shift === shift);
            setSchedules(filtered);
        } catch {
            setSchedules([]);
        }
    }, [dept, sem, shift]);

    useEffect(() => {
        const load = async () => {
            await loadSchedule();
        };
        load();
    }, [loadSchedule]);

    useRealtime('schedules', () => {
        loadSchedule();
    });

    const save = async () => {
        try {
            await axios.post(`${API_BASE}/api/schedules`, {
                ...form,
                department: dept,
                semester: sem,
                shift,
                creatorId: student.id || student.studentId || student.employeeId || student.adminId
            });
            setShowModal(false);
            setForm({ title: "", startTime: "", endTime: "", days: [] });
            toast.success("Schedule Added");
        } catch (error) {
            console.error(error);
            toast.error("Failed to add schedule");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const userId = student.id || student.studentId || student.employeeId || student.adminId;
            await axios.delete(`${API_BASE}/api/schedules/${deleteTarget}`, {
                headers: { 'x-user-id': userId }
            });
            toast.success("Schedule Removed");
            setDeleteTarget(null);
        } catch {
            toast.error("Delete failed or unauthorized");
            setDeleteTarget(null);
        }
    };

    return (
        <div className="page">
            <div className="header">
                <h2>Schedule ({dept})</h2>
                {isAdmin && (
                    <button className="add-btn" onClick={() => setShowModal(true)}>
                        <i className="bi bi-calendar-plus"></i> Add Class
                    </button>
                )}
            </div>
            <div className="grid">
                {schedules.length === 0 && <p>No schedule found.</p>}
                {schedules.map(s => (
                    <div key={s.id} className="card">
                        <h3>{s.title}</h3>
                        <p><i className="bi bi-clock"></i> {s.startTime} - {s.endTime}</p>
                        <p><i className="bi bi-calendar-week"></i> {Array.isArray(s.days) ? s.days.join(", ") : ""}</p>
                        <div className="card-footer">
                            <div className="meta-info">
                                <span className="meta-time">{new Date(s.createdAt).toLocaleString()}</span>
                                <span className="meta-id">ID: {s.id.substring(0, 6)}</span>
                            </div>
                            {(isAdmin || s.creatorId === (student.id || student.studentId || student.employeeId || student.adminId)) && (
                                <button className="delete-action" onClick={() => setDeleteTarget(s.id)}>
                                    <i className="bi bi-trash"></i> Remove
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add Class Schedule"
                footer={
                    <>
                        <button className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                        <button onClick={save}>Save Class</button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Class Name</label>
                    <input
                        placeholder="e.g. Mathematics"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Start Time</label>
                    <input
                        type="time"
                        value={form.startTime}
                        onChange={e => setForm({ ...form, startTime: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>End Time</label>
                    <input
                        type="time"
                        value={form.endTime}
                        onChange={e => setForm({ ...form, endTime: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Days (comma separated)</label>
                    <input
                        placeholder="Sat,Sun,Mon..."
                        value={form.days.join(',')}
                        onChange={e => setForm({ ...form, days: e.target.value.split(',') })}
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
                <p>Are you sure you want to remove this class from the schedule?</p>
            </Modal>
        </div>
    );
}