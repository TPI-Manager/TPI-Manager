import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import "../Styles/ask.css";

export default function AskPage({ student }) {
    const [questions, setQuestions] = useState([]);
    const [text, setText] = useState("");
    const [qImages, setQImages] = useState([]);
    const [reply, setReply] = useState("");
    const [activeQ, setActiveQ] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isAdmin = student.role === "admin";

    const department = student.department || "CST";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    const loadQuestions = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/ask/${department}`);
            setQuestions(res.data);
        } catch (error) {
            console.error(error);
        }
    }, [department]);

    useEffect(() => {
        // Calling the async function inside the effect
        const load = async () => {
            await loadQuestions();
        };
        load();
    }, [loadQuestions]);

    useRealtime('ask', () => {
        loadQuestions();
    }, 'department', department);

    const upload = async (files) => {
        const fd = new FormData();
        files.forEach(f => fd.append("images", f));
        fd.append("ownerId", userId);
        const res = await axios.post(`${API_BASE}/api/upload`, fd);
        return res.data.files;
    };

    const postQ = async () => {
        if (!text && qImages.length === 0) return;
        try {
            const imgs = await upload(qImages);
            await axios.post(`${API_BASE}/api/ask`, {
                text, department, senderId: userId, senderName: student.fullName, images: imgs
            });
            setText(""); setQImages([]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to post question");
        }
    };

    const postAns = async (qid) => {
        if (!reply) return;
        try {
            await axios.post(`${API_BASE}/api/ask/${qid}/answer`, {
                text: reply, senderName: student.fullName, senderId: userId, createdAt: new Date().toISOString()
            });
            setReply(""); setActiveQ(null);
            toast.success("Reply Posted");
        } catch { toast.error("Failed to reply"); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`${API_BASE}/api/ask/${deleteTarget}`, { headers: { 'x-user-id': userId } });
            setDeleteTarget(null);
            toast.success("Deleted");
        }
        catch {
            toast.error("Unauthorized");
            setDeleteTarget(null);
        }
    };

    return (
        <div className="ask-page">
            <div className="ask-input-section card-base">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="ask-textarea"
                    placeholder="Ask a question to your department..."
                />

                {qImages.length > 0 && <div className="attachment-preview">{qImages.length} images attached</div>}

                <div className="ask-controls">
                    <label className="attach-btn secondary-btn">
                        <i className="bi bi-paperclip"></i> Attach
                        <input type="file" multiple onChange={e => setQImages(Array.from(e.target.files))} hidden />
                    </label>
                    <button onClick={postQ} className="post-btn">
                        <i className="bi bi-send"></i> Post Question
                    </button>
                </div>
            </div>
            <div className="questions-list">
                {questions.map(q => (
                    <div key={q.id} className="question-card card-base fade-in">
                        <div className="q-header">
                            <div className="q-meta">
                                <span className="q-author"><i className="bi bi-person-circle"></i> {q.senderName}</span>
                                <span className="q-time">{new Date(q.createdAt).toLocaleDateString()}</span>
                            </div>
                            {(isAdmin || q.senderId === userId) && (
                                <button className="delete-icon-btn" onClick={() => setDeleteTarget(q.id)}>
                                    <i className="bi bi-trash"></i>
                                </button>
                            )}
                        </div>
                        <p className="q-text">{q.text}</p>
                        <div className="q-images">
                            {q.images && q.images.map((img, i) => (
                                <img key={i} src={img} alt="attachment" className="q-img-thumb" />
                            ))}
                        </div>

                        <div className="answers-section">
                            {q.answers && q.answers.map((a, i) => (
                                <div key={i} className="answer-item">
                                    <span className="answer-author">{a.senderName}</span>
                                    <span className="answer-text">{a.text}</span>
                                </div>
                            ))}
                        </div>

                        {activeQ === q.id ? (
                            <div className="reply-box slide-up">
                                <input
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    placeholder="Type a reply..."
                                    autoFocus
                                />
                                <div className="reply-controls">
                                    <button onClick={() => setActiveQ(null)} className="secondary-btn">Cancel</button>
                                    <button onClick={() => postAns(q.id)}>Reply</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setActiveQ(q.id)} className="reply-trigger">
                                <i className="bi bi-reply"></i> Reply
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <Modal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete Question"
                footer={
                    <>
                        <button className="secondary-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                        <button style={{ backgroundColor: 'var(--error)' }} onClick={confirmDelete}>Delete</button>
                    </>
                }
            >
                <p>Are you sure you want to delete this question?</p>
            </Modal>
        </div>
    );
}