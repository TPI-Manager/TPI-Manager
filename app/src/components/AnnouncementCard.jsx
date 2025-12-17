import React from "react";

export default function AnnouncementCard({ data, isAdmin, onDelete }) {
    return (
        <div className="card fade-in">
            <h3>{data.title}</h3>
            <p>{data.body}</p>
            <div className="card-footer">
                <span><i className="bi bi-pencil-square"></i> {data.createdBy}</span>
                {isAdmin && (
                    <button className="delete-action" onClick={() => onDelete(data.id)}>
                        <i className="bi bi-trash"></i> Remove
                    </button>
                )}
            </div>
        </div>
    );
}