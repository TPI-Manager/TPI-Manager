import React, { useState } from "react";
import Modal from "./Modal";

export default function AnnouncementFormModal({ onClose, onSave }) {
    const [form, setForm] = useState({ title: "", body: "" });

    const handleSave = () => {
        if (!form.title || !form.body) return; // Simple validation
        onSave(form);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="New Announcement"
            footer={
                <>
                    <button className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button onClick={handleSave}>Post</button>
                </>
            }
        >
            <div className="form-group">
                <label>Title</label>
                <input
                    type="text"
                    placeholder="Brief title..."
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                />
            </div>
            <div className="form-group">
                <label>Message</label>
                <textarea
                    placeholder="Write your announcement..."
                    rows={5}
                    value={form.body}
                    onChange={e => setForm({ ...form, body: e.target.value })}
                />
            </div>
        </Modal>
    );
}