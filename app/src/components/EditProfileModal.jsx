import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "../Styles/signup.css"; // Reuse existing styles

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
                setMsg("Success!");
                setTimeout(() => {
                    onUpdateSuccess(res.data.user);
                    onClose();
                }, 1000);
            }
        } catch (error) {
            setMsg(error.response?.data?.error || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2>Edit Admin Credentials</h2>
                <div className="form-group">
                    <label>Username / ID</label>
                    <input value={newId} onChange={e => setNewId(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>New Password (leave blank to keep)</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>

                {msg && <div className={`status-msg ${msg === "Success!" ? "ok" : "err"}`}>{msg}</div>}

                <div className="modal-actions">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={handleUpdate} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}