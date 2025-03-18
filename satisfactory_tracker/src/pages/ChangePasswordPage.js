import React, { useState } from "react";
import { TextField, Button, Box, Typography, Alert } from "@mui/material";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";  // Import for getting query params

const ChangePasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchParams] = useSearchParams();  // Get query params
  const userId = searchParams.get("user_id");  // Extract user_id from URL
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // console.log("Sending user_id:", userId);  // Log user_id before sending

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.post(API_ENDPOINTS.change_password, { user_id: userId, password });
      setSuccess("Password changed successfully! Redirecting...");
      
      setTimeout(() => navigate("/login"), 2000);
  } catch (error) {
      setError(error.response?.data?.error || "Failed to change password.");
  }
};

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>Change Password</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField fullWidth type="password" label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required />
        <TextField fullWidth type="password" label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} margin="normal" required />
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} fullWidth>
          Update Password
        </Button>
      </form>
    </Box>
  );
};

export default ChangePasswordPage;
