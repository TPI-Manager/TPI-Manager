import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import addimg from "../assets/addimg.png";
import "../Styles/ask.css";

const SOCKET_URL = "http://localhost:5011";
const semesters = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
const shifts = ["Morning","Day"];

export default function AskPage({ student, theme }) {
  const { department, shift, studentId, name, admin, teacher } = student;

  const role = admin === "yes" ? "admin" : teacher === "yes" ? "teacher" : "student";
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  const [socket, setSocket] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageOverlay, setImageOverlay] = useState(null);

  const [answerText, setAnswerText] = useState({});
  const [answerBoxVisible, setAnswerBoxVisible] = useState({});
  const [semFilter, setSemFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");

  const fileInputRef = useRef();

  // ---------------- THEME ----------------
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ---------------- SOCKET ----------------
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  const joinRoom = () => {
    if (!socket) return;
    socket.emit("joinAskRoom", {
      type: "department",
      department,
      semester: isTeacher ? semFilter : "",
      shift: isTeacher ? shiftFilter : shift,
      role
    });

    socket.on("existingQuestions", qs => {
      const sorted = qs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      setQuestions(sorted.slice(0,100)); // last 100
    });

    socket.on("newQuestion", q => {
      setQuestions(prev => [q, ...prev.filter(x=>x.id!==q.id)].slice(0,100));
    });

    socket.on("questionAnswered", ({ questionId, answer }) => {
      setQuestions(prev => prev.map(q => q.id===questionId?{...q, answers:[...(q.answers||[]),answer]}:q));
    });
  };

  useEffect(() => {
    joinRoom();
    return () => {
      if(socket){
        socket.off("existingQuestions");
        socket.off("newQuestion");
        socket.off("questionAnswered");
      }
    };
  }, [socket, semFilter, shiftFilter]);

  // ---------------- ASK QUESTION ----------------
  const askQuestion = async () => {
    if(!questionText.trim()) return;
    let imageUrl = null;

    if(imageFile){
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("http://localhost:5011/upload", { method:"POST", body: formData });
      const data = await res.json();
      imageUrl = data.url;
    }

    socket.emit("askQuestion", {
      type:"department",
      department,
      semester:"",
      shift,
      text: questionText,
      image: imageUrl,
      senderId: studentId,
      senderName: name
    });

    setQuestionText(""); 
    setImageFile(null);
  };

  // ---------------- ANSWER ----------------
  const sendAnswer = qId => {
    if(!answerText[qId]?.trim()) return;
    socket.emit("answerQuestion", {
      questionId: qId,
      type:"department",
      department,
      semester: semFilter,
      shift: shiftFilter,
      answer:{ text:answerText[qId], senderId:studentId, senderName:name }
    });
    setAnswerText(prev => ({ ...prev, [qId]: "" }));
    setAnswerBoxVisible(prev => ({ ...prev, [qId]: false }));
  };

  const toggleAnswerBox = qId => setAnswerBoxVisible(prev => ({ ...prev, [qId]: !prev[qId] }));

  // ---------------- IMAGE OVERLAY ----------------
  const openImageOverlay = url => setImageOverlay(url);
  const closeImageOverlay = () => setImageOverlay(null);

  return (
    <div className={`ask-page ${theme==="dark"?"dark":"light"}`}>

      <div className="ask-page__header"><h2>❓ ASK System</h2></div>

      {isTeacher && !isAdmin && (
        <div className="ask-page__filters">
          <select value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
            <option value="">All Semesters</option>
            {semesters.map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={shiftFilter} onChange={e=>setShiftFilter(e.target.value)}>
            <option value="">All Shifts</option>
            {shifts.map(sh=> <option key={sh} value={sh}>{sh}</option>)}
          </select>
        </div>
      )}

      {isStudent && (
        <div className="ask-page__ask-input">
          <input
            className="ask-page__input"
            value={questionText}
            onChange={e=>setQuestionText(e.target.value)}
            placeholder="Ask your question..."
          />
          <img
            src={addimg}
            alt="add"
            style={{width:"30px",cursor:"pointer"}}
            onClick={()=>fileInputRef.current.click()}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{display:"none"}}
            onChange={e=>setImageFile(e.target.files[0])}
          />
          <button className="ask-page__ask-btn" onClick={askQuestion}>Ask</button>
        </div>
      )}

      <div className="ask-page__list">
        {questions.map(q=>(
          <div key={q.id} className="ask-page__card">
            <h4>❓ {q.text}</h4>
           <small>Asked by {q.senderName} ({q.senderId})</small>


            {q.image && (
              <img
                src={`http://localhost:5011${q.image}`}
                alt="question"
                className="ask-page__card-image"
                onClick={()=>openImageOverlay(`http://localhost:5011${q.image}`)}
              />
            )}

            <div className="ask-page__answers">
              {(q.answers||[]).map(a=>(
                <div key={a.id}><strong>{a.senderName}</strong>: {a.text}</div>
              ))}
            </div>

            {(isTeacher||isAdmin) && (
              <div>
                {answerBoxVisible[q.id] && (
                  <div className="ask-page__answer-box visible">
                    <input
                      className="ask-page__answer-input"
                      value={answerText[q.id]||""}
                      onChange={e=>setAnswerText(prev=>({...prev,[q.id]:e.target.value}))}
                      placeholder="Write answer..."
                    />
                    <button className="ask-page__answer-btn" onClick={()=>sendAnswer(q.id)}>Send</button>
                  </div>
                )}
                <button className="ask-page__answer-toggle" onClick={()=>toggleAnswerBox(q.id)}>
                  {answerBoxVisible[q.id]?"Close":"Answer"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {imageOverlay && (
        <div className="image-overlay active" onClick={closeImageOverlay}>
          <div className="image-overlay__content" onClick={e => e.stopPropagation()}>
            <img src={imageOverlay} alt="full" />
          </div>
        </div>
      )}

    </div>
  );
}
