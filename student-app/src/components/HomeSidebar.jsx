import React, { useState, useEffect } from "react";
import Profile from "../components/Profile";

export default function HomeSidebar({
  active,
  setTheme,
  theme: globalTheme,
  toggleSidebar,
  setPage,
  currentPage,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [localTheme, setLocalTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  // Apply theme + background + parent sync
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(localTheme);

    const bgImg = localTheme === "dark" ? "darkmode.png" : "lightmode.png";
    document.body.style.backgroundImage = `url('${bgImg}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";

    setTheme(localTheme);
    localStorage.setItem("theme", localTheme);
  }, [localTheme, setTheme]);

  const toggleTheme = () => {
    setLocalTheme(localTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const handler = (e) => {
      const sidebar = document.getElementById("sidebar");
      const menuToggle = document.querySelector(".menu-toggle");
      if (
        window.innerWidth <= 768 &&
        active &&
        sidebar &&
        !sidebar.contains(e.target) &&
        e.target !== menuToggle
      ) {
        toggleSidebar();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [active, toggleSidebar]);

  // Dummy student info
  const studentId = "1030512002";
  const name = "Maruf";
  const mobileNumber = "01777554789";

  // Sidebar menu items (✅ Added Schedule)
  const menuItems = [
    { page: "Announcements", icon: "📢", label: "Announcement" },
    { page: "event", icon: "📅", label: "Class Events" },
    { page: "schedule", icon: "🗓️", label: "Schedule" }, // ✅ New Schedule link
    { page: "Ask", icon: "❓", label: "Ask" },
    { page: "Chat", icon: "💬", label: "Chat Room" },
    { page: "info", icon: "ℹ️", label: "Info" },
  
  ];

  return (
    <aside className={`sidebar ${active ? "active" : ""}`} id="sidebar">
      {/* Profile */}
      <Profile
        name={name}
        studentId={studentId}
        mobileNumber={mobileNumber}
        onSettingsClick={() => setShowSettings((s) => !s)}
      />

      {/* Sidebar menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.page}
            className={currentPage === item.page ? "active" : ""}
            onClick={() => setPage(item.page)}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      {/* Settings popup */}
      <div className="settings-popup">
        <button  onClick={toggleTheme} className="po12edit">
          {localTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
    </aside>
  );
}
