import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "Staff";
    const shift = student.shift || "General";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;
    const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;
    const isAdmin = student.role === "admin"; // Check admin role

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [selectedImages, setSelectedImages] = useState([]);
    const [viewerImage, setViewerImage] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const bottomRef = useRef();

    const fetchMessages = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/chat?room=${room}`);
            setMessages(res.data);
        } catch (error) {
            console.error(error);
        }
    }, [room]);

    useEffect(() => {
        const load = async () => {
            await fetchMessages();
        };
        load();
    }, [fetchMessages]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [messages]);

    useRealtime('chat', (payload) => {
        if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
    }, 'room', room);

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

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`${API_BASE}/api/chat/${deleteTarget}`, { headers: { 'x-user-id': userId } });
            setDeleteTarget(null);
        } catch {
            toast.error("Can only delete own messages");
            setDeleteTarget(null);
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
                                    {(isMe || isAdmin) && (
                                        <span className="delete-icon" onClick={() => setDeleteTarget(m.id)}>
                                            <i className="bi bi-trash"></i>
                                        </span>
                                    )}
                                    <span className="time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <Modal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete Message"
                footer={
                    <>
                        <button className="secondary-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                        <button style={{ backgroundColor: 'var(--error)' }} onClick={confirmDelete}>Delete</button>
                    </>
                }
            >
                <p>Are you sure you want to delete this message?</p>
            </Modal>

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