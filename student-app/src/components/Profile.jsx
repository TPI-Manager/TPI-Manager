import React, { useState } from "react";
import "../Styles/Profile.css";

export default function Profile({
  name,
  studentId,
  shift,
  onSettingsClick,
}) {
  const [showId, setShowId] = useState(false);
  const maskedId = `${studentId.slice(0, 2)}******${studentId.slice(-2)}`;

  const handleShowId = () => {
    setShowId(true);
    setTimeout(() => setShowId(false), 3000);
  };

  return (
    <div
      className="profile"
      onMouseEnter={() => setShowId(true)}
      onMouseLeave={() => setShowId(false)}
      onClick={handleShowId}
    >
      <img src="/profile.png" alt="Profile" className="profile-icon" />

      <div className="profile-info">
        <p className="name">{name}</p>
        <p className="mobile">{maskedId}</p>
      </div>
    </div>
      
  );
}
