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
                <Typography variant="body4" sx={{ marginBottom: 1 }}>
                    Success Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6185">freesound_community</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6185">Pixabay</a>
                    <br />
                    Failure Sound Effect by Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=144746">Universfield</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=144746">Pixabay</a>
                </Typography>
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
