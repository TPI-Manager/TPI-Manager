import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import { useRealtime } from "../hooks/useRealtime"; // FIXED IMPORT
import "../Styles/ask.css";

export default function AskPage({ student }) {
    const [questions, setQuestions] = useState([]);
    const [text, setText] = useState("");
    const [qImages, setQImages] = useState([]);
    const [reply, setReply] = useState("");
    const [activeQ, setActiveQ] = useState(null);

    const department = student.department || "CST";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    const fetchQs = useCallback(async () => {
        const res = await axios.get(`${API_BASE}/api/ask/${department}`);
        setQuestions(res.data);
    }, [department]);

    useEffect(() => { fetchQs(); }, [fetchQs]);

    // REALTIME: Listen to changes in 'ask' table for this department
    useRealtime('ask', (payload) => {
        // Simple and robust: Refetch list on any change (Insert, Update Answer, Delete)
        fetchQs();
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
        const imgs = await upload(qImages);
        await axios.post(`${API_BASE}/api/ask`, {
            text, department, senderId: userId, senderName: student.fullName, images: imgs
        });
        setText(""); setQImages([]);
    };

    const postAns = async (qid) => {
        if (!reply) return;
        await axios.post(`${API_BASE}/api/ask/${qid}/answer`, {
            text: reply, senderName: student.fullName, senderId: userId, createdAt: new Date().toISOString()
        });
        setReply(""); setActiveQ(null);
    };

    const deleteQ = async (id) => {
        try { await axios.delete(`${API_BASE}/api/ask/${id}`, { headers: { 'x-user-id': userId } }); }
        catch { alert("Owner only"); }
    };

    return (
        <div className="ask-page">
            <div className="ask-input-section">
                <textarea value={text} onChange={e => setText(e.target.value)} className="ask-textarea" placeholder="Ask a question..." />
                <div className="file-controls">
                    <input type="file" multiple onChange={e => setQImages(Array.from(e.target.files))} />
                    <button onClick={postQ} className="post-btn">Post</button>
                </div>
            </div>
            <div className="questions-list">
                {questions.map(q => (
                    <div key={q.id} className="question-card">
                        <div className="q-header">
                            <span className="q-author">{q.senderName}</span>
                            {q.senderId === userId && <button onClick={() => deleteQ(q.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>}
                        </div>
                        <p>{q.text}</p>
                        <div className="q-images">{q.images && q.images.map((img, i) => <img key={i} src={img} width="100" />)}</div>

                        <div className="answers-section">
                            {q.answers && q.answers.map((a, i) => (
                                <div key={i} className="answer-item"><b>{a.senderName}:</b> {a.text}</div>
                            ))}
                        </div>

                        {activeQ === q.id ? (
                            <div className="reply-box">
                                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply..." />
                                <div className="reply-controls">
                                    <button onClick={() => postAns(q.id)}>Reply</button>
                                    <button onClick={() => setActiveQ(null)} className="cancel-btn">Cancel</button>
                                </div>
                            </div>
                        ) : <button onClick={() => setActiveQ(q.id)} className="reply-btn">Reply</button>}
                    </div>
                ))}
            </div>
        </div>
    );
}