// src/components/Search.jsx
import React from "react";

export default function Search({ value, setValue, onSearch }) {
  return (
    <div className="search-area">
      <input
        type="text"
        value={value}
        placeholder="🔍 সার্চ করুন..."
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        className="search"
      />
      <button onClick={onSearch} className="submit-btn">
        Search
      </button>
    </div>
  );
}
