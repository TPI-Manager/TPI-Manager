// src/Pages/SchedulePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import ScheduleCard from "../components/ScheduleCard";
import ScheduleFormModal from "../components/ScheduleFormModal";
import "../Styles/schedule.css";
 import add from "../assets/add.svg";

const API = "http://localhost:5004/api";

export default function SchedulePage({ student }) {
  // student should contain: studentId, department, semester, shift, admin === "yes" if admin
  const isAdmin = !!(student && student.admin === "yes");

// Teacher filters state
const [showFilters, setShowFilters] = useState(false);

// Fix useEffect — prevent crash
useEffect(() => {
  if (student && student.teacher === "yes") {
    setShowFilters(true);
  } else {
    setShowFilters(false);
  }
}, [student]);



  // default selectors (fall back to common values when student not provided)
  const [department, setDepartment] = useState(student?.department || "CST");
  const [semester, setSemester] = useState(student?.semester || "1st");
  const [shift, setShift] = useState(student?.shift || "Morning");

  const weekDays = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Admin UI
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState(null); // when admin clicks a week-day

  // Fetch schedules from backend for selected dept/sem/shift
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/schedules/${department}/${semester}/${shift}`
      );
      const data = Array.isArray(res.data) ? res.data : [];

      // normalize: ensure days is array, ensure id exists
      const normalized = data.map((s) => ({
        ...s,
        days: Array.isArray(s.days) ? s.days : [],
        department: s.department || department,
        semester: s.semester || semester,
        shift: s.shift || shift,
      }));

      // sort by start time (for weekly times like "08:30" or ISO strings)
      normalized.sort((a, b) => {
        const ta = parseStartToComparable(a.startTime);
        const tb = parseStartToComparable(b.startTime);
        return ta - tb;
      });

      setSchedules(normalized);
    } catch (err) {
      console.error("fetchSchedules:", err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const iv = setInterval(fetchSchedules, 60 * 1000); // refresh every minute
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, semester, shift]);

  // helpers
  const todayName = new Date().toLocaleString("en-US", { weekday: "long" });
  const nextName = (() => {
    const idx = weekDays.indexOf(todayName);
    return weekDays[(idx + 1) % 7] || weekDays[0];
  })();

  // Student view lists: only today & next day
  const todayList = useMemo(
    () => schedules.filter((s) => Array.isArray(s.days) && s.days.includes(todayName)),
    [schedules, todayName]
  );
  const nextList = useMemo(
    () => schedules.filter((s) => Array.isArray(s.days) && s.days.includes(nextName)),
    [schedules, nextName]
  );

  // Admin week-day view with priority: first items that include clicked day, then others
  const getWeekdayView = (day) => {
  if (!day) return [];
  return schedules
    .filter((s) => Array.isArray(s.days) && s.days.includes(day))
    .sort((a, b) => parseStartToComparable(a.startTime) - parseStartToComparable(b.startTime));
};

  const getWeekdayViewWithSecondary = (day) => {
    if (!day) return [];
    const primary = schedules.filter((s) => Array.isArray(s.days) && s.days.includes(day));
    const secondary = schedules.filter((s) => !Array.isArray(s.days) || !s.days.includes(day));
    // sort both by start time
    primary.sort((a, b) => parseStartToComparable(a.startTime) - parseStartToComparable(b.startTime));
    secondary.sort((a, b) => parseStartToComparable(a.startTime) - parseStartToComparable(b.startTime));

    // return primary first; then secondary but avoid duplicates (they shouldn't overlap)
    return [...primary, ...secondary];
  };

  // Add / Edit schedule (modal submit)
const handleSave = async (payload) => {
  try {
    const body = {
      ...payload,
      department,
      semester,
      shift,
      createdBy: student?.studentId || "admin",
    };
    const res = await axios.post(`${API}/schedules`, body);

    // নতুন/updated schedule কে state এ inject করা
    setSchedules(prev => {
      const index = prev.findIndex(s => s.id === res.data.id);
      if (index !== -1) {
        // edit হলে replace
        const newArr = [...prev];
        newArr[index] = res.data;
        return newArr;
      } else {
        // add হলে push
        return [...prev, res.data];
      }
    });

    setShowModal(false);
    setEditData(null);
  } catch (err) {
    console.error("save schedule:", err);
    alert(err.response?.data?.error || "Save failed");
  }
};


  // onDelete পরিবর্তন
const handleDelete = async (schedule) => {
  if (!window.confirm(`"${schedule.title}" কি আপনি মুছে দিতে চান?`)) return;
  try {
    await axios.delete(`${API}/schedules/${schedule.department}/${schedule.semester}/${schedule.shift}/${schedule.id}`);
    // শুধু state থেকে remove করো, page reload দরকার নেই
    setSchedules(prev => prev.filter(s => s.id !== schedule.id));
  } catch (err) {
    console.error("delete schedule:", err);
    alert("Delete failed");
  }
};


const handleEdit = (schedule) => {
  setEditData(schedule);
  setShowModal(true);
};


  // utils
  function parseStartToComparable(start) {
    // returns number comparable for sorting:
    // if ISO datetime -> timestamp
    // if "HH:MM" -> minutes since midnight
    if (!start) return Infinity;
    if (typeof start === "string" && start.includes("T")) {
      const t = Date.parse(start);
      return Number.isNaN(t) ? Infinity : t;
    }
    // expected "HH:MM"
    if (typeof start === "string" && start.includes(":")) {
      const [hh, mm] = start.split(":").map((x) => parseInt(x, 10) || 0);
      return hh * 60 + mm;
    }
    return Infinity;
  }

  // render
  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <div>
          <h2>
            Class Schedule — {department} — {semester} — {shift}
          </h2>
          <div style={{ fontSize: 13, color: "#666" }}>
            <span>{todayName}</span>
            <span style={{ margin: "0 6px" }}>|</span>
            <span>{nextName}</span>
          </div>
        </div>
{showFilters && (
  <div className="event-filters show">
    <select value={department} onChange={(e) => setDepartment(e.target.value)}>
      <option value="">Select Department</option>
      <option value="CST">CST</option>
      <option value="Electrical">Electrical</option>
      <option value="Civil Technology">Civil Technology</option>
    </select>

    <select value={semester} onChange={(e) => setSemester(e.target.value)}>
      <option value="">Select Semester</option>
      {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>

    <select value={shift} onChange={(e) => setShift(e.target.value)}>
      <option value="">Select Shift</option>
      <option value="Morning">Morning</option>
      <option value="Day">Day</option>
    </select>
  </div>
)}
      </div>

      {/* Admin weekly manager */}
      {isAdmin && (
        <div>
         <div className="week-days">
  {weekDays.map((d) => (
    <button
      key={d}
      className={selectedWeekDay === d ? "active" : ""}
      onClick={() => setSelectedWeekDay(selectedWeekDay === d ? null : d)}
    >
      {d}
    </button>
  ))}
</div><img className="adder1" src={add}onClick={() => { setEditData(null); setShowModal(true); }} alt="add" />
           {isAdmin && (
          <div>

            <div >
              </div>
          </div>
        )}

        
{selectedWeekDay && (
  <div style={{ marginBottom: 20 }}>
    <h3>{selectedWeekDay} — Weekly Manager</h3>
    <div>
      {getWeekdayView(selectedWeekDay).length === 0 ? (
        <p>No schedules for {selectedWeekDay}.</p>
      ) : (
        getWeekdayView(selectedWeekDay).map((s) => (
          <ScheduleCard
            key={s.id}
            schedule={s}
            isAdmin={isAdmin}
            onEdit={() => handleEdit(s)}
            onDelete={() => handleDelete(s)}
          />
        ))
      )}
    </div>
  </div>
)}

        </div>
      )}

      {/* Student / default: Today & Next Day boxes */}
   {/* Student / default: Today & Next Day boxes */}
<div
// শুধু relevant part দেখানো
 style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 18 }}>
  <div>
    <h3>Today ({todayName})</h3>
    {loading ? <p>Loading...</p> : todayList.length === 0 ? <p>No schedules for today.</p> :
      todayList.map(s => (
        <ScheduleCard
          key={s.id}
          schedule={s}
          isAdmin={isAdmin}
          onEdit={() => handleEdit(s)}
          onDelete={(sch) => {
            handleDelete(sch);
            // page reload নয়, state থেকে remove হবে
            setSchedules(prev => prev.filter(sc => sc.id !== s.id));
          }}
        />
      ))
    }
  </div>

  <div>
    <h3>Next Day ({nextName})</h3>
    {loading ? <p>Loading...</p> : nextList.length === 0 ? <p>No schedules for next day.</p> :
      nextList.map(s => (
        <ScheduleCard
          key={s.id}
          schedule={s}
          isAdmin={isAdmin}
          onEdit={() => handleEdit(s)}
          onDelete={(sch) => {
            handleDelete(sch);
            setSchedules(prev => prev.filter(sc => sc.id !== s.id));
          }}
        />
      ))
    }
  </div>
</div>



      {/* Modal for add/edit */}
      <ScheduleFormModal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setEditData(null);
        }}
        initialData={editData}
        onSave={handleSave}
      />
    </div>
  );
}
