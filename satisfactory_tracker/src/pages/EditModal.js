//mine
import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField, MenuItem } from "@mui/material";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { useEffect } from "react";


const EditModal = ({ row, columns, onSave, onClose, isCreateModalOpen, tableName }) => {
  const [updatedRow, setUpdatedRow] = useState({ ...row });
  const [validationRules, setValidationRules] = useState([]);
  const [foreignKeyData, setForeignKeyData] = useState({});

  useEffect(() => {
    const fetchValidationRules = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.validation);
        // console.log("Fetched Validation Rules:", response.data); // Debug
        setValidationRules(response.data);
        //console.log("Set Validation Rules:", response.data); // Debug
      } catch (error) {
        //console.error("Error fetching validation rules:", error);
      }
    };
    fetchValidationRules();
  }, []);

  const getValidValues = (tableName, columnName) => {
    //console.log("Validation Rules:", validationRules);
    //console.log("Checking rules for Table:", tableName, "Column:", columnName);
    const values = validationRules
      .filter(
        (rule) =>
          rule["table_name"] === tableName && rule["column_name"] === columnName
      )
      .map((rule) => rule.value);
    //console.log(`Valid values for ${columnName}:`, values); // Debug    
    return values;
  };

  useEffect(() => {
    const fetchForeignKeyData = async () => {
      try {
        const foreignKeys = columns.filter((col) => col.endsWith("_id")); // Detect foreign key columns
        const data = {};

        for (const fk of foreignKeys) {
          const tableName = fk.replace("_id", ""); // Infer table name
          //console.log(`Fetching Foreign Key Data for ${API_ENDPOINTS.table_name}/${tableName}`); // Debug
          const endpoint = API_ENDPOINTS.table_name(tableName);
          const response = await axios.get(`${endpoint}`); // Fetch foreign key data
          //console.log(`Fetched Foreign Key Data for ${endpoint}:`, response.data); // Debug
          setForeignKeyData(response.data);
          data[fk] = response.data.map((row) => ({
            id: row.id,
            name: row.name || row.node_purity || row.miner_type, // Adjust based on the schema
          }));
        }

        setForeignKeyData(data);
        //console.log("Fetched Foreign Key Data:", data); // Debug
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
    console.log("Saving Row:", updatedRow); // Debug
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
          width: 400,
          bgcolor: 'background.paper',
          background: 'background.default', //'linear-gradient(to right, #0A4B3E, #000000)',
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          color: 'text.primary',
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
          const fkValues = foreignKeyData[col]; // Foreign key values

          if (validValues.length > 0) {
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
              >
                {validValues.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            );
          } else if (fkValues) {
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
              />
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
