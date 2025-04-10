import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";
import centralLogging from "../services/logService";
import { useAlert } from "../context/AlertContext";

axios.defaults.withCredentials = true;

const SignupPage = () => {
  const { showAlert } = useAlert();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [recaptchaRendered, setRecaptchaRendered] = useState(false);
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

  
  useEffect(() => {
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
            // If we want to ensure it's always fresh, we could reset here too
            // window.grecaptcha.reset(); // Optional: reset even if technically rendered
            setRecaptchaRendered(true); // Still mark as rendered
            return;
          }
          console.log("Clearing reCAPTCHA container...");
          container.innerHTML = ''; // Clear existing content
        }
  
        console.log('Rendering reCAPTCHA...');
        try { // Add try/catch for potential rendering errors
        window.grecaptcha.render('recaptcha-container', {
          sitekey: RECAPTCHA_SITE_KEY,
        });
        setRecaptchaRendered(true); // Mark as rendered
        } catch (renderError) {
            console.error("Failed to render reCAPTCHA:", renderError);
            showAlert('error', 'Failed to load reCAPTCHA. Please refresh the page.');
        }
      });
    }
  }, [RECAPTCHA_SITE_KEY, recaptchaRendered, showAlert]); // Added showAlert to dependency array


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
  
    const recaptchaToken = window.grecaptcha?.getResponse(); // Use optional chaining
    if (!recaptchaToken) {
      // Use showAlert for reCAPTCHA error
      showAlert("error", "Please complete the reCAPTCHA.");
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

      // Use showAlert for success, using the message from the backend
      showAlert("success", response.data.message);

      // Clear the form on success
      setUsername('');
      setEmail('');
      setPassword('');
      window.grecaptcha?.reset(); // Reset reCAPTCHA widget

      // --- Removed redirect to login ---
      // setSuccess(response.data.message || 'Account created successfully! Redirecting to login page...');
      // setTimeout(() => navigate('/login'), 2000);

    } catch (error) {
      // Use showAlert for API errors
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Signup failed. Please try again.';
      showAlert("error", errorMessage);
      window.grecaptcha?.reset(); // Also reset reCAPTCHA on error so user can retry

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        //background: 'linear-gradient(to right, #0A4B3E, #000000)',
        //minHeight: '100vh',
        minHeight: 'calc(100vh - 64px - 56px)', // Adjust based on Header/Footer height if needed
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
      }}
    >
      <Box
        sx={{
          // ... card styles remain the same ...
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

        {/* Removed local Alert components - relying on Snackbar from AlertProvider */}
        {/* {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} */}
        {/* {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>} */}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={isLoading} // Disable fields when loading
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={isLoading} // Disable fields when loading
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={isLoading} // Disable fields when loading
          />

          {/* Added some margin for spacing */}
          <Box id="recaptcha-container" sx={{ my: 2, display: 'flex', justifyContent: 'center' }}></Box>

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mt: 1 }} // Adjusted margin slightly
            disabled={isLoading || !recaptchaRendered} // Also disable if recaptcha hasn't rendered
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