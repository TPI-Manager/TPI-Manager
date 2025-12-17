import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "../Styles/signup.css";

export default function Signup({ isPublic = false, onSwitchToLogin }) {
    const [userType, setUserType] = useState("student");
    const [form, setForm] = useState({
        id: "", password: "", firstName: "", lastName: "",
        department: "CST", semester: "1st", shift: "Morning",
    });
    const [status, setStatus] = useState("");

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSave = async () => {
        if (!form.id || !form.password) {
            setStatus("ID and Password required");
            return;
        }

        const payload = {
            ...form,
            userType: isPublic ? "student" : userType,
            // Map generic ID field to specific ones for backward compatibility or clarity if needed, 
            // but backend checks 'id', 'studentId', 'employeeId'. 
            studentId: (isPublic || userType === 'student') ? form.id : undefined,
            employeeId: (userType === 'teacher') ? form.id : undefined,
            adminId: (userType === 'admin') ? form.id : undefined
        };

        try {
            const res = await axios.post(`${API_BASE}/api/auth/create`, payload);
            if (res.data.message === "duplicate") {
                setStatus("Error: User ID already exists.");
            } else {
                setStatus("Success: Account created!");
                if (isPublic) {
                    setTimeout(() => onSwitchToLogin(), 1500);
                } else {
                    setForm({ ...form, id: "", password: "", firstName: "", lastName: "" });
                }
            }
        } catch (err) {
            console.error(err);
            setStatus("Server Error.");
        }
    };

    return (
        <div className={isPublic ? "signup-wrapper" : ""}>
            <div className={isPublic ? "form-card" : "internal-form-card"}>
                {isPublic ? (
                    <div className="brand-header">
                        <h1>Join TPI Manager</h1>
                        <p>Create your student profile</p>
                    </div>
                ) : (
                    <h2>Create New User</h2>
                )}

                <div className="form-grid">
                    {!isPublic && (
                        <div className="form-group full-width">
                            <label>User Type</label>
                            <select value={userType} onChange={e => setUserType(e.target.value)}>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label>
                            {userType === 'student' ? 'Student ID' :
                                userType === 'teacher' ? 'Employee ID' : 'Admin Username'}
                        </label>
                        <input name="id" value={form.id} onChange={handleChange} placeholder="Unique ID" />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input name="password" type="password" value={form.password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>First Name</label>
                        <input name="firstName" value={form.firstName} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input name="lastName" value={form.lastName} onChange={handleChange} />
                    </div>

                    {(userType === 'student' || userType === 'teacher') && (
                        <div className="form-group">
                            <label>Department</label>
                            <select name="department" value={form.department} onChange={handleChange}>
                                <option value="CST">Computer Science (CST)</option>
                                <option value="Civil Technology">Civil Technology</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Mechanical">Mechanical</option>
                            </select>
                        </div>
                    )}

                    {userType === 'student' && (
                        <>
                            <div className="form-group">
                                <label>Semester</label>
                                <select name="semester" value={form.semester} onChange={handleChange}>
                                    {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Shift</label>
                                <select name="shift" value={form.shift} onChange={handleChange}>
                                    <option value="Morning">Morning</option>
                                    <option value="Day">Day</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {status && <div className={`status-msg ${status.includes("Success") ? "ok" : "err"}`}>{status}</div>}

                <button className="save-btn" onClick={handleSave}>
                    {isPublic ? "Sign Up" : "Create Account"}
                </button>

                {isPublic && (
                    <div className="auth-footer">
                        <p>Already have an account?</p>
                        <button className="link-btn" onClick={onSwitchToLogin}>Login here</button>
                    </div>
                )}
            </div>
        </div>
    );
}