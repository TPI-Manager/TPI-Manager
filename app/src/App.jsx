import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Home from "./Pages/Home";
import "./index.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [loggedStudent, setLoggedStudent] = useState(() => {
    try {
      const saved = localStorage.getItem("student");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authView, setAuthView] = useState("login"); // 'login' or 'signup'
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (loggedStudent) localStorage.setItem("student", JSON.stringify(loggedStudent));
    else localStorage.removeItem("student");
  }, [loggedStudent]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <div className="app-root">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme={theme} />
      {loggedStudent ? (
        <Home
          loggedStudent={loggedStudent}
          setLoggedStudent={setLoggedStudent}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      ) : (
        authView === "login" ? (
          <Login
            setLoggedStudent={setLoggedStudent}
            onSwitchToSignup={() => setAuthView("signup")}
          />
        ) : (
          <Signup
            isPublic={true}
            onSwitchToLogin={() => setAuthView("login")}
          />
        )
      )}
    </div>
  );
}