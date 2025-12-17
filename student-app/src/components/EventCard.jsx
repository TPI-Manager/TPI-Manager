// -------------------------
// FIXED EventCard.jsx
// -------------------------
import React, { useState } from "react";
import "../comstyle/EventCard.css";

export default function EventCard({ event, student, onVote, onDelete, onEdit }) {
  const [showDetail, setShowDetail] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (event.days && !event.days.includes(today)) return null;

  return (
    <div className="event-card" onClick={() => setShowDetail(!showDetail)}>
      <h3  className="ho8" >{event.title}</h3>
      <p className="hho8">{event.body}</p>

      <p className="hh98">
        Status: <strong>{event.status}</strong>
      </p>

      {event.status === "upcoming" && (
        <p className="pho8">Starts in: {event.formattedStart}</p>
      )}

      {event.status === "active" && (
        <p className="phoii">Ends in: {event.formattedRemain}</p>
      )}

      {showDetail && (
        <div className="event-time-detail">
          <p className="hholl8">Start Time: {String(event.startTime)}</p>
          <p className="hholl8">End Time: {String(event.endTime)}</p>
  <p className="huo8">Added By: {event.createdByName || event.createdBy}</p>

    
      
        </div>
      )}

      {/* Vote system */}
      {student.admin !== "yes" &&
        event.type === "vote" &&
        event.status === "active" && (
          <div className="vote-buttons">
            {event.options?.map((opt) => (
              <button className="hho8kk"
                key={opt}
                disabled={event.votedStudents?.includes(student.studentId)}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(event.id, opt);
                }}
              >
                {opt} ({event.votes?.[opt] || 0})
              </button>
            ))}
          </div>
        )}

      {/* Admin */}
      {student.admin === "yes" && (
        <div className="admin-buttons">
          <button className="htcho8"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(event);
            }}
          >
            Edit
          </button>
          <button className="hhoty8"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(event.id);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
