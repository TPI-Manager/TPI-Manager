import React, { useState, useEffect, useRef } from "react";
// import { socket } from "socket.io-client"; // Removed
import { db } from "../firebase"; // Added
import {
    collection, query, where, orderBy, limit, onSnapshot,
    addDoc, deleteDoc, updateDoc, doc, setDoc, serverTimestamp
} from "firebase/firestore";
import { API_BASE, UPLOAD_URL } from "../config";
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

    useEffect(() => {
        const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;

        const q = query(
            collection(db, "chat"),
            where("room", "==", room),
            orderBy("createdAt", "asc"), // Firestore requires index for complex queries, but simple should work or might need desc + reverse. 
            // Note: If using 'desc', we need to reverse array for display. User's original code sorted by date.
            // Let's use 'asc' effectively or sort client side.
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            // Client-side sort to be safe if index issues arise
            msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [department, semester, shift]);

    useEffect(() => {
        // Mark seen logic
        messages.forEach(async (m) => {
            if (m.senderId !== userId && (!m.seenBy || !m.seenBy.includes(userId))) {
                try {
                    const mRef = doc(db, "chat", m.id);
                    const seenBy = m.seenBy ? [...m.seenBy, userId] : [userId];
                    await updateDoc(mRef, { seenBy });
                } catch (e) {
                    // console.log("Error marking seen", e);
                }
            }
        });
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, userId]);

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
        if ((!text.trim() && selectedImages.length === 0)) return;

        const uploadedImages = await uploadFiles();

        const room = `${"department"}-${department}-${semester || ""}-${shift || ""}`;
        const newMsgRef = doc(collection(db, "chat"));

        const newMessage = {
            type: "department", department, semester, shift,
            senderId: userId,
            senderName: student.fullName,
            text,
            images: uploadedImages,
            room,
            id: newMsgRef.id,
            createdAt: new Date().toISOString(),
            seenBy: []
        };

        await setDoc(newMsgRef, newMessage);

        setText("");
        setSelectedImages([]);
    };

    const deleteMessage = async (msgId) => {
        if (window.confirm("Delete this message?")) {
            try {
                await deleteDoc(doc(db, "chat", msgId));
            } catch (e) {
                console.error("Delete failed", e);
            }
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
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
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
