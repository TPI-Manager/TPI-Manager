import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useSSE } from "../hooks/useSSE";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "Staff";
    const shift = student.shift || "General";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [selectedImages, setSelectedImages] = useState([]);
    const [viewerImage, setViewerImage] = useState(null);
    const bottomRef = useRef();

    // Fetch Initial
    const fetchMessages = useCallback(async () => {
        const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;
        try {
            const res = await axios.get(`${API_BASE}/api/chat?room=${room}`);
            setMessages(res.data);
        } catch (e) { console.error(e); }
    }, [department, semester, shift]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    // Realtime via SSE
    useSSE(useCallback((msg) => {
        const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;
        if (msg.type === `chat-${room}`) {
            if (msg.data.action === "create") {
                setMessages(prev => [...prev, msg.data.data]);
            } else if (msg.data.action === "delete") {
                setMessages(prev => prev.filter(m => m.id !== msg.data.id));
            }
        }
    }, [department, semester, shift]));

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const uploadFiles = async () => {
        if (selectedImages.length === 0) return [];
        const formData = new FormData();
        selectedImages.forEach(file => formData.append("images", file));
        formData.append("ownerId", userId);
        const res = await axios.post(`${API_BASE}/api/upload`, formData);
        return res.data.files || [];
    };

    const sendMessage = async () => {
        if (!text && selectedImages.length === 0) return;
        const imgs = await uploadFiles();
        const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;
        await axios.post(`${API_BASE}/api/chat`, {
            text,
            senderId: userId,
            senderName: student.fullName,
            room,
            department, semester, shift,
            images: imgs,
            seenBy: []
        });
        setText(""); setSelectedImages([]);
    };

    const deleteMessage = async (id) => {
        if (window.confirm("Delete?")) {
            try {
                await axios.delete(`${API_BASE}/api/chat/${id}`, { headers: { 'x-user-id': userId } });
            } catch { alert("Can only delete own messages"); }
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header-info">Room: {department} ({semester})</div>
            <div className="messages-area">
                {messages.map((m, i) => {
                    const isMe = m.senderId === userId;
                    return (
                        <div key={i} className={`message-row ${isMe ? "mine" : "theirs"}`}>
                            <div className="bubble">
                                <div className="msg-header"><span>{m.senderName}</span></div>
                                {m.images && m.images.map((img, idx) => <img key={idx} src={img} onClick={() => setViewerImage(img)} className="chat-img" />)}
                                {m.text && <div>{m.text}</div>}
                                {isMe && <button onClick={() => deleteMessage(m.id)} className="delete-btn">🗑</button>}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            {/* Input Area (Same as before) */}
            <div className="input-area-wrapper">
                <div className="input-area">
                    <label>📷 <input type="file" multiple onChange={e => setSelectedImages(Array.from(e.target.files))} hidden /></label>
                    <input value={text} onChange={e => setText(e.target.value)} placeholder="Type..." />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
            {viewerImage && <div className="image-viewer-overlay" onClick={() => setViewerImage(null)}><img src={viewerImage} /></div>}
        </div>
    );
}