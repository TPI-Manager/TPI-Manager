import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import addimg from "../assets/addimg.png";
import "../Styles/chat.css";

const API = "http://localhost:5010";
const SOCKET_URL = "http://localhost:5010";

export default function ChatPage({ student }) {
  const { department, semester, shift, studentId, name, admin, teacher } = student;
  const role = admin === "yes" ? "admin" : teacher === "yes" ? "teacher" : "student";

  const departments = ["Civil Technology","CST","Electrical","Electrical Technology"];
  const semesters = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
  const shifts = ["Morning","Day"];

  const [selectedDept,setSelectedDept] = useState(department);
  const [selectedSem,setSelectedSem] = useState(semester);
  const [selectedShift,setSelectedShift] = useState(shift);
  const [chatType,setChatType] = useState("department");
  const [messages,setMessages] = useState([]);
  const [text,setText] = useState("");
  const [images,setImages] = useState([]);
  const [socket,setSocket] = useState(null);
  const [replyingTo,setReplyingTo] = useState(null);
  const [observedMessages,setObservedMessages] = useState(new Set());
  const [modalImage,setModalImage] = useState(null); // Image modal

  const fileInputRef = useRef();
  const messagesEndRef = useRef();
  const quickReactions = ["😡","❤️","😂","🤖"];

  const getRoom = () => {
    const dept = role==="teacher"?selectedDept:department;
    const sem = role==="teacher"?selectedSem:semester;
    const shft = role==="teacher"?selectedShift:shift;
    return `${chatType}-${dept}-${chatType==="semester"||chatType==="shift"?sem:""}-${chatType==="shift"?shft:""}`;
  }

  // ================= INIT SOCKET =================
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // ================= JOIN ROOM & SOCKET EVENTS =================
  useEffect(() => {
    if(!socket) return;
    const room = getRoom();
    socket.emit("joinRoom",{ type: chatType, department: role==="teacher"?selectedDept:department, semester: role==="teacher"?selectedSem:semester, shift: role==="teacher"?selectedShift:shift, userId: studentId });

    socket.on("newMessage", msg => setMessages(prev => [...prev, msg]));
    socket.on("messageEdited", ({ messageId, text, updatedAt }) => setMessages(prev => prev.map(m => m.id===messageId?{...m,text,updatedAt}:m)));
    socket.on("messageDeleted", ({ messageId, deletedByName, deletedAt }) => setMessages(prev => prev.map(m => m.id===messageId?{...m,deleted:true,deletedByName,deletedAt}:m)));
    socket.on("messageReplied", ({ parentId, reply }) => setMessages(prev => prev.map(m => m.id===parentId?{...m, replies:[...(m.replies||[]), reply]}:m)));
    socket.on("messageReacted", ({ messageId, reactions }) => setMessages(prev => prev.map(m => m.id===messageId?{...m,reactions}:m)));
    socket.on("messageSeen", ({ messageId, seenBy }) => setMessages(prev => prev.map(m => m.id===messageId?{...m,seenBy}:m)));

    return () => socket.off();
  }, [socket, chatType, selectedDept, selectedSem, selectedShift]);

  // ================= FETCH HISTORY =================
  useEffect(() => {
    const fetchHistory = async () => {
      const dept = role==="teacher"?selectedDept:department;
      const sem = role==="teacher"?selectedSem:semester;
      const shft = role==="teacher"?selectedShift:shift;

      try {
        let url = `${API}/api/chat/${chatType}/${dept}`;
        if(chatType==="semester") url += `/${sem}`;
        if(chatType==="shift") url += `/${sem}/${shft}`;
        const res = await axios.get(url);
        setMessages(res.data || []);
      } catch(err){ console.error(err); }
    }
    fetchHistory();
  }, [chatType, selectedDept, selectedSem, selectedShift]);

  // ================= SCROLL TO BOTTOM =================
  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  // ================= MARK SEEN =================
  useEffect(()=>{
    if(!socket) return;
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const messageId = entry.target.dataset.messageId;
        if(entry.isIntersecting && !observedMessages.has(messageId)){
          socket.emit("messageSeen",{ messageId, userId: studentId, room: getRoom() });
          setObservedMessages(prev=>new Set([...prev,messageId]));
        }
      });
    }, {threshold:0.5});

    document.querySelectorAll(".message").forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  }, [messages, socket]);

  // ================= SEND MESSAGE =================
  const handleSend = async () => {
    if(!text && images.length===0) return;

    let uploadedImages = [];
    if(images.length>0){
      const form = new FormData();
      images.forEach(img => form.append("images", img));
      try{ const res = await axios.post(`${API}/api/chat/upload`, form); uploadedImages = res.data.files || []; } catch(err){ console.error(err); }
    }

    const msg = {
      type: chatType,
      department: role==="teacher"?selectedDept:department,
      semester: role==="teacher"?selectedSem:semester,
      shift: role==="teacher"?selectedShift:shift,
      senderId: studentId,
      senderName: name,
      text,
      images: uploadedImages
    };

    const room = getRoom();

    if(replyingTo?.edit){ socket.emit("editMessage",{ messageId: replyingTo.id, text, room }); setReplyingTo(null); }
    else if(replyingTo){ socket.emit("replyMessage",{ parentId: replyingTo.id, reply:{...msg, replyToId: replyingTo.senderId, replyToName: replyingTo.senderName}, room }); setReplyingTo(null); }
    else { socket.emit("sendMessage", msg); }

    setText(""); setImages([]); if(fileInputRef.current) fileInputRef.current.value=null;
  }

  const handleImageChange = e => { if(e.target.files.length>3){ alert("Maximum 3 images"); return; } setImages(Array.from(e.target.files)); }
  const handleDelete = msg => { if(!window.confirm("Delete this message?")) return; socket.emit("deleteMessage",{ messageId: msg.id, deletedByName: name, room: getRoom() }); }

  const handleReact = (msg, reaction) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id !== msg.id) return m;
        const reactions = m.reactions||[];
        const idx = reactions.findIndex(r=>r.userId===studentId);
        let newReactions;
        if(idx>=0){
          if(reactions[idx].reaction===reaction) newReactions = reactions.filter(r=>r.userId!==studentId);
          else newReactions = reactions.map(r=>r.userId===studentId?{...r,reaction}:r);
        } else newReactions = [...reactions,{userId:studentId,reaction}];
        return {...m,reactions:newReactions};
      })
    );
    socket.emit("reactMessage",{ messageId: msg.id, userId: studentId, reaction, room: getRoom() });
  };

  const renderReactions = reactions => {
    if(!reactions || reactions.length===0) return null;
    const count = {};
    reactions.forEach(r=>count[r.reaction]=(count[r.reaction]||0)+1);
    return Object.entries(count).map(([emoji,c])=><span key={emoji} style={{marginRight:"5px"}}>{emoji} {c}</span>);
  }

  const handleReply = msg => { setReplyingTo(msg); setText(""); }
  const handleEdit = msg => { setText(msg.text); setReplyingTo({...msg,edit:true}); }

  // IMAGE MODAL HANDLERS
  const handleImageClick = img => setModalImage(img);
  const closeModal = () => setModalImage(null);

  return (
    <div className="chat-page">
      <div className="chat-options">
        <button className={chatType==="department"?"active":""} onClick={()=>setChatType("department")}>Department</button>
        <button className={chatType==="semester"?"active":""} onClick={()=>setChatType("semester")}>Semester</button>
        <button className={chatType==="shift"?"active":""} onClick={()=>setChatType("shift")}>Shift</button>
      </div>

      {role==="teacher" && (
        <div className="teacher-options">
          <select value={selectedDept} onChange={e=>setSelectedDept(e.target.value)}>{departments.map(d=><option key={d} value={d}>{d}</option>)}</select>
          <select value={selectedSem} onChange={e=>setSelectedSem(e.target.value)}>{semesters.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <select value={selectedShift} onChange={e=>setSelectedShift(e.target.value)}>{shifts.map(s=><option key={s} value={s}>{s}</option>)}</select>
        </div>
      )}

      <div className="chat-messages">
        {messages.map(m => (
          <article key={m.id} className={`message ${m.senderId===studentId?"mine":"other"}`} data-message-id={m.id}>
            <div className="sender">{m.senderName} (ID:{m.senderId})</div>
            {m.deleted ? (
              <div className="deleted">Deleted by {m.deletedByName} at {new Date(m.deletedAt).toLocaleTimeString()}</div>
            ) : (
              <>
                <div className="text">{m.text}</div>
                {m.images?.map((img,i)=>(
                  <img 
                    key={i} 
                    src={`${API}/uploads/${img}`} 
                    className="chat-img" 
                    style={{cursor:"pointer"}} 
                    onClick={()=>handleImageClick(`${API}/uploads/${img}`)} 
                  />
                ))}
                <div className="reactions">{renderReactions(m.reactions)}</div>
                <div className="msg-footer">
                  <span>{m.seenBy?.length||0} seen</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  {m.updatedAt && <span>Edited at {new Date(m.updatedAt).toLocaleTimeString()}</span>}
                </div>
                <div className="msg-actions">
                  {quickReactions.map(r=>{
                    const isActive = m.reactions?.find(rx=>rx.userId===studentId)?.reaction===r;
                    return <button key={r} onClick={()=>handleReact(m,r)} style={{background:isActive?"#d1f7c4":""}}>{r}</button>
                  })}
                  <button onClick={()=>handleReply(m)}>Reply</button>
                  {m.senderId===studentId && <button onClick={()=>handleEdit(m)}>Edit</button>}
                  {m.senderId===studentId && <button onClick={()=>handleDelete(m)}>Delete</button>}
                </div>
                {m.replies?.map(r=>(
                  <div key={r.id} className="reply">
                    <div>{r.senderName} replied to {r.replyToName}</div>
                    <div>{r.text}</div>
                    <div>{new Date(r.createdAt).toLocaleTimeString()}</div>
                  </div>
                ))}
              </>
            )}
          </article>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <form className="chat-input" onSubmit={e=>{ e.preventDefault(); handleSend(); }}>
        <input
          type="text"
          placeholder={replyingTo?`Reply to ${replyingTo.senderName}`:"Type message..."}
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); handleSend(); } }}
        />
        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageChange} style={{display:"none"}}/>
        <img src={addimg} alt="add" onClick={()=>fileInputRef.current.click()} style={{width:"30px",cursor:"pointer"}}/>
        <button type="submit">{replyingTo?.edit?"Update":"Send"}</button>
      </form>

      {/* ---------- IMAGE MODAL ---------- */}
      {modalImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="image-modal__content" onClick={e=>e.stopPropagation()}>
            <img src={modalImage} alt="preview" />
          </div>
        </div>
      )}
    </div>
  );
}
