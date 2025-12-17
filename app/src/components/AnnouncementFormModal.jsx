import React, { useState } from "react";

export default function AnnouncementFormModal({ onClose, onSave }) {
    const [form, setForm] = useState({ title: "", body: "" });

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>New Announcement</h3>
                <input placeholder="Title" onChange={e => setForm({ ...form, title: e.target.value })} />
                <textarea placeholder="Message" onChange={e => setForm({ ...form, body: e.target.value })} />
                <div className="actions">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={() => onSave(form)}>Post</button>
                </div>
            </div>
        </div>
    );
}