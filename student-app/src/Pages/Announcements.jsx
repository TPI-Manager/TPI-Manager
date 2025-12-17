import React, { useEffect, useState } from "react";
import axios from "axios";
import AnnouncementCard from "../components/AnnouncementCard";
import AnnouncementFormModal from "../components/AnnouncementFormModal";
import add from "../assets/add.svg";
import "../Styles/announcement.css";

const API = "http://localhost:4000/api";

export default function AnnouncementPage({ student }) {
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const isTeacher = student?.teacher === "yes";

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${API}/global-announcements`);
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSave = async (data) => {
    try {
      const res = await axios.post(`${API}/global-announcements`, {
        ...data,
        createdBy: student.studentId,
        id: editData?.id,
      });

      setAnnouncements(prev => {
        if (editData) {
          return prev.map(a => a.id === editData.id ? res.data : a);
        }
        return [res.data, ...prev];
      });

      setShowModal(false);
      setEditData(null);
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API}/global-announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const handleEdit = (data) => {
    setEditData(data);
    setShowModal(true);
  };

  return (
    <div className="announcement-page">
      <div className="announcement-header">
       <div className="ss4"> <h2 className="t1">National Announcements</h2>

        {isTeacher && (
          <img
            className="adder1"
            src={add}
            alt="add"
            onClick={() => {
              setEditData(null);
              setShowModal(true);
            }}
          />
        )}</div>
      </div>

      {announcements.length === 0 ? (
        <p className="t2">No announcements</p>
      ) : (
        <div className="announcement-grid">
          {announcements.map(a => (
            <AnnouncementCard
              key={a.id}
              data={a}
              isAdmin={isTeacher}
              onEdit={() => handleEdit(a)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {isTeacher && (
        <AnnouncementFormModal
          show={showModal}
          initialData={editData}
          onClose={() => {
            setShowModal(false);
            setEditData(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
