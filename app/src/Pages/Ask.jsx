import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { SOCKET_URL, API_BASE, UPLOAD_URL } from "../config";
import "../Styles/ask.css";

export default function AskPage({ student }) {
    const socketRef = useRef(null);
    const [questions, setQuestions] = useState([]);
    const [text, setText] = useState("");
    const [qImages, setQImages] = useState([]);
    const [reply, setReply] = useState("");
    const [rImages, setRImages] = useState([]);
    const [activeQ, setActiveQ] = useState(null);

    const department = student.department || "CST";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    useEffect(() => {
        const s = io(SOCKET_URL, {
            path: "/socket.io",
            transports: ['websocket', 'polling']
        });
        socketRef.current = s;

        s.on("connect", () => {
            s.emit("joinAskRoom", { department });
        });

        const onExisting = (data) => setQuestions(Array.isArray(data) ? data : []);
        const onNew = (q) => setQuestions(prev => [q, ...prev]);
        const onAnswered = ({ questionId, answer }) => {
            setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, answers: [...q.answers, answer] } : q));
        };

        s.on("existingQuestions", onExisting);
        s.on("newQuestion", onNew);
        s.on("questionAnswered", onAnswered);

        return () => {
            s.disconnect();
            socketRef.current = null;
        };
    }, [department]);

    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return [];
        const formData = new FormData();
        files.forEach(file => formData.append("images", file));

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

    const ask = async () => {
        if ((!text && qImages.length === 0) || !socketRef.current) return;

        const uploadedImages = await uploadFiles(qImages);

        socketRef.current.emit("askQuestion", {
            department,
            text,
            senderId: userId,
            senderName: student.fullName,
            images: uploadedImages
        });
        setText("");
        setQImages([]);
    };

    const answer = async (qid) => {
        if ((!reply && rImages.length === 0) || !socketRef.current) return;

        const uploadedImages = await uploadFiles(rImages);

        socketRef.current.emit("answerQuestion", {
            questionId: qid,
            department,
            answer: {
                text: reply,
                senderName: student.fullName,
                senderId: userId,
                images: uploadedImages
            }
        });
        setReply("");
        setRImages([]);
        setActiveQ(null);
    };

    const handleQFileChange = (e) => {
        if (e.target.files) setQImages(Array.from(e.target.files));
    };

    const handleRFileChange = (e) => {
        if (e.target.files) setRImages(Array.from(e.target.files));
    };

    return (
        <div className="ask-page">
            <div className="ask-input-section">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Ask a question..."
                    className="ask-textarea"
                />
                 <div className="file-controls">
                    <label className="file-btn">
                        Add Images
                        <input type="file" multiple accept="image/*" onChange={handleQFileChange} style={{display:'none'}} />
                    </label>
                    <span className="file-count">{qImages.length} files selected</span>
                    <button onClick={ask} className="post-btn">Post Question</button>
                </div>
            </div>

            <div className="questions-list">
                {questions.map(q => (
                    <div key={q.id} className="question-card">
                        <div className="q-header">
                            <span className="q-author">{q.senderName} ({q.senderId})</span>
                            <span className="q-time">{new Date(q.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="q-content">
                            <p>{q.text}</p>
                            {q.images && q.images.length > 0 && (
                                <div className="q-images">
                                    {q.images.map((img, i) => (
                                        <img key={i} src={`${UPLOAD_URL}${img}`} alt="question attachment" />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="answers-section">
                            {q.answers && q.answers.map((a, i) => (
                                <div key={i} className="answer-item">
                                    <div className="a-header">
                                        <strong>{a.senderName} ({a.senderId})</strong> says:
                                    </div>
                                    <p>{a.text}</p>
                                    {a.images && a.images.length > 0 && (
                                        <div className="a-images">
                                            {a.images.map((img, idx) => (
                                                <img key={idx} src={`${UPLOAD_URL}${img}`} alt="answer attachment" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {activeQ === q.id ? (
                            <div className="reply-box">
                                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." />
                                <div className="reply-controls">
                                     <label>
                                        📷 <input type="file" multiple accept="image/*" onChange={handleRFileChange} style={{display:'none'}} />
                                    </label>
                                    <span>{rImages.length}</span>
                                    <button onClick={() => answer(q.id)}>Send</button>
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
