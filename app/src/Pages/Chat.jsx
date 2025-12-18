import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "1st";
    const shift = student.shift || "Morning";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;
    const room = `department-${department}-${semester}-${shift}`;
    const isAdmin = student.role === "admin";

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
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
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        if (messages.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length]);

    useRealtime('chat', (payload) => {
        if (payload.eventType === 'INSERT') {
            const real = payload.new;
            if (real.room !== room) return;
            setMessages(prev => {
                const filtered = prev.filter(m => !(m.isTemp && m.text === real.text && m.senderId === real.senderId));
                if (filtered.some(m => m.id === real.id)) return filtered;
                return [...filtered, real];
            });
        } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        } else if (payload.eventType === 'POLL') {
            fetchMessages();
        }
    }, 'room', room);

    const uploadFiles = async (files) => {
        if (files.length === 0) return [];
        setIsUploading(true);
        const formData = new FormData();
        files.forEach(file => formData.append("images", file));
        formData.append("ownerId", userId);
        try {
            const res = await axios.post(`${API_BASE}/api/upload`, formData, {
                onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
            });
            setIsUploading(false);
            setUploadProgress(0);
            return res.data.files || [];
        } catch (error) {
            setIsUploading(false);
            throw error;
        }
    };

    const sendMessage = async () => {
        const trimmed = text.trim();
        if (!trimmed && selectedFiles.length === 0) return;

        const tempId = Date.now();
        const tempMsg = {
            id: tempId,
            text: trimmed,
            senderId: userId,
            senderName: student.fullName,
            createdAt: new Date().toISOString(),
            images: selectedFiles.map(f => URL.createObjectURL(f)),
            isTemp: true
        };

        setMessages(prev => [...prev, tempMsg]);
        setText("");
        const filesToUpload = [...selectedFiles];
        setSelectedFiles([]);

        try {
            const media = await uploadFiles(filesToUpload);
            await axios.post(`${API_BASE}/api/chat`, {
                text: trimmed || null,
                senderId: userId,
                senderName: student.fullName,
                room,
                department,
                semester,
                shift,
                images: media.length > 0 ? media : null
            });
        } catch (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            toast.error("Message failed to send");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const isTemp = messages.find(m => m.id === deleteTarget)?.isTemp;
        if (isTemp) {
            setMessages(prev => prev.filter(m => m.id !== deleteTarget));
            setDeleteTarget(null);
            return;
        }

        const original = [...messages];
        setMessages(prev => prev.filter(m => m.id !== deleteTarget));
        const idToDelete = deleteTarget;
        setDeleteTarget(null);

        try {
            await axios.delete(`${API_BASE}/api/chat/${idToDelete}`, {
                headers: { 'x-user-id': userId }
            });
        } catch (error) {
            setMessages(original);
            toast.error("Delete failed");
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header-info">
                <i className="bi bi-people-fill"></i> {department} • {semester}
            </div>
            <div className="messages-area">
                {messages.map((m) => {
                    const isMe = m.senderId === userId;
                    return (
                        <div key={m.id} className={`message-row ${isMe ? "mine" : "theirs"}`}>
                            {!isMe && <div className="avatar-small">{m.senderName?.charAt(0)}</div>}
                            <div className="bubble">
                                {!isMe && <div className="msg-sender">{m.senderName}</div>}
                                {m.images?.length > 0 && (
                                    <div className="msg-gallery">
                                        {m.images.map((url, idx) => (
                                            url.match(/\.(mp4|webm|ogg)$/i) ?
                                                <video key={idx} src={url} controls className="msg-media" /> :
                                                <img key={idx} src={url} onClick={() => setViewerImage(url)} className="msg-media" alt="" />
                                        ))}
                                    </div>
                                )}
                                {m.text && <div className="msg-text">{m.text}</div>}
                                <div className="msg-meta">
                                    {m.senderId && !m.isTemp && <span className="msg-id">ID: {m.senderId.substring(0, 6)}</span>}
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
            <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Message" footer={<><button className="secondary-btn" onClick={() => setDeleteTarget(null)}>Cancel</button><button style={{ backgroundColor: 'var(--error)' }} onClick={confirmDelete}>Delete</button></>}>
                <p>Are you sure you want to delete this message?</p>
            </Modal>
            <div className="input-area-wrapper">
                {selectedFiles.length > 0 && (
                    <div className="upload-preview">
                        <div className="preview-header">
                            <span>{selectedFiles.length} file(s) attached</span>
                            <button className="clear-btn" onClick={() => setSelectedFiles([])}><i className="bi bi-x"></i></button>
                        </div>
                        {isUploading && <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div></div>}
                    </div>
                )}
                <div className="input-area">
                    <label className="attach-btn">
                        <i className="bi bi-plus-lg"></i>
                        <input type="file" multiple onChange={e => setSelectedFiles(Array.from(e.target.files))} hidden accept="image/*,video/*" />
                    </label>
                    <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." disabled={isUploading} />
                    <button className="send-btn" onClick={sendMessage} disabled={isUploading || (!text.trim() && selectedFiles.length === 0)}>
                        {isUploading ? <div className="spinner-sm"></div> : <i className="bi bi-send-fill"></i>}
                    </button>
                </div>
            </div>
            {viewerImage && <div className="image-viewer-overlay" onClick={() => setViewerImage(null)}><img src={viewerImage} alt="" /></div>}
        </div>
    );
}