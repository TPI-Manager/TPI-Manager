// -------------------------
// EventFormModal.jsx
// -------------------------
import React, { useState, useEffect } from "react";
import "../comstyle/EventFormModal.css";

export default function EventFormModal({ show, onClose, onSave, initialData }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("notice");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [options, setOptions] = useState([]);
  const [days, setDays] = useState(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]);

  const weekDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];







  useEffect(() => {
    if (initialData) {
    setTitle(initialData.title || "");

      setType(initialData.type || "notice");
      setBody(initialData.body || "");

      setStartTime(initialData.startTime || "");
      setEndTime(initialData.endTime || "");
      setOptions(initialData.options || []);
      setDays(initialData.days || ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]);
    } else {
      setTitle(""); setType("notice"); setBody(""); setStartTime(""); setEndTime(""); setOptions([]);
      setDays(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]);
    }
  }, [initialData]);

  if (!show) return null;

  const addOption = () => { if(options.length < 10) setOptions([...options,""]); };
  const updateOption = (i,val) => { const arr=[...options]; arr[i]=val; setOptions(arr); };
  const removeOption = (i) => { setOptions(options.filter((_,idx)=>idx!==i)); };

  const toggleDay = (day) => {
    if(days.includes(day)) setDays(days.filter(d => d!==day));
    else setDays([...days,day]);
  };

  const handleSave = () => { onSave({ title,type,body,startTime,endTime,options,days }); };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="jqj">{initialData ? "Edit Event" : "Add Event"}</h3>

        <input className="jj" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />

        <select className="j1j" value={type} onChange={e=>setType(e.target.value)}>
          <option className="j1j" value="notice">Notice</option>
          <option className="j1j" value="vote">Vote</option>
        </select>

        <textarea className="jjgb" placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />

        <label className="jj">Start Time: <input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)} /></label>
        <label className="jj">End Time: <input type="datetime-local" value={endTime} onChange={e=>setEndTime(e.target.value)} /></label>

      

        {/* Vote Options */}
        {type==="vote" && (
          <div>
            <h4 className="hehl8" >Options</h4>
            {options.map((opt,i)=>(
              <div key={i}>
                <input value={opt} onChange={e=>updateOption(i,e.target.value)} />
                <button className="gg1" onClick={()=>removeOption(i)}>Remove</button>
                <button className="gg1" onClick={()=>removeOption(i)}>Remove</button>
              </div>
            ))}
            {options.length < 10 && <button onClick={addOption}>Add Option</button>}
          </div>
        )}

        <button className="save-btn" onClick={handleSave}>Save</button>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
