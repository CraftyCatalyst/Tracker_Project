import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'; // Import Link
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material'; // Import Button, Alert
import axios from 'axios';
import { API_ENDPOINTS } from '../apiConfig';
import { useAlert } from '../context/AlertContext'; // Assuming you might want Snackbar alerts too

// You might not need axios defaults here if set globally, but doesn't hurt
axios.defaults.withCredentials = true;

function EmailVerificationPage() {
  const { token } = useParams(); // Get the token from the URL
  const navigate = useNavigate();
  const { showAlert } = useAlert(); // Use the alert context

  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState(''); // Store success/error message for display

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token found in URL.');
        showAlert('error', 'No verification token found in URL.');
        return;
      }

      setStatus('verifying'); // Ensure status is verifying initially

      try {
        // Make POST request to the backend API
        const response = await axios.post(API_ENDPOINTS.verify_email, {
          raw_token: token, // Send the token in the request body
        });
        console.log("Response from verification:", response.data); // Log the response for debugging
        // Success case (usually 200 OK)
        setStatus('success');
        setMessage(response.data.message || 'Email successfully verified!'); // Use backend message
        showAlert('success', response.data.message || 'Email successfully verified!');

      } catch (error) {
        // Error case
        setStatus('error');
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Verification failed. Please try again.';
        setMessage(errorMessage); // Use backend error message
        showAlert('error', errorMessage);

      }
    };

    verifyToken(); // Call the function when the component mounts

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Re-run effect if token changes (though unlikely for this page)
  // Note: showAlert is not included in deps as it's usually stable from context

  // Render content based on the status
  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <Typography variant="h5" gutterBottom>Verifying Email...</Typography>
            <CircularProgress color="secondary" />
          </>
        );
      case 'success':
        return (
          <>
            <Typography variant="h5" color="success.main" gutterBottom>
              Success!
            </Typography>
            <Alert severity="success" sx={{ mb: 2, textAlign: 'left' }}>{message}</Alert>
            <Button
              variant="contained"
              component={RouterLink} // Use RouterLink for navigation
              to="/login"
            >
              Proceed to Login
            </Button>
          </>
        );
      case 'error':
        return (
          <>
            <Typography variant="h5" color="error.main" gutterBottom>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
               {/* Display specific message from backend */}
               {message}
               <br/><br/>
               {/* Removed guidance text as not needed anymore */}
               {/* To request a new verification link, 
               <br/> - Go to the login page 
               <br/> - Enter you email address and password then click "Login"
               <br/> - If your account is unverified the "Resend Verification Email" button will activate.
               <br/> - Click the "Resend Verification Email" button to receive a new verification link.
               <br/><br/> */}
            </Alert>
            {/*Removed Proceed to Login button. If verification fails user will be redirected to reverify path*/}
            <Button
              variant="contained"
              component={RouterLink}
              to="/login/reverify"
            >
              Resend Verification Email
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', p: 3 }}>
      <Box sx={{ textAlign: 'center', maxWidth: 500, width: '100%' }}>
        {renderContent()}
      </Box>
    </Box>
  );
}

export default EmailVerificationPage;