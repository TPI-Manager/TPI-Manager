import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
    collection, query, where, orderBy, onSnapshot,
    deleteDoc, doc, setDoc, updateDoc
} from "firebase/firestore";
import { API_BASE, UPLOAD_URL } from "../config";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "Staff";
    const shift = student.shift || "General";
    // Use the primary ID
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
            orderBy("createdAt", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [department, semester, shift]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFileChange = (e) => {
        if (e.target.files) setSelectedImages(Array.from(e.target.files));
    };

    const uploadFiles = async () => {
        if (selectedImages.length === 0) return [];
        const formData = new FormData();
        selectedImages.forEach(file => formData.append("images", file));
        // IMPORTANT: Attach ownerId for storage rules
        formData.append("ownerId", userId);

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
            senderId: userId, // Logic relies on this matching auth.uid in rules
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
                alert("You can only delete your own messages.");
            }
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
                                <div className="msg-header">
                                    <span className="sender-name">{m.senderName}</span>
                                </div>
                                {m.images && (
                                    <div className="msg-images">
                                        {m.images.map((img, idx) => (
                                            <img key={idx} src={`${UPLOAD_URL}${img}`} onClick={() => setViewerImage(img)} />
                                        ))}
                                    </div>
                                )}
                                {m.text && <div className="msg-text">{m.text}</div>}
                                <div className="msg-footer">
                                    {isMe && <button className="delete-btn" onClick={() => deleteMessage(m.id)}>🗑</button>}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="input-area-wrapper">
                <div className="input-area">
                    <label className="file-upload-btn">
                        📷 <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                    <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
            {viewerImage && (
                <div className="image-viewer-overlay" onClick={() => setViewerImage(null)}>
                    <img src={viewerImage} style={{ maxHeight: '90vh' }} />
                </div>
            )}
        </div>
    );
}