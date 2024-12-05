import React, { useState, useEffect } from "react";
import { Grid2, Paper, Typography, Button, Table } from '@mui/material';
import { SimpleTreeView , TreeItem } from '@mui/x-tree-view';
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

  // const ExampleGrid = () => (
  //   <Grid2 container spacing={2}>
  //     {[1, 2, 3, 4, 5].map((item) => (
  //       <Grid2 item xs={12} sm={6} md={4} key={item}>
  //         <Paper style={{ padding: '20px', textAlign: 'center' }}>
  //           <Typography variant="h6" color="secondary">Item {item}</Typography>
  //         </Paper>
  //       </Grid2>
  //     ))}
  //   </Grid2>
  // );

  // const ExampleTreeView = () => (
  //   <SimpleTreeView>
  //     <TreeItem nodeId="1" label="Parent">
  //       <TreeItem nodeId="2" label="Child 1" />
  //       <TreeItem nodeId="3" label="Child 2">
  //         <TreeItem nodeId="4" label="Subchild" />
  //       </TreeItem>
  //     </TreeItem>
  //   </SimpleTreeView>
  // );

  return (
    <div>
      <Typography variant="h1" color="primary">
        Data Management Page
      </Typography>
      
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
          <Button
            variant="contained"
            color="secondary"
            sx={{
              marginTop: 2,
              color: 'secondary.contrastText', // Ensures text matches theme
              backgroundColor: 'secondary.main', // Ensures background matches theme
              }}
              onClick={handleCreate}
          >
            Create New Row
          </Button>
          <Table border="1">
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
                    <Button
                      variant="contained"
                      color="secondary"
                      sx={{
                        marginTop: 2,
                        color: 'secondary.contrastText', // Ensures text matches theme
                        backgroundColor: 'secondary.main', // Ensures background matches theme
                        }}
                        onClick={() => handleEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      sx={{
                        marginTop: 2,
                        color: 'secondary.contrastText', // Ensures text matches theme
                        backgroundColor: 'secondary.main', // Ensures background matches theme
                        }}
                        onClick={() => handleDelete(row)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
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
// ################################################

export default DataManagementPage;