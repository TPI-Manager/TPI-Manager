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
            // Remove temp messages if we receive a real one (simple heuristic or just append)
            // Ideally, we'd match by content or client-ID, but simply appending works if we filter out 'isTemp' eventually.
            // A better strategy: Filter out any 'isTemp' messages that look just like the new one (same text/sender)
            setMessages(prev => {
                const real = payload.new;
                // Remove temp message if it matches this new one (simple match)
                const filtered = prev.filter(m => !(m.isTemp && m.text === real.text && m.senderId === real.senderId));
                // Add new one if not exists
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
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                }
            });
            setIsUploading(false);
            setUploadProgress(0);
            return res.data.files || [];
        } catch (error) {
            console.error("Upload failed", error);
            setIsUploading(false);
            toast.error("Upload failed");
            throw error; // Propagate error to sendMessage for rollback
        }
    };

    const sendMessage = async () => {
        if (!text && selectedFiles.length === 0) return;

        // 1. Optimistic Update
        const tempId = Date.now();
        const tempMsg = {
            id: tempId,
            text,
            senderId: userId,
            senderName: student.fullName,
            role: student.role,
            createdAt: new Date().toISOString(),
            images: selectedFiles.map(f => URL.createObjectURL(f)),
            isTemp: true
        };

        setMessages(prev => [...prev, tempMsg]);
        setText("");
        const filesToUpload = [...selectedFiles]; // Copy for async
        setSelectedFiles([]); // Clear UI immediately

        try {
            // 2. Upload & Send
            const media = await uploadFiles(filesToUpload);
            await axios.post(`${API_BASE}/api/chat`, {
                text: tempMsg.text,
                senderId: userId,
                senderName: student.fullName,
                room,
                department, semester, shift,
                images: media,
                role: student.role, // Pass role for backend storage/broadcasting
                seenBy: []
            });
            // Success: Realtime will replace this temp message eventually.
            // For smoother UX, we could replace 'tempMsg' with response data, but Realtime 'INSERT' usually handles it.
            // To prevent dupes, we might filter out tempMsg when real one arrives with same content/time, 
            // but for now let's just let Realtime do its job. 
        } catch (error) {
            console.error(error);
            toast.error("Message failed to send");
            // Rollback
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
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
                                {!isMe && <div className="msg-sender">{m.senderName} <span className="msg-role">{m.role || ""}</span></div>}

                                {m.images && m.images.length > 0 && (
                                    <div className="msg-gallery">
                                        {m.images.map((url, idx) => {
                                            const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                                            const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

                                            if (isVideo) {
                                                return <video key={idx} src={url} controls className="msg-media" />;
                                            } else if (isImage) {
                                                return <img key={idx} src={url} onClick={() => setViewerImage(url)} className="msg-media" alt="content" />;
                                            } else {
                                                const fileName = url.split('/').pop().split('?')[0]; // Extract filename
                                                return (
                                                    <a key={idx} href={url} download={fileName} target="_blank" rel="noopener noreferrer" className="file-attachment">
                                                        <i className="bi bi-file-earmark-arrow-down-fill"></i> {fileName || `Attachment ${idx + 1}`}
                                                    </a>
                                                );
                                            }
                                        })}
                                    </div>
                                )}

                                {m.text && <div className="msg-text">{m.text}</div>}

                                <div className="msg-meta">
                                    {/* ID visibility */}
                                    {m.senderId && <span className="msg-id">ID: {m.senderId.substring(0, 6)}</span>}

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
                {selectedFiles.length > 0 && (
                    <div className="upload-preview fade-in">
                        <div className="preview-header">
                            <span><i className="bi bi-paperclip"></i> {selectedFiles.length} file(s) attached</span>
                            <button className="clear-btn" onClick={() => setSelectedFiles([])}>
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        {isUploading && (
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        )}
                    </div>
                )}
                <div className="input-area">
                    <label className="attach-btn" title="Attach Image, Video or File">
                        <i className="bi bi-plus-lg"></i>
                        <input
                            type="file"
                            multiple
                            onChange={e => setSelectedFiles(Array.from(e.target.files))}
                            hidden
                            accept="image/*,video/*,application/pdf,application/msword,text/plain"
                        />
                    </label>
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        disabled={isUploading}
                    />
                    <button className="send-btn" onClick={sendMessage} disabled={isUploading || (!text && selectedFiles.length === 0)}>
                        {isUploading ? <div className="spinner-sm"></div> : <i className="bi bi-send-fill"></i>}
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