import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from "@mui/material";
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import axios from "axios";
import EditModal from "./EditModal";
import { API_ENDPOINTS } from "../apiConfig";

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
        const response = await axios.get(API_ENDPOINTS.tables); // Endpoint to get table names
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
      const response = await axios.get(`${API_ENDPOINTS.tables}/${tableName}`);
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
      await axios.put(`${API_ENDPOINTS.tables}/${selectedTable}/${updatedRow.id}`, updatedRow);
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
      await axios.post(`${API_ENDPOINTS.tables}/${selectedTable}`, row);
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
      await axios.delete(`${API_ENDPOINTS.tables}/${selectedTable}/${rowId}`);
      alert("Row deleted successfully!");
      fetchTableData(selectedTable); // Refresh table data
    } catch (error) {
      console.error("Error deleting row:", error);
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Box
        sx={{
            flex: 4,
            padding: "16px",
            background: "linear-gradient(to right, #000000, #0F705C)",
            color: "#CCFFFF",                   
        }}
      > 
      <Typography variant="h1" color="primary">
        Data Management Page
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center", // Align dropdown and button vertically
          gap: "16px", // Space between elements
          marginBottom: "16px",          
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        {/* Select Table Dropdown */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <label style={{ marginBottom: "4px", color: "#CCFFFF" }}>Select Table:</label>
          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: "#fff",
            }}
          >
            <option value="">-- Select a Table --</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </Box>
        {/* Create New Row Button */}
        <Button
          variant="contained"
          color="secondary"
          onClick={handleCreate}
          sx={{
            height: "fit-content", // Match the height of the dropdown
            alignSelf: "flex-end", // Align with the dropdown
          }}
        >
          Create New Row
        </Button>
      </Box>

      {/* Data Grid */}
      {selectedTable && (
        <Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((col) => (
                      <TableCell key={col}>
                        {row[col]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="contained"
                        color="secondary"
                        sx={{ marginRight: 1 }}
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() =>
                          handleDelete(row.id)
                        }
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography>No data to display</Typography>
        </Box>
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
    </Box>
    </Box>
  );
};

export default DataManagementPage;