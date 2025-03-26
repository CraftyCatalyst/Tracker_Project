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
import { useTheme } from '@mui/material/styles';

const DataManagementPage = () => {
  const theme = useTheme();
  const [tables, setTables] = useState([]); // List of tables
  const [selectedTable, setSelectedTable] = useState(""); // Selected table name
  const [tableData, setTableData] = useState([]); // Data of the selected table
  const [columns, setColumns] = useState([]); // Table column headers
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [editingRow, setEditingRow] = useState(null); // Row being edited
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Create modal visibility
  const [newRow, setNewRow] = useState({}); // New row data

  const columnOrderConfig = {
    recipe: ['id', 'part_id', 'recipe_name', 'ingredient_count', 'source_level', 'production_type', 'produced_in_automated', 'produced_in_manual', 'ingredient_part_id', 'ingredient',  'ingredient_demand_pm', 'ingredient_demand_quantity', 'part_supply_pm', 'part_cycle_time_sec', 'part_supply_quantity', 'byproduct', 'byproduct_supply_pm', 'byproduct_supply_quantity'],
    alternate_recipe: ['id', 'part_id', 'recipe_id', 'selected'],
    node_purity: ['id', 'node_purity'],
    machine_level: ['id', 'machine_level'],
    miner_supply: ['id', 'node_purity_id', 'machine_level_id', 'base_supply_pm'],
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
      // console.log(`Calling PUT on URL: ${API_ENDPOINTS.tables}/${selectedTable}/${updatedRow.id}`);
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
      const url = `${API_ENDPOINTS.tables}/${selectedTable}/${rowId}`;
      // console.log(`Calling DELETE on URL: ${url}`);
      const response = await axios.delete(url);
      // const response = await axios.delete(`${API_ENDPOINTS.tables}/${selectedTable}/${rowId}`);
      // console.log("DELETE response:", response.data);
      alert("Row deleted successfully!");
      fetchTableData(selectedTable); // Refresh table data
    } catch (error) {
      console.error("Error deleting row:", error, error.response);
    }
  };
//"100vh" }}>
  return (
    <Box sx={{ display: "flex", height: "100vh", Width: "100%" }}> 
      <Box
        sx={{
          flex: 4,
          padding: theme.spacing(2),
          background: theme.palette.background,
          color: theme.palette.text.primary,
          width: "100%", 
          maxWidth: "100vw", 
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h1" gutterBottom>
          Data Management Page
        </Typography>

        {/* Dropdown + Button Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: theme.spacing(2),
            padding: theme.spacing(2),
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background,
            flexWrap: "wrap", // Allow items to wrap
          }}
        >
          {/* Select Table Dropdown */}
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: "200px"  }}>
            <label style={{ marginBottom: theme.spacing(0.5) }}>Select Table:</label>
            <select
              value={selectedTable}
              onChange={(e) => handleTableChange(e)}
              // style={{
              //   padding: theme.spacing(1),
              //   borderRadius: theme.shape.borderRadius,
              //   border: `1px solid ${theme.palette.text.disabled}`,
              //   background: theme.palette.background.dropdown,
              //   color: theme.palette.text.dropdown,
              // }}
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
            // color= {theme.palette.secondary.main}
            onClick={handleCreate}
            disabled={!selectedTable} // Disable if no table is selected
            sx={{ height: "fit-content", whiteSpace: "nowrap" }}
          >
            Create New Row
          </Button>
        </Box>

        {/* Data Grid */}
        {selectedTable && (
          <Box sx={{ height: "calc(100vh - 200px)", width: "100%", minWidth: 0 }}>
          <DataGrid
              density="compact"
              rows={rows}
              columns={[
                  ...gridColumns,

                {
                  field: "actions",
                  headerName: "Actions",
                  flex: 1,
                  renderCell: (params) => (
                    <Box sx={{ display: "flex", gap: theme.spacing(2) }}>
                      <Button
                        variant="contained"
                        // color="secondary"
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
            />
          </Box>
        )}

        {/* Modal for Editing */}
        {isModalOpen && editingRow && (
          <EditModal
            row={editingRow}
            columns={gridColumns.map(col => col.field)}
            //columns={columns}
            onSave={handleSaveChanges}
            onClose={handleModalClose}
            isCreateModalOpen={isCreateModalOpen}
                        tableName={selectedTable}
          />
        )}

        {isCreateModalOpen && (
          <EditModal
            row={newRow}
            columns={gridColumns.map(col => col.field)}
            //columns={columns}
            onSave={handleSaveNewRow}
            onClose={handleCreateModalClose}
            isCreateModalOpen={isCreateModalOpen}
                        tableName={selectedTable}
          />
        )}
      </Box>
    </Box>
  );
};

export default DataManagementPage;
