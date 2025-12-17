import React from "react";
import Profile from "./Profile";

export default function HomeSidebar({ student, setPage, currentPage, theme, toggleTheme, onLogout, closeSidebar }) {
    const isAdmin = student.role === "admin";

    const menuItems = [
        { id: "Announcements", label: "Announcements", icon: "bi-megaphone" },
        { id: "Events", label: "Events", icon: "bi-calendar-event" },
        { id: "Schedule", label: "Schedule", icon: "bi-calendar-week" },
        { id: "Chat", label: "Chat Room", icon: "bi-chat-dots" },
        { id: "Ask", label: "Q&A", icon: "bi-question-circle" },
        { id: "Info", label: "My Profile", icon: "bi-person-circle" },
    ];

    if (isAdmin) {
        menuItems.push({ id: "Add User", label: "Add User", icon: "bi-person-plus" });
    }

    return (
        <div className="sidebar-content">
            <div className="sidebar-header">
                <h2>TPI Manager</h2>
                <button className="close-btn" onClick={closeSidebar}>
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            <div className="profile-section">
                <Profile name={student.fullName} id={student.role} />
            </div>

            <nav className="nav-menu">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                        onClick={() => setPage(item.id)}
                    >
                        <i className={`bi ${item.icon}`}></i>
                        <span className="label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="theme-toggle" onClick={toggleTheme}>
                    <i className={`bi ${theme === "light" ? "bi-moon-stars" : "bi-sun"}`}></i>
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                </button>
                <button className="logout-btn" onClick={onLogout}>
                    <i className="bi bi-box-arrow-right"></i>
                    Log Out
                </button>
            </div>
        </div>
    );
}