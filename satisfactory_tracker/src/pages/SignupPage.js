import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";
import logToBackend from "../services/logService";

axios.defaults.withCredentials = true;

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const [recaptchaRendered, setRecaptchaRendered] = useState(false); // Add state to track rendering
  
  // console.log("Using reCAPTCHA site key:", RECAPTCHA_SITE_KEY);
  // logToBackend("SignupPage - Using reCAPTCHA site key: " + RECAPTCHA_SITE_KEY, "INFO");
  
  useEffect(() => {
    // console.log("reCAPTCHA container state:", document.getElementById('recaptcha-container'));
    if (window.grecaptcha && !recaptchaRendered) {
      console.log('reCAPTCHA script loaded.');
      window.grecaptcha.ready(() => {
        console.log('reCAPTCHA is ready.');
  
        // Ensure the container is clean
        const container = document.getElementById('recaptcha-container');
        if (container && container.hasChildNodes()) {
          const hasRenderedCaptcha = !!container.querySelector('iframe');
          if (hasRenderedCaptcha) {
            console.log("reCAPTCHA already rendered. Skipping...");
            return;
          }
          console.log("Clearing reCAPTCHA container...");
          container.innerHTML = ''; // Clear existing content
        }
  
        console.log('Rendering reCAPTCHA...');
        window.grecaptcha.render('recaptcha-container', {
          sitekey: RECAPTCHA_SITE_KEY,
        });
        setRecaptchaRendered(true); // Mark as rendered
      });
    }
  }, [RECAPTCHA_SITE_KEY, recaptchaRendered]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
  
    const recaptchaToken = window.grecaptcha.getResponse();
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA.");
      setIsLoading(false);
      return;
    }
  
    try {
      const response = await axios.post(API_ENDPOINTS.signup, {
        username,
        email,
        password,
        recaptcha_token: recaptchaToken,
      });
      setSuccess(response.data.message || 'Account created successfully! Redirecting to login page...');
      setTimeout(() => navigate('/login'), 2000); // React handles the navigation
    } catch (error) {
      setError(error.response?.data?.message || 'Signup failed. Please try again.');
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
          background: 'background.paper',
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h1" color="primary" align="center" gutterBottom>
          Sign Up
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
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
          <div id="recaptcha-container"></div>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing up...' : 'Sign Up'}
          </Button>
        </form>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Already have an account? <Button variant="text" onClick={() => navigate('/login')} color="secondary">Log in</Button>
        </Typography>
      </Box>
    </Box>
  );
};

console.log("SignupPage Loaded!");
export default SignupPage;
