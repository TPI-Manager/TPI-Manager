// src/components/ScheduleFormModal.jsx
import React, { useState, useEffect } from "react";
import "../Styles/schedule.css";

export default function ScheduleFormModal({ show, onClose, initialData, onSave }) {
  const [form, setForm] = useState({
    title: "",
    body: "",
    startTime: "",
    endTime: "",
    days: []
  });

  const weekDays = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"];

  useEffect(() => {
    if (initialData) setForm(initialData);
    else setForm({ title: "", body: "", startTime: "", endTime: "", days: [] });
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleSubmit = () => {
    if (!form.title) return alert("Title required");
    onSave(form);
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>{initialData ? "Edit Schedule" : "Add Schedule"}</h3>
        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
        />
        <textarea
          name="body"
          placeholder="Description"
          value={form.body}
          onChange={handleChange}
        />
        <input
          type="time"
          name="startTime"
          value={form.startTime}
          onChange={handleChange}
        />
        <input
          type="time"
          name="endTime"
          value={form.endTime}
          onChange={handleChange}
        />
        <div className="days-selector">
          {weekDays.map(d => (
            <button id="jh87"
              key={d}
              type="button"
              className={form.days.includes(d) ? "active" : ""}
              onClick={() => handleDayToggle(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="uu8" onClick={handleSubmit}>{initialData ? "Update" : "Save"}</button>
          <button className="uu8" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
