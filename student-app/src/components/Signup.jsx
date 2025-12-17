import React, { useState } from "react";
import axios from "axios";
import "../Styles/Signup.css";

const API = "http://localhost:4000/api";

export default function Signup({ fetchStudents }) {
  const [form, setForm] = useState({
    studentId: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    roll: "",
    address: "",
    semester: "",
    shift: "",
    guardianName: "",
    guardianPhone: "",
    admin: "no",
    teacher: "no"
  });

  const generatePassword = () => {
    const pass = Math.floor(10000 + Math.random() * 90000).toString();
    setForm({ ...form, password: pass });
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "studentId") value = value.replace(/\D/g, "").slice(0, 7);
    if (name === "firstName") value = value.replace(/[^A-Za-z]/g, "").slice(0, 10);
    if (name === "lastName") {
      if (value.trim().split(" ").length <= 2) value = value.replace(/[^A-Za-z ]/g, "").slice(0, 20);
    }
    if (name === "phone" || name === "guardianPhone") value = value.replace(/\D/g, "");
    if (name === "roll") {
      value = value.replace(/\D/g, "");
      if (Number(value) > 200) value = "200";
    }
    if (name === "guardianName") {
      if (value.trim().split(" ").length <= 3) value = value.replace(/[^A-Za-z ]/g, "");
    }

    setForm({ ...form, [name]: value });
  };

  const handleSave = async () => {
    if (!form.studentId) return alert("Student ID required");
    if (!form.password) return alert("Password required");
    if (!form.department) return alert("Select Department");
    if (!form.semester) return alert("Select Semester");
    if (!form.shift) return alert("Select Shift");

    try {
      const res = await axios.post(`${API}/student`, form);

      if (res.data.message === "duplicate") {
        return alert("Student ID already exists!");
      }

      alert("Student Saved!\nPassword: " + form.password);

      setForm({
        studentId: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "",
        roll: "",
        address: "",
        semester: "",
        shift: "",
        guardianName: "",
        guardianPhone: "",
        admin: "no",
        teacher: "no"
      });

      fetchStudents?.();
    } catch (err) {
      console.error(err);
      alert("Error saving student");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h2>Add Student</h2>

        <div>
          <label>Admin: </label>
          <select name="admin" className="aq1" value={form.admin} onChange={handleChange}>
            <option value="no" className="aq1">Student</option>
            <option value="yes" className="aq1">Admin</option>
          </select>
        </div>

        <div>
          <label>Teacher: </label>
          <select name="teacher" className="aq2" value={form.teacher} onChange={handleChange}>
            <option value="no" className="aq2">Student</option>
            <option value="yes" className="aq2">Teacher</option>
          </select>
        </div>

        <input className="aq3"
          name="studentId"
          placeholder="Student ID (max 7 digits)"
          value={form.studentId}
          onChange={handleChange}
        />

        <div>
          <input className="aq3"
            name="password"
            placeholder="Password (auto 5 digits)"
            value={form.password}
            readOnly
          />
          <button onClick={generatePassword}>Generate Password</button>
        </div>

        <input className="aq3"
          name="firstName"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
        />

        <input className="aq3"
          name="lastName"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
        />

        <input className="aq3"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input className="aq3"
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
        />

        <select className="aq1" name="department" value={form.department} onChange={handleChange}>
          <option className="aq1" value="">Select Department</option>
          <option className="aq1" value="Civil Technology">Civil Technology</option>
          <option className="aq1" value="CST">CST</option>
          <option className="aq1" value="Electrical Technology">Electrical Technology</option>
        </select>

        <input className="aq3"
          name="roll"
          placeholder="Roll (max 200)"
          value={form.roll}
          onChange={handleChange}
        />

        <input className="aq3"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
        />

        <select className="aq1" name="semester" value={form.semester} onChange={handleChange}>
          <option className="aq1" value="">Select Semester</option>
          <option className="aq1" value="1st">1st</option>
          <option className="aq1" value="2nd">2nd</option>
          <option className="aq1" value="3rd">3rd</option>
          <option className="aq1" value="4th">4th</option>
          <option className="aq1" value="5th">5th</option>
          <option className="aq1" value="6th">6th</option>
          <option className="aq1" value="7th">7th</option>
          <option className="aq1" value="8th">8th</option>
        </select>

        <select className="aq1" name="shift" value={form.shift} onChange={handleChange}>
          <option className="aq1" value="">Select Shift</option>
          <option className="aq1" value="Morning">Morning</option>
          <option className="aq1" value="Day">Day</option>
        </select>

        <input className="aq3"
          name="guardianName"
          placeholder="Guardian Name"
          value={form.guardianName}
          onChange={handleChange}
        />

        <input className="aq3"
          name="guardianPhone"
          placeholder="Guardian Phone"
          value={form.guardianPhone}
          onChange={handleChange}
        />

        <button className="aq4" onClick={handleSave} style={{ marginTop: "10px" }}>
          Save
        </button>
      </div>
    </div>
  );
}