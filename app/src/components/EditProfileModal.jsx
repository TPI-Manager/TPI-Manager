import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import Modal from "./Modal";
import { toast } from "react-toastify";
import "../Styles/signup.css";

export default function EditProfileModal({ student, onClose, onUpdateSuccess }) {
    const [newId, setNewId] = useState(student.id);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (!newId || newId.length < 3) {
            toast.error("Username too short");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.put(`${API_BASE}/api/auth/update`, {
                currentId: student.id,
                newId: newId !== student.id ? newId : undefined,
                newPassword: newPassword || undefined,
                role: student.role
            });

            if (res.data.user) {
                toast.success("Credentials Updated!");
                onUpdateSuccess(res.data.user);
                onClose();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Update Credentials"
            footer={
                <>
                    <button className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button onClick={handleUpdate} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </>
            }
        >
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
        </Modal>
    );
}