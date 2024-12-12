import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography, Box, Stack } from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";

const HomePage = () => {
    const navigate = useNavigate(); // Use navigate for routing

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
                Welcome to the Satisfactory Tracker
            </Typography>

            {/* Navigation Buttons */}
            <Stack spacing={2} direction="row">
                <Button
                    variant="contained"
                    startIcon={<LoginIcon />}
                    color="secondary"
                    onClick={() => navigate("/login")}
                >
                    Login - #TODO
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate("/data")}
                >
                    Manage Data
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate("/dependencies")}
                >
                    Dependencies
                </Button>
            </Stack>
        </Box>
    );
};

export default HomePage;
