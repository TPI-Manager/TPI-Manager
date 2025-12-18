import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useSSE } from "../hooks/useSSE";
import AnnouncementCard from "../components/AnnouncementCard";
import AnnouncementFormModal from "../components/AnnouncementFormModal";
import "../Styles/announcement.css";

export default function AnnouncementPage({ student }) {
    const [list, setList] = useState([]);
    const [showModal, setShowModal] = useState(false);

    const isAdmin = student.role === "admin" || student.role === "teacher";

    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/announcements`);
            setList(Array.isArray(res.data) ? res.data.reverse() : []);
        } catch {
            setList([]);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    useSSE(useCallback((msg) => {
        if (msg.type === "announcements") {
            fetchAnnouncements();
        }
    }, [fetchAnnouncements]));

    const handleSave = async (data) => {
        if (!data.title || !data.body) return;
        try {
            await axios.post(`${API_BASE}/api/announcements`, { ...data, createdBy: student.fullName });
            setShowModal(false);
            fetchAnnouncements();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure?")) {
            try {
                await axios.delete(`${API_BASE}/api/announcements/${id}`);
                fetchAnnouncements();
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="page-container">
            <div className="toolbar">
                {isAdmin && <button className="add-btn" onClick={() => setShowModal(true)}>+ New Announcement</button>}
            </div>

            <div className="grid-layout">
                {list.length === 0 ? (
                    <div className="empty-state">No announcements yet.</div>
                ) : (
                    list.map(item => (
                        <AnnouncementCard key={item.id} data={item} isAdmin={isAdmin} onDelete={handleDelete} />
                    ))
                )}
            </div>
            {showModal && <AnnouncementFormModal onClose={() => setShowModal(false)} onSave={handleSave} />}
        </div>
    );
}