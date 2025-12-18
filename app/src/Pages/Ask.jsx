import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
    collection, query, where, orderBy, onSnapshot,
    setDoc, doc, updateDoc, arrayUnion, deleteDoc
} from "firebase/firestore";
import { API_BASE, UPLOAD_URL } from "../config";
import "../Styles/ask.css";

export default function AskPage({ student }) {
    const [questions, setQuestions] = useState([]);
    const [text, setText] = useState("");
    const [qImages, setQImages] = useState([]);

    const department = student.department || "CST";
    const userId = student.studentId || student.employeeId || student.adminId || student.id;

    useEffect(() => {
        const q = query(
            collection(db, "ask"),
            where("department", "==", department),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setQuestions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribe();
    }, [department]);

    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return [];
        const formData = new FormData();
        files.forEach(file => formData.append("images", file));
        formData.append("ownerId", userId); // Ownership enforcement

        try {
            const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
            return (await res.json()).files || [];
        } catch (err) { return []; }
    };

    const ask = async () => {
        if ((!text && qImages.length === 0)) return;
        const uploadedImages = await uploadFiles(qImages);
        const ref = doc(collection(db, "ask"));

        await setDoc(ref, {
            id: ref.id,
            department,
            text,
            senderId: userId,
            senderName: student.fullName,
            images: uploadedImages,
            answers: [],
            createdAt: new Date().toISOString()
        });
        setText(""); setQImages([]);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete question?")) {
            try { await deleteDoc(doc(db, "ask", id)); }
            catch (e) { alert("You can only delete your own questions."); }
        }
    };

    return (
        <div className="ask-page">
            <div className="ask-input-section">
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ask..." className="ask-textarea" />
                <div className="file-controls">
                    <input type="file" multiple accept="image/*" onChange={e => setQImages(Array.from(e.target.files))} />
                    <button onClick={ask} className="post-btn">Post</button>
                </div>
            </div>
            <div className="questions-list">
                {questions.map(q => (
                    <div key={q.id} className="question-card">
                        <div className="q-header">
                            <span>{q.senderName}</span>
                            {q.senderId === userId && <button onClick={() => handleDelete(q.id)} style={{ color: 'red', border: 'none', background: 'none' }}>Delete</button>}
                        </div>
                        <p>{q.text}</p>
                        <div className="q-images">
                            {q.images && q.images.map((img, i) => <img key={i} src={`${UPLOAD_URL}${img}`} width="100" />)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}