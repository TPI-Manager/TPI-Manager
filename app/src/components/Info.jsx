import React, { useState } from "react";
import EditProfileModal from "./EditProfileModal";
import "../Styles/info.css";

export default function Info({ student, setLoggedStudent }) {
    const [showEdit, setShowEdit] = useState(false);

    // Only Admin can edit their credentials via this specific modal logic
    const isAdmin = student.role === "admin";

    const handleUpdateSuccess = (updatedUser) => {
        setLoggedStudent(updatedUser);
        // LocalStorage update handled by App.jsx effect
    };

    return (
        <div className="info-container">
            <h2>Profile Information</h2>
            <div className="info-card">
                <p><strong>Name:</strong> {student.fullName}</p>
                <p><strong>ID / Username:</strong> {student.id}</p>
                <p><strong>Role:</strong> {student.role ? student.role.toUpperCase() : "STUDENT"}</p>
                {student.department && <p><strong>Dept:</strong> {student.department}</p>}
            </div>

            {isAdmin && (
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button onClick={() => setShowEdit(true)}>
                        <i className="bi bi-shield-lock"></i> Update Admin Credentials
                    </button>
                    <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
                        Click here to change your username or password.
                    </p>
                </div>
            )}

            {showEdit && (
                <EditProfileModal
                    student={student}
                    onClose={() => setShowEdit(false)}
                    onUpdateSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
}