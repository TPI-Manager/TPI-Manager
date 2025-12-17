// src/components/AnnouncementCard.jsx
import React from "react";
import "../comstyle/AnnouncementCard.css";

export default function AnnouncementCard({ data, isAdmin, onEdit, onDelete }) {
  return (
    <div className="announcement-card">
      <h4 className="po1">{data.title}</h4>

      <p className="po2">{data.message}</p>

      <small className="po3">
        Created By: {data.createdBy} Teacher |{" "}
        {new Date(data.createdAt).toLocaleString()}
      </small>

      {isAdmin && (
        <div className="po4">
          <button className="po12 edit" onClick={onEdit}>Edit</button>
          <button className="po12 delete" onClick={onDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}
