// src/components/AnnouncementFormModal.jsx
import React, { useState, useEffect } from "react";
import "../comstyle/AnnouncementCard.css";

export default function AnnouncementFormModal({ show, onClose, onSave, initialData }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setMessage(initialData.message || "");
    } else {
      setTitle("");
      setMessage("");
    }
  }, [initialData]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !message) return alert("All fields required");
    onSave({ title, message, id: initialData?.id });
  };

  return (
    <div className="overlay">
      <form className="modal-box" onSubmit={handleSubmit} style={{
        background: "#fff",
        padding: 20,
        borderRadius: 8,
        width: 400,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <h3 className="ghg6d">{initialData ? "Edit" : "Add"} Announcement</h3>
        <input className="ggu7mm"
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea className="ggu7"
          placeholder="Message"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="tt67"  type="button" onClick={onClose}>Cancel</button>
          <button className="uu3" type="submit">{initialData ? "Update" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
