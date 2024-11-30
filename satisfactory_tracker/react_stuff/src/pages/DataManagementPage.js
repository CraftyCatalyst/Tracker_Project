import React, { useState, useEffect } from "react";
import axios from "axios";

const DataManagementPage = () => {
  const [tables, setTables] = useState([]); // List of tables
  const [selectedTable, setSelectedTable] = useState(""); // Selected table name
  const [tableData, setTableData] = useState([]); // Data of the selected table
  const [columns, setColumns] = useState([]); // Table column headers

  // Fetch table names on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await axios.get("/api/tables"); // Endpoint to get table names
        setTables(response.data.tables); // Assume API returns { tables: ["table1", "table2"] }
      } catch (error) {
        console.error("Error fetching table names:", error);
      }
    };
    fetchTables();
  }, []);

  // Fetch data for the selected table
  const fetchTableData = async (tableName) => {
    try {
      const response = await axios.get(`/api/tables/${tableName}`); // Endpoint to fetch table data
      setTableData(response.data.rows); // Assume API returns { rows: [...data...] }
      setColumns(Object.keys(response.data.rows[0] || {})); // Extract columns from first row
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

  // Handle inline editing or row update
  const handleRowUpdate = async (updatedRow) => {
    try {
      await axios.put(`/api/tables/${selectedTable}/${updatedRow.id}`, updatedRow);
      alert("Row updated successfully!");
      fetchTableData(selectedTable); // Refresh table data
    } catch (error) {
      console.error("Error updating row:", error);
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
                    <td
                      key={col}
                      contentEditable
                      onBlur={(e) =>
                        handleRowUpdate({ ...row, [col]: e.target.innerText })
                      }
                    >
                      {row[col]}
                    </td>
                  ))}
                  <td>
                    <button onClick={() => handleDelete(row.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataManagementPage;
