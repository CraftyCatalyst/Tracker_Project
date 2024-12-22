//mine
import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField } from "@mui/material";

const EditModal = ({ row, columns, onSave, onClose, isCreateModalOpen }) => {
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
          />
        ))}

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
