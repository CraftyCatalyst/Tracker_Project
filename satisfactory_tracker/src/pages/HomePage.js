import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography, Box, Stack } from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";

const HomePage = () => {
    const navigate = useNavigate(); // Use navigate for routing
    // Check if user is logged in
    const userInfo = JSON.parse(localStorage.getItem("user_info"));
    const isLoggedIn = Boolean(userInfo); // Check if user_info exists in localStorage

    return (
        <Box
            sx={{
                background: "linear-gradient(to right, #0A4B3E, #000000)",  
                //backgroundColor: "background.default",
                padding: 4,
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
            }}
        >
            {/* Welcome Message */}
            <Typography variant="h1" color="primary" gutterBottom>
                Satisfactory Tracker
            </Typography>

            {/* Navigation Buttons */}
            <Stack spacing={2} direction="row">
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate("/data")}
                    disabled={!isLoggedIn}
                    sx={{
                        opacity: isLoggedIn ? 1 : 0.5,
                        cursor: isLoggedIn ? "pointer" : "not-allowed",
                    }}
                >
                    Manage Data
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate("/dependencies")}
                    disabled={!isLoggedIn} // Disable if not logged in
                    sx={{
                        opacity: isLoggedIn ? 1 : 0.5,
                        cursor: isLoggedIn ? "pointer" : "not-allowed",
                    }}
                >
                    Dependencies
                </Button>
            </Stack>
        </Box>
    );
};

export default HomePage;
