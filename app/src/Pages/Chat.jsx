import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "Staff";
    const shift = student.shift || "General";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;
    const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [selectedImages, setSelectedImages] = useState([]);
    const [viewerImage, setViewerImage] = useState(null);
    const bottomRef = useRef();

    // 1. Initial Load
    useEffect(() => {
        axios.get(`${API_BASE}/api/chat?room=${room}`).then(res => {
            setMessages(res.data);
            scrollToBottom();
        });
    }, [room]);

    // 2. Realtime Subscription (Standard Supabase)
    useRealtime('chat', (payload) => {
        if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
            scrollToBottom();
        } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
    }, 'room', room);

    const scrollToBottom = () => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

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

        // Optimistic UI update (optional, but Realtime is usually fast enough)
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
            <div className="chat-header-info">
                <i className="bi bi-people-fill"></i> {department} • {semester}
            </div>

            <div className="messages-area">
                {messages.map((m, i) => {
                    const isMe = m.senderId === userId;
                    return (
                        <div key={i} className={`message-row ${isMe ? "mine" : "theirs"}`}>
                            {!isMe && <div className="avatar-small">{m.senderName.charAt(0)}</div>}
                            <div className="bubble">
                                {!isMe && <div className="msg-sender">{m.senderName}</div>}

                                {m.images && m.images.length > 0 && (
                                    <div className="msg-gallery">
                                        {m.images.map((img, idx) => (
                                            <img key={idx} src={img} onClick={() => setViewerImage(img)} />
                                        ))}
                                    </div>
                                )}

                                {m.text && <div className="msg-text">{m.text}</div>}

                                <div className="msg-meta">
                                    {isMe && <span className="delete-icon" onClick={() => deleteMessage(m.id)}>🗑</span>}
                                    <span className="time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="input-area-wrapper">
                {selectedImages.length > 0 && (
                    <div className="upload-preview">
                        <span>{selectedImages.length} images selected</span>
                        <button onClick={() => setSelectedImages([])}>Clear</button>
                    </div>
                )}
                <div className="input-area">
                    <label className="attach-btn">
                        <i className="bi bi-image"></i>
                        <input type="file" multiple onChange={e => setSelectedImages(Array.from(e.target.files))} hidden />
                    </label>
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                    />
                    <button className="send-btn" onClick={sendMessage}>
                        <i className="bi bi-send-fill"></i>
                    </button>
                </div>
            </div>

            {viewerImage && (
                <div className="image-viewer-overlay" onClick={() => setViewerImage(null)}>
                    <img src={viewerImage} alt="Full view" />
                </div>
            )}
        </div>
    );
}