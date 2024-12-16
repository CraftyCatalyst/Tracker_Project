import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(API_ENDPOINTS.login, { email, password });
      // Fetch user info after successful login
      //const userInfoResponse = await axios.get(API_ENDPOINTS.userinfo, { withCredentials: true });

      // Extract user information from the response
      const userInfo = response.data.user;

      // Save user info to localStorage
      localStorage.setItem('user_info', JSON.stringify(userInfo));


      navigate('/'); // Redirect to dashboard after successful login
    } catch (error) {
      console.error('Login failed:', error, 'email:', email, 'password:', password);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(to right, #0A4B3E, #000000)',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
      }}
    >
      <Box
        sx={{
          backgroundColor: 'background.paper',
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h1" color="primary" align="center" gutterBottom>
          Login
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Don’t have an account? <Button variant="text" onClick={() => navigate('/signup')} color="secondary">Sign up</Button>
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
