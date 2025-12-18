import React from "react";

export default function AnnouncementCard({ data, canDelete, onDelete }) {
    return (
        <div className="card fade-in">
            <h3>{data.title}</h3>
            <p>{data.body}</p>
            <div className="card-footer">
                <div className="meta-info">
                    <div className="meta-row">
                        <span><i className="bi bi-person-circle"></i> {data.createdBy}</span>
                        {data.role && <span className="meta-badge">{data.role}</span>}
                        {data.id && <span className="meta-id">ID: {data.id.substring(0, 6)}</span>}
                    </div>
                    <div className="meta-time">
                        {new Date(data.createdAt).toLocaleString()}
                    </div>
                </div>
                {canDelete && (
                    <button className="delete-action" onClick={() => onDelete(data.id)}>
                        <i className="bi bi-trash"></i> Remove
                    </button>
                )}
            </div>
        </div>
    );
}