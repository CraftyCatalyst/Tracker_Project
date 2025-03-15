import React from "react";
import { Box, Typography, Link } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import ForumIcon from "@mui/icons-material/Forum";
import PolicyIcon from "@mui/icons-material/Policy";
import { useTheme } from '@mui/material/styles';

const Footer = () => {
    const theme = useTheme();

    return (
        // position: "sticky",
        // zIndex: 1100,
        <Box
            component="footer"
            sx={{
                width: "100%",
                padding: "16px",
                backgroundColor: theme.palette.primary.secondary,
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                color: "primary.contrastText",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginTop: "auto",
            }}
        >
            {/* Attribution */}
            <Typography variant="body4" sx={{ marginBottom: 1 }}>
                The assets come from Satisfactory or from websites created and owned by Coffee Stain Studios, who hold the copyright of Satisfactory.
                All trademarks and registered trademarks present in the images are proprietary to Coffee Stain Studios. <br />
                Logo by Discord:{" "}
                <Link href="https://cdn.brandfetch.io/idM8Hlme1a/theme/light/symbol.svg?c=1bx1741179184944id64Mup7aclPAE1lkv&t=1668075053047"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover">
                    View Discord Logo
                </Link>
                <br />
                GitHub logo:{" "}
                <Link href="https://github.com/logos"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover">
                    View GitHub Logos
                </Link>
                <br />
                {/* <Link href="https://www.flaticon.com/free-icons/question-mark" title="question-mark icons"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover">
                    Question-mark icons created by Fathema Khanom - Flaticon
                </Link> */}
            </Typography>
            {/* Quick Links */}
            {/* <Box sx={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 1 }}>
                <Link href="https://github.com/your-repo" target="_blank" color="inherit" underline="none">
                    <GitHubIcon sx={{ fontSize: 24 }} /> GitHub
                </Link>
                <Link href="https://your-discord-link.com" target="_blank" color="inherit" underline="none">
                    <ForumIcon sx={{ fontSize: 24 }} /> Discord
                </Link>
                <Link href="/privacy-policy" color="inherit" underline="none">
                    <PolicyIcon sx={{ fontSize: 24 }} /> Privacy Policy
                </Link>

            </Box> */}

            {/* Copyright Notice */}
            <Typography variant="caption">
                © {new Date().getFullYear()} Satisfactory Tracker. All Rights Reserved.
            </Typography>
        </Box>
    );
};

export default Footer;
