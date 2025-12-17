import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { SOCKET_URL } from "../config";
import "../Styles/chat.css";

export default function ChatPage({ student }) {
    const department = student.department || "CST";
    const semester = student.semester || "Staff";
    const shift = student.shift || "General";

    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    const socketRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
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

        const onExisting = (msgs) => setMessages(Array.isArray(msgs) ? msgs : []);
        const onNew = (msg) => setMessages(prev => [...prev, msg]);

        s.on("existingMessages", onExisting);
        s.on("newMessage", onNew);

        // Cleanup
        return () => {
            s.off("existingMessages", onExisting);
            s.off("newMessage", onNew);
            s.disconnect();
            socketRef.current = null;
        };
    }, [department, semester, shift]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!text.trim() || !socketRef.current) return;
        socketRef.current.emit("sendMessage", {
            type: "department", department, semester, shift,
            senderId: userId, senderName: student.fullName, text
        });
        setText("");
    };

    return (
        <div className="chat-container">
            <div className="chat-header-info">
                Room: {department} ({semester})
            </div>
            <div className="messages-area">
                {messages.map((m, i) => {
                    const isMe = m.senderId === userId;
                    return (
                        <div key={i} className={`message-row ${isMe ? "mine" : "theirs"}`}>
                            <div className="bubble">
                                {!isMe && <div className="sender-name">{m.senderName}</div>}
                                <div className="msg-text">{m.text}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <div className="input-area">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}