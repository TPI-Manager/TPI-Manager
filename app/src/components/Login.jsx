import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import "../Styles/login.css";

import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

export default function Login({ setLoggedStudent, onSwitchToSignup }) {
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/api/auth/login`, {
                userId: loginId,
                password: password
            });

            const { firebaseToken, ...userData } = res.data;
            if (firebaseToken) {
                await signInWithCustomToken(auth, firebaseToken);
            }

            setLoggedStudent(userData);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Invalid ID or Password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="brand-header">
                    <h1>TPI Manager</h1>
                    <p>Portal Access</p>
                </div>
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>User ID</label>
                        <input
                            type="text"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="Student/Teacher/Admin ID"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button type="submit" disabled={loading} className="primary-btn">
                        {loading ? "Verifying..." : "Sign In"}
                    </button>
                </form>
                <div className="auth-footer">
                    <p>Student?</p>
                    <button className="link-btn" onClick={onSwitchToSignup}>Create Student Account</button>
                </div>
            </div>
        </div>
    );
}