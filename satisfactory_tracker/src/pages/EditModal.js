//mine
import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, Button, TextField, MenuItem, Tooltip } from "@mui/material";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";

const EditModal = ({ row, columns, onSave, onClose, isCreateModalOpen, tableName }) => {
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

        for (const fk of foreignKeys) {
          const endpoint = API_ENDPOINTS.table_name(fk.replace("_id", ""));
          const response = await axios.get(endpoint);
          data[fk] = response.data.map(row => ({
            id: row.id,
            name: row.name || row.node_purity || row.miner_type,
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
          background: 'background.default', //'linear-gradient(to right, #0A4B3E, #000000)',
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
          sx={{ mb: 2, color: 'primary.main', textAlign: 'center' }}
        >
          {isCreateModalOpen ? "Create New Row" : "Edit Row"}
        </Typography>

        {columns.map((col) => {
          const validValues = getValidValues(tableName, col); // Validation rules
          console.log("Valid Values:", validValues, tableName, col); // Debug
          const fkValues = foreignKeyData[col] || []; // Default to empty array if undefined
          //const description = getFieldDescription(tableName, col); // Field description

          if (validValues.length > 0) {
            return (
              <Tooltip
                key={col}
                title={hoveredDescription || "Hover over a value for details"}
                arrow
              >
                <TextField
                  select
                  key={col}
                  label={col.replace(/_/g, " ")}
                  value={updatedRow[col] || ""}
                  onChange={(e) => handleChange(e, col)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  slotProps={{
                    input: {
                      sx: {
                        color: col === "id" ? 'text.secondary' : 'text.primary', // Adjust text color for disabled fields
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: col === "id" ? 'text.disabled' : 'primary.contrastText', // Default border color
                      },
                      '&:hover fieldset': {
                        borderColor: col === "id" ? 'text.disabled' : 'primary.light', // Prevent hover color on disabled fields
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main', // Focus state for active fields
                      },
                      '&.Mui-disabled fieldset': {
                        borderColor: 'text.disabled', // Explicitly set border color for disabled state
                      },
                    },
                    '& .MuiInputBase-root.Mui-disabled': {
                      color: 'text.secondary', // Safeguard for disabled text styling
                    },
                  }}
                >
                  {validValues.map(({ value, description }) => (
                    <MenuItem
                      key={value}
                      value={value}
                      onMouseEnter={() => setHoveredDescription(description || "")} // Update tooltip on hover
                      onMouseLeave={() => setHoveredDescription("")} // Reset tooltip on mouse leave
                    >
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Tooltip>
            );
        } else if (fkValues.length > 0) {
          return (
            <TextField
              select
              key={col}
              label={col.replace(/_/g, " ")}
              value={updatedRow[col] || ""}
              onChange={(e) => handleChange(e, col)}
              fullWidth
              margin="normal"
              variant="outlined"
              slotProps={{
                input: {
                  sx: {
                    color: col === "id" ? 'text.secondary' : 'text.primary', // Adjust text color for disabled fields
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: col === "id" ? 'text.disabled' : 'primary.contrastText', // Default border color
                  },
                  '&:hover fieldset': {
                    borderColor: col === "id" ? 'text.disabled' : 'primary.light', // Prevent hover color on disabled fields
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main', // Focus state for active fields
                  },
                  '&.Mui-disabled fieldset': {
                    borderColor: 'text.disabled', // Explicitly set border color for disabled state
                  },
                },
                '& .MuiInputBase-root.Mui-disabled': {
                  color: 'text.secondary', // Safeguard for disabled text styling
                },
              }}
            >
              {fkValues.map((fk) => (
                <MenuItem key={fk.id} value={fk.id}>
                  {fk.name}
                </MenuItem>
              ))}
            </TextField>
            );
        } else {
          return (
            <TextField
              key={col}
              label={col.replace(/_/g, " ")}
              value={updatedRow[col] || ""}
              onChange={(e) => handleChange(e, col)}
              fullWidth
              disabled={col === "id"}
              margin="normal"
              variant="outlined"
              slotProps={{
                input: {
                  sx: {
                    color: col === "id" ? 'text.secondary' : 'text.primary', // Adjust text color for disabled fields
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: col === "id" ? 'text.disabled' : 'primary.contrastText', // Default border color
                  },
                  '&:hover fieldset': {
                    borderColor: col === "id" ? 'text.disabled' : 'primary.light', // Prevent hover color on disabled fields
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main', // Focus state for active fields
                  },
                  '&.Mui-disabled fieldset': {
                    borderColor: 'text.disabled', // Explicitly set border color for disabled state
                  },
                },
                '& .MuiInputBase-root.Mui-disabled': {
                  color: 'text.secondary', // Safeguard for disabled text styling
                },
              }}
              >
              {fkValues.map((fk) => (
                <MenuItem key={fk.id} value={fk.id}>
                  {fk.name}
                </MenuItem>
              ))}
            </TextField>
            
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
