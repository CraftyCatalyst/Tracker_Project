import React, { useEffect, useState, useContext } from 'react';
import { TextField, Button, Box, Typography, Alert, Link as MuiLink } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";
import { UserContext } from '../context/UserContext'; // Import the UserContext
import { useTheme } from '@mui/material/styles';
import centralLogging from '../services/logService';
import { useAlert } from "../context/AlertContext";
import { useLocation } from 'react-router-dom'; // Import useLocation for tracking activity
import { use } from 'react';

axios.defaults.withCredentials = true;

const LoginPage = () => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [loginRequiresVerification, setLoginRequiresVerification] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(UserContext); // Access the login function from the context
  const [isRegistrationOpen, setRegistrationOpen] = useState(false);
  const location = useLocation();
  const [isReverifying, setIsReverifying] = useState(false); // State to track if re-verification is needed
  const [recaptchaRendered, setRecaptchaRendered] = useState(false);
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

  const loginMode = {
    "/login/reverify": "Reverify",
  };


  useEffect(() => {
    const fetchAdminSettings = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.get_admin_setting("site_settings", "registration_button"));
        const isOpen = String(response.data.value).trim().toLowerCase() === "on";

        console.log("Registration open:", isOpen);
        setRegistrationOpen(isOpen);

      } catch (error) {
        console.error("Error fetching registration status:", error);
        setRegistrationOpen(false);
      }
    };
    fetchAdminSettings();
  }, []);

  useEffect(() => {
    console.log("LoginPage: Current path is", location.pathname);
    if (loginMode[location.pathname] === "Reverify") {
      console.log("LoginPage: Reverify mode detected.");
      setIsReverifying(true);
    };
  }, []);

  useEffect(() => {
    console.log("isReverifying:", isReverifying);
  }, [isReverifying]);

  const handleResendVerification = async () => {
    if (!email) {
      showAlert('warning', 'Please enter your email address first.');
      return;
    }
    setIsResending(true);
    try {
      const response = await axios.post(API_ENDPOINTS.resend_verification_email, { email });
      // Display the generic success message from the backend
      showAlert('success', response.data.message || 'Verification email request sent.');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to request verification email.';
      showAlert('error', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginRequiresVerification(false);
    // setError('');
    centralLogging(`Attempting login for ${email}`, "INFO")
    try {
      const response = await axios.post(API_ENDPOINTS.login, { email, password });
      console.log("Login response:", response.data);
      // Extract user information from the response
      // --- Success Case ---
      const userInfo = response.data.user;
      const authToken = response.data.token;
      centralLogging(`Login successful for user: ${userInfo.username}`, "INFO");
      login(userInfo, authToken); // Update context
      navigate('/'); // Navigate to home

    } catch (error) {
      console.error('Login failed:', error);
      if (error.response) {
        centralLogging(`Login API error - Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`, "ERROR");
      } else {
        centralLogging(`Login network error: ${error.message}`, "ERROR");
      }

      // --- Handle must change password ---
      if (error.response?.status === 403 && error.response?.data?.must_change_password) {
        navigate(`/change-password?user_id=${error.response.data.user_id}`);
        return;
      }
      // --- Handle email not verified ---
      else if (error.response?.status === 403 && error.response?.data?.is_email_verified === false) {
        console.log("is_email_verified:", error.response.data.is_email_verified);
        centralLogging(`Email not verified for user: ${email}`, "INFO");
        setLoginRequiresVerification(true); // Set flag to show resend button
        showAlert('error', error.response.data.message || 'Login failed: Please verify your email.'); // Use showAlert
      }
      // --- Handle other errors ---
      else {
        const errorMessage = error.response?.data?.message || 'Login failed. Please check email/password or try again later.';
        showAlert('error', errorMessage); // Use showAlert for generic errors
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        //background: theme.palette.background, //'linear-gradient(to right, #0A4B3E, #000000)',
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
        {isReverifying ? (
          <Typography variant="h3" color="primary" align="center" gutterBottom>
            Resend Verification Email
          </Typography>
        ) : (
          <Typography variant="h1" color="primary" align="center" gutterBottom>
            Login
          </Typography>
        )}

        {/* {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} */}
        
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loginRequiresVerification) { setLoginRequiresVerification(false); }
                }}
                fullWidth
                required
                margin="normal"
                disabled={isLoading}
              />
              {(!isReverifying) && (
              <>
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                margin="normal"
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              </>
              )}
            </form>
          
       

        {/* Conditionally render Resend Verification Button */}
        {(loginRequiresVerification || isReverifying) && (
          <Button
            onClick={handleResendVerification}
            variant="contained"
            color="warning"
            fullWidth
            sx={{ mt: 1, mb: 1 }}
            disabled={isResending || isLoading || !email}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        )}

        {/* Combined "Forgot Password" and "Signup" links */}
        {!isReverifying && (
          <>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2">
            {/* Use MuiLink styled as RouterLink */}
            <MuiLink component={RouterLink} to="/forgot-password" underline="hover" color="secondary">
              Forgot password?
            </MuiLink>
          </Typography>

          {isRegistrationOpen ? (
            <Typography variant="body2">
              Don’t have an account?{' '}
              {/* Use Button for visual style, Link for navigation */}
              <Button component={RouterLink} to="/signup" color="secondary">
                Sign up
              </Button>
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sign-ups are disabled.
            </Typography>
          )}
        </Box>
        {/* Extra info if registration closed */}
        {!isRegistrationOpen && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Want to become a tester? Use the{' '}
            <strong>'Request Tester Access'</strong> button on the home page.
          </Typography>
        )}
        </>
        )}        
      </Box>
    </Box>
  );
}

export default LoginPage;
