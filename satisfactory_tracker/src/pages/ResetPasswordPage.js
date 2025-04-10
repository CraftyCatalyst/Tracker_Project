import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";
import { useTheme } from '@mui/material/styles';
import { useAlert } from "../context/AlertContext";
import { UserContext } from "../context/UserContext";

const ResetPasswordPage = () => {
    const { user } = React.useContext(UserContext);
    const theme = useTheme();
    const { showAlert } = useAlert();
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleReset = async () => {
        try {
            console.log("Resetting password for token: ", token);
            console.log("Endpoint: ", API_ENDPOINTS.reset_password);
            
            const res = await axios.post(API_ENDPOINTS.reset_password, {
                token,
                new_password: password
            });

            setStatus({ type: 'success', message: res.data.message });

            // Optionally redirect after a delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            const errorMsg = err?.response?.data?.error || 'Reset failed. Please try again.';
            setStatus({ type: 'error', message: errorMsg });
        }
    };

    return (
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Reset Your Password
            </Typography>

            {status.message && (
                <Alert severity={status.type} sx={{ mb: 2 }}>
                    {status.message}
                </Alert>
            )}

            <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }
                }}
            />

            <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleReset}
                disabled={!password}
                sx={{ mt: 2 }}
            >
                Reset Password
            </Button>
        </Box>
    );
};

export default ResetPasswordPage;
