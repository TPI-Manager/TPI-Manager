import React, { useEffect, useState } from "react";

export default function ScheduleCard({ schedule = {}, isAdmin = false, onEdit, onDelete }) {
  const { id, title, body, days, startTime, endTime } = schedule;

  if (!id) return null;

  const parseHHMMToDate = (hhmm) => {
    if (!hhmm) return null;
    const [hh, mm] = hhmm.split(":").map(Number);
    const now = new Date();
    now.setHours(hh, mm, 0, 0);
    return now;
  };

  const computeStatus = () => {
    const now = new Date();
    const today = now.toLocaleString("en-US", { weekday: "long" });
    const isDayActive = Array.isArray(days) ? days.includes(today) : true;

    let start = startTime ? parseHHMMToDate(startTime) : null;
    let end = endTime ? parseHHMMToDate(endTime) : null;

    const startMs = start ? start.getTime() : null;
    const endMs = end ? end.getTime() : null;

    if (!isDayActive) return { status: "inactive", secondsLeft: null };

    if (!startMs || now < start) return { status: "upcoming", secondsLeft: Math.floor((startMs - now)/1000) };
    if (endMs && now > end) return { status: "expired", secondsLeft: 0 };
    return { status: "active", secondsLeft: endMs ? Math.floor((endMs - now)/1000) : null };
  };

  const [liveStatus, setLiveStatus] = useState(computeStatus());

  useEffect(() => {
    const iv = setInterval(() => {
      setLiveStatus(computeStatus());
    }, 1000);

    return () => clearInterval(iv);
  }, [schedule]);

  const formatTime = (sec) => {
    if (!sec || sec <= 0) return "00:00:00";
    let d = Math.floor(sec / 86400);
    sec %= 86400;
    let h = Math.floor(sec / 3600);
    sec %= 3600;
    let m = Math.floor(sec / 60);
    let s = sec % 60;
    return `${d}d ${h.toString().padStart(2,"0")}h ${m.toString().padStart(2,"0")}m ${s.toString().padStart(2,"0")}s`;
  };

  return (
    <div className="schedule-card">
      <h3>{title?.slice(0, 50)}</h3>
      {body && <p>{body}</p>}
      <p>Status: <strong>{liveStatus.status}</strong></p>
      {(liveStatus.status === "upcoming" || liveStatus.status === "active") && liveStatus.secondsLeft != null && (
        <p>{liveStatus.status === "upcoming" ? "Starts in: " : "Ends in: "} {formatTime(liveStatus.secondsLeft)}</p>
      )}
      {days && days.length > 0 && <p>Days: {days.join(", ")}</p>}
      {(startTime || endTime) && (
        <p>Start: {startTime || "--"} | End: {endTime || "--"}</p>
      )}

      {isAdmin && (
        <div className="admin-buttons">
          {onEdit && <button onClick={() => onEdit(schedule)}>Edit</button>}
          {onDelete && <button onClick={() => onDelete(schedule)}>Delete</button>}
        </div>
      )}
    </div>
  );
}
