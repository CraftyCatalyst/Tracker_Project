import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert
} from '@mui/material';
import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";
import { useTheme } from '@mui/material/styles';
import { useAlert } from "../context/AlertContext";
import { UserContext } from "../context/UserContext";

const ForgotPasswordPage = () => {
    const { user } = React.useContext(UserContext);
    const theme = useTheme();
    const { showAlert } = useAlert();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        try {
            await axios.post(API_ENDPOINTS.request_password_reset, { email });
            setSubmitted(true);
            setStatus({
                type: 'success',
                message:
                    'If your email exists in our system, you will receive a password reset link shortly.'
            });
        } catch (err) {
            const errorMsg = err?.response?.data?.error || 'Something went wrong.';
            setStatus({ type: 'error', message: errorMsg });
        }
    };

    return (
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Forgot Password?
            </Typography>

            {status.message && (
                <Alert severity={status.type} sx={{ mb: 2 }}>
                    {status.message}
                </Alert>
            )}

            {!submitted && (
                <>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Enter your email and we'll send you a link to reset your password.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!email}
                        sx={{ mt: 2 }}
                    >
                        Send Reset Link
                    </Button>
                </>
            )}
        </Box>
    );
};

export default ForgotPasswordPage;
