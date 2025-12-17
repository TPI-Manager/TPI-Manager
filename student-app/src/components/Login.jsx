import React, { useState } from "react";
import axios from "axios";
import "../Styles/login.css";

const API = "http://localhost:4000/api";

export default function Login({ setLoggedStudent }) {
  const [mode, setMode] = useState("student");
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLogin = async () => {
    if (!loginId || !loginPassword) return alert("Enter ID & Password");

    const payload = mode === "student"
      ? { studentId: loginId, password: loginPassword }
      : { phone: loginId, password: loginPassword };

    try {
      const res = await axios.post(`${API}/login`, payload);
      if (!res.data) return alert("Login failed: Student/Admin not found.");
      
      setLoggedStudent(res.data);
      alert(`Login successful! Welcome ${res.data.admin === "yes" ? "Admin" : res.data.fullName}`);
    } catch (err) {
      alert("Login failed: Invalid credentials");
      console.error(err);
    }
  };

  return (
    <div className="login-container" style={{ padding: "10px" }}>
      <h2>Login</h2>
      <input  className="eer5"
        placeholder={mode === "student" ? "Enter Student ID" : "Enter Phone Number"}
        value={loginId}
        onChange={(e) =>
          setLoginId(e.target.value.replace(/\D/g, "").slice(0, mode === "student" ? 7 : 14))
        }
      />
      <br />
      <input  className="er45"
        type="password"
        placeholder="Password"
        value={loginPassword}
        onChange={(e) =>
          setLoginPassword(e.target.value.replace(/\D/g, "").slice(0, 5))
        }
        style={{ marginTop: "8px" }}
      />
      <br />
      <p  className="ee77y"
        onClick={() => { setMode(mode === "student" ? "phone" : "student"); setLoginId(""); setLoginPassword(""); }}
        style={{ color: "blue", cursor: "pointer", marginTop: "5px", textDecoration: "underline" }}
      >
        {mode === "student" ? "Login with Phone" : "Login with Student ID"}
      </p>
      <button className="eerr5" style={{ marginTop: "10px" }} onClick={handleLogin}>Login</button>
    </div>
  );
}
