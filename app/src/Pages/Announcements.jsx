import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime"; // Updated Hook
import AnnouncementCard from "../components/AnnouncementCard";
import AnnouncementFormModal from "../components/AnnouncementFormModal";
import "../Styles/announcement.css";

export default function AnnouncementPage({ student }) {
    const [list, setList] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // Identify User and Role
    // Prioritize specific IDs, fallback to generic 'id'
    const userId = student.studentId || student.employeeId || student.adminId || student.id;
    const isAdmin = student.role === "admin" || student.role === "teacher";

    // 1. Fetch Data
    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/announcements`);
            setList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Fetch error:", error);
            setList([]);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // 2. Realtime Subscription
    // Listens for ANY change to the 'announcements' table in Supabase
    useRealtime('announcements', (payload) => {
        // Simple strategy: If anything changes (Insert/Delete), just refetch the list
        // This ensures the order and data is always 100% synced with DB
        fetchAnnouncements();
    });

    // 3. Create Announcement
    const handleSave = async (data) => {
        if (!data.title || !data.body) return;
        try {
            await axios.post(`${API_BASE}/api/announcements`, {
                ...data,
                createdBy: student.fullName,
                creatorId: userId // Required for strict ownership
            });
            setShowModal(false);
            // fetchAnnouncements handled by Realtime, but safe to call here too for UI snap
            fetchAnnouncements();
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to post announcement");
        }
    };

    // 4. Delete Announcement
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this announcement?")) {
            try {
                // Must pass x-user-id header so backend validates ownership
                await axios.delete(`${API_BASE}/api/announcements/${id}`, {
                    headers: { 'x-user-id': userId }
                });
                // Realtime will handle the UI update
            } catch (error) {
                console.error("Delete error", error);
                alert("Permission denied: You can only delete announcements you created.");
            }
        }
    };

    return (
        <div className="page-container">
            <div className="toolbar">
                {isAdmin && (
                    <button className="add-btn" onClick={() => setShowModal(true)}>
                        <i className="bi bi-plus-lg"></i> New Announcement
                    </button>
                )}
            </div>

            <div className="grid-layout">
                {list.length === 0 ? (
                    <div className="empty-state">
                        <i className="bi bi-megaphone" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                        No announcements posted yet.
                    </div>
                ) : (
                    list.map(item => (
                        <AnnouncementCard
                            key={item.id}
                            data={item}
                            // Only show delete button if current user is the creator
                            canDelete={item.creatorId === userId}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {showModal && (
                <AnnouncementFormModal
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}