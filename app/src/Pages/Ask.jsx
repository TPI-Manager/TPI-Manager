import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { SOCKET_URL } from "../config";
import "../Styles/ask.css";

export default function AskPage({ student }) {
    const socketRef = useRef(null);
    const [questions, setQuestions] = useState([]);
    const [text, setText] = useState("");
    const [reply, setReply] = useState("");
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

    const ask = () => {
        if (!text || !socketRef.current) return;
        socketRef.current.emit("askQuestion", {
            department,
            text,
            senderId: userId,
            senderName: student.fullName
        });
        setText("");
    };

    const answer = (qid) => {
        if (!reply || !socketRef.current) return;
        socketRef.current.emit("answerQuestion", {
            questionId: qid,
            department,
            answer: { text: reply, senderName: student.fullName }
        });
        setReply("");
        setActiveQ(null);
    };

    return (
        <div className="ask-page">
            <div className="ask-input">
                <input value={text} onChange={e => setText(e.target.value)} name="question" placeholder="Ask a question..." />
                <button onClick={ask}>Post</button>
            </div>
            <div className="questions">
                {questions.map(q => (
                    <div key={q.id} className="question-card">
                        <h4>{q.text} <small>by {q.senderName}</small></h4>
                        <div className="answers">
                            {q.answers && q.answers.map((a, i) => <div key={i} className="answer"><strong>{a.senderName}:</strong> {a.text}</div>)}
                        </div>
                        {activeQ === q.id ? (
                            <div className="reply-box">
                                <input value={reply} onChange={e => setReply(e.target.value)} />
                                <button onClick={() => answer(q.id)}>Send</button>
                            </div>
                        ) : <button onClick={() => setActiveQ(q.id)}>Reply</button>}
                    </div>
                ))}
            </div>
        </div>
    );
}