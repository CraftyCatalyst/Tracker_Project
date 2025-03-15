import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, TextField, Button, Alert } from "@mui/material";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";

const TesterRequestModal = ({ open, onClose }) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [favThing, setFavThing] = useState("");
  const [reason, setReason] = useState("");
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaRendered, setRecaptchaRendered] = useState(false);
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const navigate = useNavigate();

  // 🔹 Ensure reCAPTCHA script is loaded
  useEffect(() => {
    if (!window.grecaptcha) {
      console.log("Loading reCAPTCHA script...");
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      window.onRecaptchaLoad = () => {
        console.log("reCAPTCHA script fully loaded.");
      };
    }
  }, []);

  // 🔹 Render reCAPTCHA when the modal is open
  useEffect(() => {
    if (open && window.grecaptcha && !recaptchaRendered) {
      console.log("Modal is open. Checking reCAPTCHA...");

      setTimeout(() => {
      const container = document.getElementById("recaptcha-container");

      if (!container) {
          console.error("reCAPTCHA container still not found!");
        return;
      }

      if (container.hasChildNodes()) {
        console.log("reCAPTCHA already rendered. Skipping...");
        return;
      }

        console.log("Rendering reCAPTCHA...");
      window.grecaptcha.render("recaptcha-container", {
        sitekey: RECAPTCHA_SITE_KEY,
      });

      setRecaptchaRendered(true);
      }, 500); // Small delay to ensure container is available
    }
  }, [open, recaptchaRendered, RECAPTCHA_SITE_KEY]);

  useEffect(() => {
    if (!window.grecaptcha) {
      console.log("Loading reCAPTCHA script...");
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
      script.async = true;
      script.defer = true;
      script.onload = () => console.log("reCAPTCHA script loaded.");
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      console.log("Modal closed. Resetting reCAPTCHA...");
      setRecaptchaRendered(false);
    }
  }, [open]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!window.grecaptcha) {
      setError("reCAPTCHA failed to load. Please try again.");
      setIsLoading(false);
      return;
    }

    const recaptchaToken = window.grecaptcha.getResponse();
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(API_ENDPOINTS.tester_registration, {
        email,
        username,
        fav_satisfactory_thing: favThing,
        reason,
        recaptcha_token: recaptchaToken,
      });
      setSuccess(response.data.message);
    } catch (error) {
      setError(error.response?.data?.error || "Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        bgcolor: "background.paper", padding: 4, borderRadius: 2, boxShadow: 24, width: "400px"
      }}
      >
        <Typography variant="h5" gutterBottom>Request Tester Access</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth required margin="normal" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField fullWidth required margin="normal" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField fullWidth required margin="normal" label="What is your favorite thing about Satisfactory?" multiline rows={3} value={favThing} onChange={(e) => setFavThing(e.target.value)} />
          <TextField fullWidth required margin="normal" label="Why do you want to be a tester?" multiline rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          
          {/* reCAPTCHA container */}
          <div id="recaptcha-container" style={{ marginTop: "10px" }}></div>
          
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting request...' : 'Submit Request'}
          </Button>
        </form>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Already have access? <Button variant="text" onClick={() => navigate('/login')} color="secondary">Log in</Button>
        </Typography>
      </Box>
    </Modal>
  );
};

export default TesterRequestModal;
