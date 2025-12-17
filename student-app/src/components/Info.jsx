import React, { useState } from "react";
import axios from "axios";
import "../Styles/info.css";
import Signup from "../components/Signup.jsx";

const API = "http://localhost:4000/api";

export default function Info({ student }) {
  const [searchId, setSearchId] = useState("");
  const [fetchedStudent, setFetchedStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  if (!student) return <h2>No student data found.</h2>;

  const role =
    student.admin === "yes"
      ? "admin"
      : student.teacher === "yes"
      ? "teacher"
      : "student";

  const {
    firstName,
    middleName,
    lastName,
    fullName,
    email,
    phone,
    studentId,
    admin,
    teacher,
    department,
    roll,
    address,
    semester,
    shift,
    guardianName,
    guardianPhone,
    createdAt,
    updatedAt,
  } = student;

  const displayName = fullName || `${firstName} ${lastName}`;
  const maskedId = `${studentId.slice(0, 2)}***${studentId.slice(-2)}`;

  // Search function
  const handleSearch = async () => {
    if (!searchId) return;
    try {
      const res = await axios.get(`${API}/student/${searchId}`);
      setFetchedStudent(res.data);
      setEditData(res.data);
      setEditMode(false);
    } catch (err) {
      alert("Student not found");
      setFetchedStudent(null);
    }
  };

  // Edit function
  const handleEdit = () => {
    if (!fetchedStudent) return;
    if (role === "teacher" || role === "admin") {
      setEditMode(true);
    } else {
      alert("You cannot edit this student");
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      const res = await axios.put(
        `${API}/student/${fetchedStudent.studentId}`,
        editData
      );
      setFetchedStudent(res.data);
      setEditMode(false);
      alert("Updated successfully");
    } catch (err) {
      alert("Update failed");
    }
  };

  // Render student info
  const renderStudentInfo = (stu, isEditable = false) => {
    const data = isEditable ? editData : stu;
    const setData = isEditable ? setEditData : () => {};

    return (
      <div className="student-info">
        <h1>{data.fullName || `${data.firstName} ${data.lastName}`}</h1>
        <p>
          <strong>Student ID:</strong> {data.studentId}
        </p>
        {isEditable ? (
          <div className="edit-form">
  <input
    value={data.firstName || ""}
    onChange={(e) => setData({ ...data, firstName: e.target.value })}
    placeholder="First Name"
  />
  <input
    value={data.middleName || ""}
    onChange={(e) => setData({ ...data, middleName: e.target.value })}
    placeholder="Middle Name"
  />
  <input
    value={data.lastName || ""}
    onChange={(e) => setData({ ...data, lastName: e.target.value })}
    placeholder="Last Name"
  />
  <input
    value={data.email || ""}
    onChange={(e) => setData({ ...data, email: e.target.value })}
    placeholder="Email"
  />
  <input
    value={data.phone || ""}
    onChange={(e) => setData({ ...data, phone: e.target.value })}
    placeholder="Phone"
  />

  {/* Select Fields */}
  <select
    value={data.department || ""}
    onChange={(e) => setData({ ...data, department: e.target.value })}
  >
    <option value="">Select Department</option>
    <option value="Civil Technology">Civil Technology</option>
    <option value="CST">CST</option>
    <option value="Electrical Technology">Electrical Technology</option>
  </select>

  <input
    value={data.roll || ""}
    onChange={(e) => setData({ ...data, roll: e.target.value })}
    placeholder="Roll"
  />
  <input
    value={data.address || ""}
    onChange={(e) => setData({ ...data, address: e.target.value })}
    placeholder="Address"
  />

  <select
    value={data.semester || ""}
    onChange={(e) => setData({ ...data, semester: e.target.value })}
  >
    <option value="">Select Semester</option>
    <option value="1st">1st</option>
    <option value="2nd">2nd</option>
    <option value="3rd">3rd</option>
    <option value="4th">4th</option>
    <option value="5th">5th</option>
    <option value="6th">6th</option>
    <option value="7th">7th</option>
    <option value="8th">8th</option>
  </select>

  <select
    value={data.shift || ""}
    onChange={(e) => setData({ ...data, shift: e.target.value })}
  >
    <option value="">Select Shift</option>
    <option value="Morning">Morning</option>
    <option value="Day">Day</option>
  </select>

  <input
    value={data.guardianName || ""}
    onChange={(e) => setData({ ...data, guardianName: e.target.value })}
    placeholder="Guardian Name"
  />
  <input
    value={data.guardianPhone || ""}
    onChange={(e) => setData({ ...data, guardianPhone: e.target.value })}
    placeholder="Guardian Phone"
  />

  <select
    value={data.admin || "no"}
    onChange={(e) => setData({ ...data, admin: e.target.value })}
  >
    <option value="no">Student</option>
    <option value="yes">Admin</option>
  </select>

  <select
    value={data.teacher || "no"}
    onChange={(e) => setData({ ...data, teacher: e.target.value })}
  >
    <option value="no">Student</option>
    <option value="yes">Teacher</option>
  </select>

  <button onClick={handleSave}>Save Changes</button>
</div>

        ) : (
          <>
            <p>
              <strong>Email:</strong> {data.email || "N/A"}
            </p>
            <p>
              <strong>Phone:</strong> {data.phone || "N/A"}
            </p>
            <p>
              <strong>Department:</strong> {data.department || "N/A"}
            </p>
            <p>
              <strong>Roll:</strong> {data.roll || "N/A"}
            </p>
            <p>
              <strong>Address:</strong> {data.address || "N/A"}
            </p>
            <p>
              <strong>Semester:</strong> {data.semester || "N/A"}
            </p>
            <p>
              <strong>Shift:</strong> {data.shift || "N/A"}
            </p>
            <p>
              <strong>Guardian:</strong> {data.guardianName || "N/A"} (
              {data.guardianPhone || "N/A"})
            </p>
            <p
              style={{ color: data.admin === "yes" ? "red" : "inherit" }}
            >
              <strong>Admin:</strong> {data.admin || "no"}
            </p>
            <p
              style={{ color: data.teacher === "yes" ? "blue" : "inherit" }}
            >
              <strong>Teacher:</strong> {data.teacher || "no"}
            </p>
            <p>
              <strong>Joined:</strong>{" "}
              {data.createdAt
                ? new Date(data.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
            <p>
              <strong>Last Updated:</strong>{" "}
              {data.updatedAt
                ? new Date(data.updatedAt).toLocaleDateString()
                : "N/A"}
            </p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="info-container">
      {/* Own Info */}
      <div className="student-info">
        <h1>{displayName}</h1>
        <p>
          <strong>Student ID:</strong> {maskedId}
        </p>
        <p>
          <strong>Email:</strong> {email || "N/A"}
        </p>
        <p>
          <strong>Phone:</strong> {phone || "N/A"}
        </p>
        <p>
          <strong>Department:</strong> {department || "N/A"}
        </p>
        <p>
          <strong>Roll:</strong> {roll || "N/A"}
        </p>
        <p>
          <strong>Address:</strong> {address || "N/A"}
        </p>
        <p>
          <strong>Semester:</strong> {semester || "N/A"}
        </p>
        <p>
          <strong>Shift:</strong> {shift || "N/A"}
        </p>
        <p>
          <strong>Guardian:</strong> {guardianName || "N/A"} (
          {guardianPhone || "N/A"})
        </p>
        <p style={{ color: admin === "yes" ? "red" : "inherit" }}>
          <strong>Admin:</strong> {admin || "no"}
        </p>
        <p style={{ color: teacher === "yes" ? "blue" : "inherit" }}>
          <strong>Teacher:</strong> {teacher || "no"}
        </p>
        <p>
          <strong>Joined:</strong>{" "}
          {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
        </p>
        <p>
          <strong>Last Updated:</strong>{" "}
          {updatedAt ? new Date(updatedAt).toLocaleDateString() : "N/A"}
        </p>
      </div>

      {/* Check/Edit Section */}
      {(role === "teacher" || role === "admin") && (
        <div className="yy6"><div className="check-edit-section">
          <h2>Check & Edit Student Info</h2>
        <div className="rr12">  <input 
            type="text"
            placeholder="Enter Student ID"
            value={searchId}
            onChange={(e) =>
              setSearchId(e.target.value.replace(/\D/g, "").slice(0, 7))
            }
          /><button onClick={handleSearch}>Search</button></div>
          
</div>
          {fetchedStudent && (
            <div>
              {renderStudentInfo(fetchedStudent)}
              <button className="po12edit" onClick={handleEdit}>Edit</button>
              {editMode && renderStudentInfo(fetchedStudent, true)}
            </div>
          )}
        </div>
      )}

      {/* Admin-only Signup */}
      {role === "admin" && (
        <div className="admin-signup-section">
          
          <Signup student={student} />
        </div>
      )}
    </div>
  );
}
