import React from "react";
import "../Styles/info.css";

export default function Info({ student }) {
    return (
        <div className="info-container">
            <h2>Profile Information</h2>
            <div className="info-card">
                <p><strong>Name:</strong> {student.fullName}</p>
                <p><strong>ID:</strong> {student.studentId}</p>
                <p><strong>Dept:</strong> {student.department}</p>
                <p><strong>Semester:</strong> {student.semester}</p>
                <p><strong>Role:</strong> {student.admin === "yes" ? "Administrator" : "Student"}</p>
            </div>
        </div>
    );
}