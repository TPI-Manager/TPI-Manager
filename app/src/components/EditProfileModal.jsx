import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "../Styles/signup.css";

export default function EditProfileModal({ student, onClose, onUpdateSuccess }) {
    const [newId, setNewId] = useState(student.id);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const handleUpdate = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            setMsg("Passwords do not match");
            return;
        }
        if (!newId || newId.length < 3) {
            setMsg("Username too short");
            return;
        }

        setLoading(true);
        setMsg("");

        try {
            const res = await axios.put(`${API_BASE}/api/auth/update`, {
                currentId: student.id,
                newId: newId !== student.id ? newId : undefined,
                newPassword: newPassword || undefined,
                role: student.role
            });

            if (res.data.user) {
                setMsg("Credentials Updated!");
                // Just close and update parent state
                setTimeout(() => {
                    onUpdateSuccess(res.data.user);
                    onClose();
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            setMsg(error.response?.data?.error || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="brand-header" style={{ marginBottom: '20px' }}>
                    <h2>Update Credentials</h2>
                    <p>Modify your login details</p>
                </div>

                <div className="form-group">
                    <label>Username / ID</label>
                    <input value={newId} onChange={e => setNewId(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>New Password (Optional)</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>

                {msg && <div className={`status-msg ${msg.includes("Updated") ? "ok" : "err"}`}>{msg}</div>}

                <div className="modal-actions">
                    <button className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button onClick={handleUpdate} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}