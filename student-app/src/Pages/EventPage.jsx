import React, { useEffect, useState } from "react";
import axios from "axios";
import EventCard from "../components/EventCard";
import EventFormModal from "../components/EventFormModal";
import "../Styles/event.css";
import add from "../assets/add.svg";

const API = "http://localhost:4000/api";

export default function EventPage({ student }) {
  if (!student) return <h2>Student not found. Please login.</h2>;

  const [events, setEvents] = useState([]);
  const [department, setDepartment] = useState(student.department || "");
  const [semester, setSemester] = useState(student.semester || "");
  const [shift, setShift] = useState(student.shift || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00:00");

  useEffect(() => {
    setShowFilters(student.teacher === "yes");
  }, [student.teacher]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Events
  const fetchEvents = async () => {
    if (!department || !semester || !shift) return;
    try {
      const res = await axios.get(`${API}/events/${department}/${semester}/${shift}`);
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60 * 1000);
    return () => clearInterval(interval);
  }, [department, semester, shift]);

  // Add or Edit event
  const handleAddEditEvent = (data) => {
    const payload = {
      ...data,
      department,
      semester,
      shift,
      createdBy: student.studentId,
    };

    if (editEvent) payload.id = editEvent.id;

    axios
      .post(`${API}/events`, payload)
      .then((res) => {
        if (editEvent) {
          setEvents((prev) =>
            prev.map((ev) => (ev.id === editEvent.id ? res.data : ev))
          );
        } else {
          setEvents((prev) => [...prev, res.data]);
        }
        setModalOpen(false);
        setEditEvent(null);
      })
      .catch((err) =>
        alert(err.response?.data?.error || "Add/Edit failed")
      );
  };

  // Voting
  const handleVote = (eventId, option) => {
    axios
      .post(`${API}/events/${department}/${semester}/${shift}/${eventId}/vote`, {
        studentId: student.studentId,
        option,
      })
      .then(fetchEvents)
      .catch((err) =>
        alert(err.response?.data?.error || "Vote failed")
      );
  };

  // Delete event
  const handleDelete = (eventId) => {
    axios
      .delete(`${API}/events/${department}/${semester}/${shift}/${eventId}`)
      .then(fetchEvents)
      .catch((err) => console.error(err));
  };

  // Convert seconds → D-H-M-S
  const formatTime = (sec) => {
    if (sec <= 0) return "00:00:00";

    const d = Math.floor(sec / 86400);
    sec %= 86400;

    const h = Math.floor(sec / 3600);
    sec %= 3600;

    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
  };

  // FINAL schedule + normal event timer logic
  const computeWeeklyStatus = (event) => {
    const now = new Date();

    // For NORMAL EVENT (with date)
    if (event.type !== "schedule") {
      let startTs = event.startTime ? new Date(event.startTime).getTime() : null;
      let endTs = event.endTime ? new Date(event.endTime).getTime() : null;
      const nowTs = Date.now();

      let status = "inactive";
      let timeToStart = 0;
      let timeRemaining = 0;

      if (!startTs || nowTs < startTs) {
        status = "upcoming";
        timeToStart = startTs ? Math.floor((startTs - nowTs) / 1000) : 0;
      } else if (endTs && nowTs > endTs) {
        status = "expired";
      } else {
        status = "active";
        timeRemaining = endTs ? Math.floor((endTs - nowTs) / 1000) : 0;
      }

      return {
        ...event,
        status,
        timeToStart,
        timeRemaining,
        formattedStart: formatTime(timeToStart),
        formattedRemain: formatTime(timeRemaining),
      };
    }

    // For SCHEDULE EVENT (weekly)
    const today = now.toLocaleString("en-US", { weekday: "long" });
    const isTodayActive = event.days?.includes(today);

    if (!isTodayActive)
      return { ...event, status: "inactive", formattedStart: "00:00:00", formattedRemain: "00:00:00" };

    const [sh, sm] = event.startTime.split(":").map(Number);
    const [eh, em] = event.endTime.split(":").map(Number);

    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em);

    const nowTs = now.getTime();
    const startTs = start.getTime();
    const endTs = end.getTime();

    let status = "inactive";
    let timeToStart = 0;
    let timeRemaining = 0;

    if (nowTs < startTs) {
      status = "upcoming";
      timeToStart = Math.floor((startTs - nowTs) / 1000);
    } else if (nowTs >= startTs && nowTs <= endTs) {
      status = "active";
      timeRemaining = Math.floor((endTs - nowTs) / 1000);
    } else {
      status = "expired";
    }

    return {
      ...event,
      status,
      timeToStart,
      timeRemaining,
      formattedStart: formatTime(timeToStart),
      formattedRemain: formatTime(timeRemaining),
    };
  };

  return (
    <div className="event-page">
      <div className="timer">
        <strong>Current Time:</strong> {currentTime}
      </div>

      <h2>
        <strong>ClassEvent</strong> - <strong>{department}</strong> -{" "}
        <strong>{semester}</strong> - <strong>{shift}</strong>
      </h2>

      {showFilters && (
        <div className="event-filters show">
          <select className="hh78"  value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option className="hh78"  value="">Select Department</option>
            <option className="hh78"  value="CST">CST</option>
            <option className="hh78"  value="Electrical">Electrical</option>
            <option className="hh78"  value="Civil Technology">Civil Technology</option>
          </select>

          <select className="hh78"  value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option className="hh78"  value="">Select Semester</option>
            {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((s) => (
              <option className="hh78"  key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select className="hh78"  value={shift} onChange={(e) => setShift(e.target.value)}>
            <option className="hh78"  value="">Select Shift</option>
            <option className="hh78"  value="Morning">Morning</option>
            <option className="hh78"  value="Day">Day</option>
          </select>
        </div>
      )}

      {student.admin === "yes" && (
        <div onClick={() => setModalOpen(true)}><img className="adder1" src={add} alt="add" /></div>
      )}

      {events.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <div className="event-cards-container">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={computeWeeklyStatus(ev)}
              student={student}
              onVote={handleVote}
              onDelete={handleDelete}
              onEdit={(ev) => {
                setEditEvent(ev);
                setModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {student.admin === "yes" && (
        <EventFormModal
          show={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditEvent(null);
          }}
          onSave={handleAddEditEvent}
          initialData={editEvent}
        />
      )}
    </div>
  );
}
