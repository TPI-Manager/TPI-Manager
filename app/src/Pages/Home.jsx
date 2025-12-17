import React, { useState } from "react";
import HomeSidebar from "../components/HomeSidebar";
import Announcements from "./Announcements";
import EventPage from "./EventPage";
import SchedulePage from "./SchedulePage";
import Chat from "./Chat";
import Ask from "./Ask";
import Info from "../components/Info";
import Signup from "../components/Signup";
import "../Styles/home.css";

export default function Home({ loggedStudent, setLoggedStudent, theme, toggleTheme }) {
    const [page, setPage] = useState("Announcements");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handlePageChange = (newPage) => {
        setPage(newPage);
        setSidebarOpen(false);
    };

    return (
        <div className="home-layout">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
                <i className="bi bi-list"></i>
            </button>

            <aside className={`sidebar-wrapper ${sidebarOpen ? "active" : ""}`}>
                <HomeSidebar
                    student={loggedStudent}
                    setPage={handlePageChange}
                    currentPage={page}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onLogout={() => setLoggedStudent(null)}
                    closeSidebar={() => setSidebarOpen(false)}
                />
            </aside>

            {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

            <main className="content-area">
                <header className="page-header">
                    <h1>{page.replace(/([A-Z])/g, ' $1').trim()}</h1>
                    <div className="user-badge">
                        <i className="bi bi-person-circle"></i> {loggedStudent.fullName} ({loggedStudent.role})
                    </div>
                </header>
                <div className="scrollable-content fade-in">
                    {page === "Announcements" && <Announcements student={loggedStudent} />}
                    {page === "Events" && <EventPage student={loggedStudent} />}
                    {page === "Schedule" && <SchedulePage student={loggedStudent} />}
                    {page === "Chat" && <Chat student={loggedStudent} />}
                    {page === "Ask" && <Ask student={loggedStudent} />}
                    {page === "Info" && <Info student={loggedStudent} />}
                    {page === "Add User" && <Signup isPublic={false} />}
                </div>
            </main>
        </div>
    );
}