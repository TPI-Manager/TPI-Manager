import React, { useState } from "react";
import EditProfileModal from "./EditProfileModal";
import "../Styles/info.css";

export default function Info({ student, setLoggedStudent }) {
    const [showEdit, setShowEdit] = useState(false);

    const isAdmin = student.role === "admin";

    const handleUpdateSuccess = (updatedUser) => {
        // Update local storage and app state
        // Note: setLoggedStudent needs to be passed down from Home -> Info
        if (setLoggedStudent) setLoggedStudent(updatedUser);
    };

    return (
        <div className="info-container">
            <h2>Profile Information</h2>
            <div className="info-card">
                <p><strong>Name:</strong> {student.fullName}</p>
                <p><strong>ID:</strong> {student.id}</p>
                {student.department && <p><strong>Dept:</strong> {student.department}</p>}
                {student.semester && <p><strong>Semester:</strong> {student.semester}</p>}
                <p><strong>Role:</strong> {student.role ? student.role.toUpperCase() : "STUDENT"}</p>
            </div>

            {isAdmin && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button onClick={() => setShowEdit(true)}>Edit Credentials</button>
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