//mine
import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, Button, TextField, MenuItem, Tooltip } from "@mui/material";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { useTheme } from '@mui/material/styles';
import centralLogging from '../services/logService';



const EditModal = ({ row, columns, onSave, onClose, isCreateModalOpen, tableName }) => {
  const theme = useTheme();
  const [updatedRow, setUpdatedRow] = useState({ ...row });
  const [validationRules, setValidationRules] = useState([]);
  const [foreignKeyData, setForeignKeyData] = useState({});
  const [hoveredDescription, setHoveredDescription] = useState(""); // State for dynamic tooltip text

  useEffect(() => {
    const fetchValidationRules = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.validation);
        // console.log("Fetched Validation Rules:", response.data); // Debug
        setValidationRules(response.data || []); // Safeguard for empty response
        //console.log("Set Validation Rules:", response.data); // Debug
      } catch (error) {
        console.error("Error fetching validation rules:", error);
      }
    };
    fetchValidationRules();
  }, []);

  const getValidValues = (tableName, columnName) => {
    console.log("Getting validation rules for:", tableName, columnName); // Debug
    console.log("Validation Rules:", validationRules); // Debug
    // centralLogging(`Getting validation rules for ${tableName}.${columnName}`);
    return (
      validationRules
        .filter(rule => rule["table_name"] === tableName && rule["column_name"] === columnName)
        .map(rule => ({ value: rule.value, description: rule.description })) || []
    );
  };

  useEffect(() => {
    const fetchForeignKeyData = async () => {
      try {
        const foreignKeys = columns.filter(col => col.endsWith("_id"));
        const data = {};
        // centralLogging(`Fetching foreign key data for ${foreignKeys} columns`);
        for (const fk of foreignKeys) {
          const endpoint = API_ENDPOINTS.table_name(fk.replace("_id", ""));
          const response = await axios.get(endpoint);
          // centralLogging(`Fetched foreign key data for ${fk}: ${response.data.length} rows`);
          data[fk] = response.data.map(row => ({
            id: row.id,
            name: row.name || row.node_purity ||
              row.recipe_name || row.part_name || 
              row.machine_name || row.machine_level ||
              row.save_file_path_name || row.username
          }));
        }

        setForeignKeyData(data);
        console.log("Set Foreign Key Data:", data); // Debug
      } catch (error) {
        console.error("Error fetching foreign key data:", error);
      }
    };
    fetchForeignKeyData();
  }, [columns]);

  const handleChange = (e, column) => {
    setUpdatedRow({ ...updatedRow, [column]: e.target.value });
  };

  const handleSave = () => {
    // console.log("Saving Row:", updatedRow); // Debug
    onSave(updatedRow);
  };

  return (
    <Modal
      open={Boolean(row) || isCreateModalOpen} // Open modal only if a row is provided or creating a new row
      onClose={onClose}
      aria-labelledby="edit-modal-title"
      aria-describedby="edit-modal-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: 500,
          //height: '70vh',
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          background: `linear-gradient(to right, ${theme.palette.background.linearGradientLeft}, ${theme.palette.background.linearGradientRight})`,
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          color: 'text.primary',
          overflowY: 'auto',
          overflowX: 'auto',
        }}
      >
        <Typography
          id="edit-modal-title"
          variant="h2"
          sx={{ mb: 2, color: 'text.primary', textAlign: 'center' }}
        >
          {isCreateModalOpen ? "Create New Row" : "Edit Row"}
        </Typography>

        {columns.map((col) => {
          const validValues = getValidValues(tableName, col); // Validation rules
          console.log("Valid Values:", validValues, tableName, col); // Debug
          const fkValues = foreignKeyData[col] || []; // Default to empty array if undefined
          //const description = getFieldDescription(tableName, col); // Field description

          if (validValues.length > 0 || fkValues.length > 0) {
            return (
              <Box key={col} sx={{ mb: 2 }}>
                <label
                  htmlFor={col}
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "text.primary",
                  }}
                >
                  {col.replace(/_/g, " ")}
                </label>
                <select
                  id={col}
                  value={updatedRow[col] || ""}
                  onChange={(e) => handleChange(e, col)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    background: "white",
                  }}
                >
                  <option value="" disabled>
                    -- Select an option --
                  </option>
                  {/* Render valid values */}
                  {validValues.map(({ value, description }) => (
                    <option key={value} value={value} title={description}>
                      {value}
                    </option>
                  ))}
                  {/* Render foreign key values */}
                  {fkValues.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </Box>
            );
          } else {
            return (
              <Box key={col} sx={{ mb: 2 }}>
                <label
                  htmlFor={col}
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "text.primary",
                  }}
                >
                  {col.replace(/_/g, " ")}
                </label>
                <input
                  type="text"
                  id={col}
                  value={updatedRow[col] || ""}
                  onChange={(e) => handleChange(e, col)}
                  disabled={col === "id"}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: col === "id" ? "1px solid #ccc" : "1px solid #00FFCC",
                    background: col === "id" ? "#f5f5f5" : "white",
                    color: col === "id" ? "#aaa" : "#000",
                  }}
                />
              </Box>
            );
          }
        })}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="secondary"
            sx={{
              color: 'secondary.contrastText',
              mr: 1,
            }}
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            sx={{
              color: 'primary.contrastText',
              borderColor: 'primary.contrastText',
            }}
            onClick={onClose}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default EditModal;
