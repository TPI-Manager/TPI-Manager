import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Home from "./Pages/Home";
import "./App.css";

export default function App() {
  const [loggedStudent, setLoggedStudent] = useState(null);

  // ✅ Theme logic (optional, same as before)
  const getInitialTheme = () => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };
  const [theme, setTheme] = useState(getInitialTheme);
  const [isManual, setIsManual] = useState(!!localStorage.getItem("theme"));

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    const bgImg = theme === "dark" ? "/darkmode.png" : "/lightmode.png";
    document.body.style.backgroundImage = `url(${bgImg})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    if (isManual) localStorage.setItem("theme", theme);
  }, [theme, isManual]);

  return (
    <div style={{margin: 0 }}>
      {loggedStudent ? (
        <Home
          loggedStudent={loggedStudent}
          theme={theme}
          setTheme={(t) => {
            setTheme(t);
            setIsManual(true);
            localStorage.setItem("theme", t);
          }}
        />
      ) : (
        <>
          <Login setLoggedStudent={setLoggedStudent} />
         
        </>
      )}
    </div>
  );
}
