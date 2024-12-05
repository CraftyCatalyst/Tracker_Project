import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField } from '@mui/material';

const EditModal = ({ row, columns, onSave, onClose }) => {
  const [updatedRow, setUpdatedRow] = useState({ ...row });

  // Handle field changes
  const handleChange = (e, column) => {
    setUpdatedRow({ ...updatedRow, [column]: e.target.value });
  };

  // Save the updated row
  const handleSave = () => {
    onSave(updatedRow);
  };

  return (
    <Modal
      open={Boolean(row)} // Open modal only if a row is provided
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
          bgcolor: 'background.mid',
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
        }}
      >
        <Typography
          id="edit-modal-title"
          variant="h1"
          // component="h2"
          sx={{ mb: 2, color: 'primary.main' }}
        >
          Edit Row
        </Typography>

        {columns.map((col) => (
          <TextField
            key={col}
            label={col}
            value={updatedRow[col]}
            onChange={(e) => handleChange(e, col)}
            fullWidth
            disabled={col === "id"} // Disable editing the ID
            margin="normal"
            variant="outlined"            
          />
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="secondary"
            sx={{
              color: 'secondary.contrastText', // Ensures text matches theme
              backgroundColor: 'secondary.main', // Ensures background matches theme
              mr: 1,
              }}
            onClick={handleSave}
            //sx={{ mr: 1 }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="secondary"
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
