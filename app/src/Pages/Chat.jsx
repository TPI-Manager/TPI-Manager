import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { SOCKET_URL, API_BASE, UPLOAD_URL } from "../config";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "Staff";
    const shift = student.shift || "General";

    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    const socketRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [selectedImages, setSelectedImages] = useState([]);
    const [viewerImage, setViewerImage] = useState(null);
    const bottomRef = useRef();

    useEffect(() => {
        // Setup Socket
        const s = io(SOCKET_URL, {
            path: "/socket.io",
            transports: ['websocket', 'polling'], // Force websocket stability
            reconnection: true
        });
        socketRef.current = s;

        const roomConfig = { type: "department", department, semester, shift };

        s.on("connect", () => {
            s.emit("joinChatRoom", roomConfig);
        });

        const onExisting = (msgs) => {
            const sorted = (Array.isArray(msgs) ? msgs : []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setMessages(sorted);
        };
        const onNew = (msg) => {
            setMessages(prev => [...prev, msg]);
            // Emit markSeen for the new message if it's not mine
            if (msg.senderId !== userId) {
                s.emit("markSeen", {
                     messageId: msg.id, userId,
                     type: "department", department, semester, shift
                });
            }
        };

        const onDeleted = (msgId) => setMessages(prev => prev.filter(m => m.id !== msgId));
        const onSeen = ({ messageId, seenBy }) => {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, seenBy } : m));
        };

        s.on("existingMessages", onExisting);
        s.on("newMessage", onNew);
        s.on("messageDeleted", onDeleted);
        s.on("messageSeen", onSeen);

        // Cleanup
        return () => {
            s.off("existingMessages", onExisting);
            s.off("newMessage", onNew);
            s.off("messageDeleted", onDeleted);
            s.off("messageSeen", onSeen);
            s.disconnect();
            socketRef.current = null;
        };
    }, [department, semester, shift, userId]);

    useEffect(() => {
        // Mark existing unread messages as seen
        if (messages.length > 0 && socketRef.current) {
             messages.forEach(m => {
                 if (m.senderId !== userId && (!m.seenBy || !m.seenBy.includes(userId))) {
                     socketRef.current.emit("markSeen", {
                         messageId: m.id, userId,
                         type: "department", department, semester, shift
                     });
                 }
             });
        }
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, userId, department, semester, shift]);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setSelectedImages(Array.from(e.target.files));
        }
    };

    const uploadFiles = async () => {
        if (selectedImages.length === 0) return [];
        const formData = new FormData();
        selectedImages.forEach(file => formData.append("images", file));

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            return data.files || [];
        } catch (err) {
            console.error("Upload failed", err);
            return [];
        }
    };

    const sendMessage = async () => {
        if ((!text.trim() && selectedImages.length === 0) || !socketRef.current) return;

        const uploadedImages = await uploadFiles();

        socketRef.current.emit("sendMessage", {
            type: "department", department, semester, shift,
            senderId: userId,
            senderName: student.fullName,
            text,
            images: uploadedImages
        });
        setText("");
        setSelectedImages([]);
    };

    const deleteMessage = (msgId) => {
        if(!socketRef.current) return;
        if(window.confirm("Delete this message?")) {
            socketRef.current.emit("deleteMessage", {
                messageId: msgId,
                senderId: userId,
                type: "department", department, semester, shift
            });
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-container">
            <div className="chat-header-info">
                Room: {department} ({semester})
            </div>
            <div className="messages-area">
                {messages.map((m, i) => {
                    const isMe = m.senderId === userId;
                    const seenCount = m.seenBy ? m.seenBy.length : 0;
                    return (
                        <div key={i} className={`message-row ${isMe ? "mine" : "theirs"}`}>
                            <div className="bubble">
                                <div className="msg-header">
                                    <span className="sender-name">{m.senderName}</span>
                                    <span className="sender-id">({m.senderId})</span>
                                </div>
                                {m.images && m.images.length > 0 && (
                                    <div className="msg-images">
                                        {m.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={`${UPLOAD_URL}${img}`}
                                                alt="attachment"
                                                onClick={() => setViewerImage(`${UPLOAD_URL}${img}`)}
                                            />
                                        ))}
                                    </div>
                                )}
                                {m.text && <div className="msg-text">{m.text}</div>}
                                <div className="msg-footer">
                                    <span className="time">{formatTime(m.createdAt)}</span>
                                    <span className="seen-count">Seen: {seenCount}</span>
                                    {isMe && <button className="delete-btn" onClick={() => deleteMessage(m.id)}>🗑</button>}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="input-area-wrapper">
                 {selectedImages.length > 0 && (
                     <div className="image-preview">
                         {selectedImages.map((f, i) => (
                             <div key={i} className="preview-thumb">
                                 <span>{f.name}</span>
                                 <button onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}>x</button>
                             </div>
                         ))}
                     </div>
                 )}
                 <div className="input-area">
                    <label className="file-upload-btn">
                        📷
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{display: 'none'}} />
                    </label>
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>

            {viewerImage && (
                <div className="image-viewer-overlay" onClick={() => setViewerImage(null)}>
                    <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
                        <img src={viewerImage} alt="Full view" />
                        <button className="close-viewer" onClick={() => setViewerImage(null)}>X</button>
                    </div>
                </div>
            )}
        </div>
    );
}
