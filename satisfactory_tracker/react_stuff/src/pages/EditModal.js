import React, { useState } from "react";

const EditModal = ({ row, columns, onSave, onClose }) => {
  const [updatedRow, setUpdatedRow] = useState({ ...row });

  const handleChange = (e, column) => {
    setUpdatedRow({ ...updatedRow, [column]: e.target.value });
  };

  const handleSave = () => {
    onSave(updatedRow);
  };

  return (
    <div style={{
      position: "fixed", 
      top: "50%", 
      left: "50%", 
      transform: "translate(-50%, -50%)",
      padding: "20px",
      background: "white",
      border: "1px solid black",
      zIndex: 1000,
    }}>
      <h2>Edit Row</h2>
      {columns.map((col) => (
        <div key={col} style={{ marginBottom: "10px" }}>
          <label>{col}:</label>
          <input
            type="text"
            value={updatedRow[col]}
            onChange={(e) => handleChange(e, col)}
            disabled={col === "id"} // Disable editing the ID
          />
        </div>
      ))}
      <button onClick={handleSave}>Save</button>
      <button onClick={onClose} style={{ marginLeft: "10px" }}>
        Cancel
      </button>
    </div>
  );
};

export default EditModal;