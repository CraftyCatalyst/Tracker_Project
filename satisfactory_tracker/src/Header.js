import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from './apiConfig';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import { useUser } from './UserContext';

const Header = () => {
    const { user, logout } = useUser(); // Access user and logout function
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            logout();
            navigate('/login');
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    const handleLogin = () => {
        try {
            navigate('/login'); // Navigate to login page
        } catch (error) {
            console.error("Error during login:", error);
        }
    };

    return (
        <Box sx={{
            width: '100%',
            padding: '16px',
            backgroundColor: 'primary.main',
            color: 'secondary.main',
            textAlign: 'right',
        }}>
            {user ? (
                <Box 
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end', // Align items to the right
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Typography variant="h2">
                        Welcome, {user.username}!
                    </Typography>
                    <Button
                        variant="outlined"
                        fontSize="small"
                        startIcon={<LogoutIcon />}
                        backgroundColor="secondary.main"
                        color="secondary.contrastText"
                        onClick={handleLogout}
                        sx={{
                            color: 'primary.contrastText',
                            backgroundColor: "secondary.main",
                            borderColor: 'primary.contrastText',
                            '&:hover': {
                                borderColor: 'primary.contrastText',
                            },
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            ) : (
                // When the user is not logged in
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h2">Not Logged In</Typography>
                    <Button
                        variant="outlined"
                        startIcon={<LoginIcon />}
                        onClick={handleLogin}
                        sx={{
                            color: 'primary.contrastText',
                            backgroundColor: 'secondary.main',
                            borderColor: 'primary.contrastText',
                            '&:hover': {
                                borderColor: 'primary.contrastText',
                            },
                        }}
                    >
                        Login
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default Header;