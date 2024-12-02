import React, { useState, useEffect } from "react";
import axios from "axios";
import EditModal from "./EditModal";

const DataManagementPage = () => {
  const [tables, setTables] = useState([]); // List of tables
  const [selectedTable, setSelectedTable] = useState(""); // Selected table name
  const [tableData, setTableData] = useState([]); // Data of the selected table
  const [columns, setColumns] = useState([]); // Table column headers
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [editingRow, setEditingRow] = useState(null); // Row being edited
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Create modal visibility
  const [newRow, setNewRow] = useState({}); // New row data

  // Fetch table names on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await axios.get("/api/tables"); // Endpoint to get table names
        setTables(response.data.tables);
      } catch (error) {
        console.error("Error fetching table names:", error);
      }
    };
    fetchTables();
  }, []);

  // Fetch data for the selected table
  const fetchTableData = async (tableName) => {
    try {
      const response = await axios.get(`/api/tables/${tableName}`);
      setTableData(response.data.rows);
      setColumns(Object.keys(response.data.rows[0] || {}));
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
    }
  };

  // Handle table selection change
  const handleTableChange = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    if (tableName) fetchTableData(tableName);
  };

  // Open the modal for editing
  const handleEdit = (row) => {
    setEditingRow(row);
    setIsModalOpen(true);
  };

  // Open the modal for creating a new row
  const handleCreate = () => {
    const defaultRow = columns.reduce((acc, col) => {
      acc[col] = ""; // Initialize each column with an empty string or default value
      return acc;
    }, {});
    setNewRow(defaultRow);
    setIsCreateModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRow(null);
  };

  // Handle create modal close
  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setNewRow({});
  };

  // Handle save changes
  const handleSaveChanges = async (updatedRow) => {
    try {
      await axios.put(`/api/tables/${selectedTable}/${updatedRow.id}`, updatedRow);
      alert("Row updated successfully!");
      fetchTableData(selectedTable); // Refresh table data
      handleModalClose();
    } catch (error) {
      console.error("Error updating row:", error);
    }
  };

  // Handle save new row
  const handleSaveNewRow = async (row) => {
    try {
      await axios.post(`/api/tables/${selectedTable}`, row);
      alert("Row created successfully!");
      fetchTableData(selectedTable);
      handleCreateModalClose();
    } catch (error) {
      console.error("Error creating new row:", error);
    }
  };

   // Handle row deletion
   const handleDelete = async (rowId) => {
    try {
      await axios.delete(`/api/tables/${selectedTable}/${rowId}`);
      alert("Row deleted successfully!");
      fetchTableData(selectedTable); // Refresh table data
    } catch (error) {
      console.error("Error deleting row:", error);
    }
  };

  return (
    <div>
      <h1>Data Management</h1>

      {/* Dropdown for table selection */}
      <div>
        <label>Select Table:</label>
        <select value={selectedTable} onChange={handleTableChange}>
          <option value="">-- Select a Table --</option>
          {tables.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>
      </div>

      {/* Data Grid */}
      {selectedTable && (
        <div>
          <h2>Table: {selectedTable}</h2>
          <button onClick={handleCreate}>Create New Row</button>
          <table border="1">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col}>{row[col]}</td>
                  ))}
                  <td>
                    <button onClick={() => handleEdit(row)}>Edit</button>
                    <button onClick={() => handleDelete(row.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Editing */}
      {isModalOpen && editingRow && (
        <EditModal
          row={editingRow}
          columns={columns}
          onSave={handleSaveChanges}
          onClose={handleModalClose}
        />
      )}
    
      {isCreateModalOpen && (
          <EditModal
            row={newRow}
            columns={columns}
            onSave={handleSaveNewRow}
            onClose={handleCreateModalClose}
          />
        )}
    </div>
  );
};

export default DataManagementPage;