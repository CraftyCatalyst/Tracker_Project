//Mine
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
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

const DataManagementPage = () => {
  const [tables, setTables] = useState([]); // List of tables
  const [selectedTable, setSelectedTable] = useState(""); // Selected table name
  const [tableData, setTableData] = useState([]); // Data of the selected table
  const [columns, setColumns] = useState([]); // Table column headers
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [editingRow, setEditingRow] = useState(null); // Row being edited
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Create modal visibility
  const [newRow, setNewRow] = useState({}); // New row data

  const columnOrderConfig = {
    recipe: ['id', 'part_id', 'recipe_name', 'ingredient_count', 'source_level', 'base_input', 'base_production_type', 'produced_in_automated', 'produced_in_manual', 'base_demand_pm', 'base_supply_pm', 'byproduct', 'byproduct_supply_pm'],
    alternate_recipe: ['id', 'part_id', 'recipe_id', 'selected'],
    node_purity: ['id', 'node_purity'],
    miner_type: ['id', 'miner_type'],
    miner_supply: ['id', 'node_purity_id', 'miner_type_id', 'base_supply_pm'],
    power_shards: ['id', 'quantity', 'output_increase'],
    user: ['id', 'role', 'username', 'email', 'password', 'is_verified'],
    part: ['id', 'part_name', 'level', 'category'],
    data_validation: ['id', 'table_name', 'column_name', 'value', 'description'],
  };

  const rows = tableData.map((row, index) => ({ id: index, ...row })); // Ensure unique IDs for DataGrid

  const gridColumns = columns.map((col) => ({
    field: col,
    headerName: col.replace(/_/g, ' ').toUpperCase(), // Format header names
    flex: 1, // Adjust column width
  }));

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
      // Apply custom column order if specified, otherwise use dynamic order
      const orderedColumns =
        columnOrderConfig[tableName] || Object.keys(response.data.rows[0] || {});
      setColumns(orderedColumns);
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
            justifyContent: "space-between", // Spread the dropdown and button
            alignItems: "center",
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
            disabled={!selectedTable} // Disable if no table is selected
            sx={{
              height: "fit-content", // Match the height of the dropdown
            }}
          >
            Create New Row
          </Button>
        </Box>


        {/* Data Grid */}
        {selectedTable && (
          <Box sx={{ height: 700, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={[
                ...gridColumns,
                {
                  field: "actions",
                  headerName: "Actions",
                  flex: 1,
                  renderCell: (params) => (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleEdit(params.row)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleDelete(params.row.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  ),
                },
              ]}
              pageSize={20}
              rowsPerPageOptions={[5, 10, 20]}
              checkboxSelection
              disableSelectionOnClick
              sortingOrder={['asc', 'desc']}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                },
              }}
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  backgroundcolor: 'secondary.main',
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  fontSize: '16px',
                  fontWeight: 'bold',
                },
              }}
            />
          </Box>
        )}

        {/* Modal for Editing */}
        {isModalOpen && editingRow && (
          <EditModal
            row={editingRow}
            columns={columns}
            onSave={handleSaveChanges}
            onClose={handleModalClose}
            isCreateModalOpen={isCreateModalOpen}
            tableName={selectedTable} // Pass the currently selected table
          />
        )}

        {isCreateModalOpen && (
          <EditModal
            row={newRow}
            columns={columns}
            onSave={handleSaveNewRow}
            onClose={handleCreateModalClose}
            isCreateModalOpen={isCreateModalOpen}
            tableName={selectedTable} // Pass the currently selected table
          />
        )}
      </Box>
    </Box>

  );
};

export default DataManagementPage;
