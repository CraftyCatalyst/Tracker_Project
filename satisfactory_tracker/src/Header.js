import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from './apiConfig';
import LogoutIcon from '@mui/icons-material/Logout';

const Header = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
         // Check localStorage first
         const savedUserInfo = localStorage.getItem('user_info');
         if (savedUserInfo) {
             setUser(JSON.parse(savedUserInfo));
             console.log("User info fetched from localStorage:", JSON.parse(savedUserInfo));
        //  } else {
        //      // Fallback: Fetch from API if not in localStorage
        //      const fetchUserInfo = async () => {
        //          try {
        //              const response = await axios.get(API_ENDPOINTS.userinfo, { withCredentials: true });
        //              setUser(response.data);
 
        //              // Save fetched user info to localStorage
        //              localStorage.setItem('user_info', JSON.stringify(response.data));
        //          } catch (error) {
        //              console.error("Error fetching user info:", error);
        //          }
        //      };
        //      fetchUserInfo();
         }
     }, []);

     const handleLogout = async () => {
        try {
            // Optionally, make a logout request to the server
            //await axios.get(API_ENDPOINTS.logout, { withCredentials: true });

            // Clear user info from localStorage
            localStorage.removeItem('user_info');
            console.log("User info removed from localStorage");

            // Redirect to login page
            //navigate('/');
        } catch (error) {
            console.error("Error during logout:", error);
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h2">
                        Welcome, {user.username}!
                    </Typography>
                    <Button
                        variant="outlined"
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
                <Typography variant="h2">Not Logged In</Typography>
            )}
        </Box>
    );
};

export default Header;