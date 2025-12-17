import React, { useEffect, useState } from "react";
import HomeSidebar from "../components/HomeSidebar";
import Announcements from "../Pages/Announcements.jsx";
import EventPage from "../Pages/EventPage";
import SchedulePage from "../Pages/SchedulePage"; // ✅ Import SchedulePage
import "../Styles/home.css";
import Students from "../Pages/Students.jsx";
import Info from "../components/Info.jsx";
import Chat from "../Pages/Chat.jsx";
import Ask from "../Pages/Ask.jsx";
import Signup from "../components/Signup.jsx";

export default function Home({ loggedStudent, theme, setTheme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ By default Announcement open
  const [page, setPage] = useState("Announcements");

  useEffect(() => {
    if (window.innerWidth > 768) {
      setSidebarOpen(true);
    }
  }, []);


  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="home-layout">

      {/* ✅ Toggle Button (Always Visible on Mobile) */}
      <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
        ☰
      </button>

      {/* ✅ Overlay (Outside Click Close - Mobile Only) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* ✅ Sidebar */}
      <div className={`sidebar-container ${sidebarOpen ? "open" : ""}`}>
        <HomeSidebar
          setTheme={setTheme}
          setPage={(p) => {
            setPage(p);
            closeSidebar(); // ✅ Mobile এ page change হলে auto close
          }}
        />
      </div>

      {/* ✅ Page Container */}
      <div className="page-container">
        {page === "Announcements" && <Announcements student={loggedStudent}/>}
        {page === "Chat" && <Chat student={loggedStudent} />}
        {page === "Ask" && <Ask student={loggedStudent} />}
        {page === "event" && <EventPage student={loggedStudent} />}
        {page === "schedule" && <SchedulePage student={loggedStudent}  />} {/* ✅ Schedule */}
      {page === "info" && <Info student={loggedStudent} /> }
        {page === "Students" && <Students />}
        {page === "signup" && <Signup student={loggedStudent} />}
      </div>

    </div>
  );
}
