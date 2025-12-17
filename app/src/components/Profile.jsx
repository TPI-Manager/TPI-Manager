import React from "react";
import "../Styles/profile.css";

export default function Profile({ name, id }) {
    return (
        <div className="profile">
            <div className="avatar">{name.charAt(0)}</div>
            <div className="info">
                <div className="name">{name}</div>
                <div className="id">{id}</div>
            </div>
        </div>
    );
}