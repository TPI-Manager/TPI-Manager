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

    // IDs
    const userId = student.studentId || student.employeeId || student.adminId || student.id;
    const isAdmin = student.role === "admin" || student.role === "teacher";

    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/announcements`);
            setList(Array.isArray(res.data) ? res.data : []);
        } catch { setList([]); }
    }, []);

    useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);
    useSSE(useCallback((msg) => { if (msg.type === "announcements") fetchAnnouncements(); }, [fetchAnnouncements]));

    const handleSave = async (data) => {
        if (!data.title || !data.body) return;
        try {
            await axios.post(`${API_BASE}/api/announcements`, {
                ...data,
                createdBy: student.fullName,
                creatorId: userId // Essential for ownership check
            });
            setShowModal(false);
            fetchAnnouncements();
        } catch (error) { console.error(error); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure?")) {
            try {
                // Pass User ID in header for strict backend check
                await axios.delete(`${API_BASE}/api/announcements/${id}`, {
                    headers: { 'x-user-id': userId }
                });
                fetchAnnouncements();
            } catch (error) {
                alert("Permission denied: You can only delete announcements you created.");
            }
        }
    };

    return (
        <div className="page-container">
            <div className="toolbar">
                {isAdmin && <button className="add-btn" onClick={() => setShowModal(true)}>+ New Announcement</button>}
            </div>
            <div className="grid-layout">
                {list.map(item => (
                    <AnnouncementCard
                        key={item.id}
                        data={item}
                        // Only show delete if they are the owner
                        canDelete={item.creatorId === userId}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
            {showModal && <AnnouncementFormModal onClose={() => setShowModal(false)} onSave={handleSave} />}
        </div>
    );
}