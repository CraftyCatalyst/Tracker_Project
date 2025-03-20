import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Warning } from '@mui/icons-material';

const StatusCard = ({ title, value, percentage }) => {
    const theme = useTheme();
    let bgColor = "success.main"; // Default Green
    let textColor = "white";

    if (title.includes("CPU")) {
        if (percentage >= 80) bgColor = "error.main"; // 🔴 Critical
        else if (percentage >= 50) bgColor = "warning.main"; // 🟡 Warning
    } 
    else if (title.includes("Memory")) {
        if (percentage >= 90) bgColor = "error.main"; 
        else if (percentage >= 70) bgColor = "warning.main"; 
    } 
    else if (title.includes("Disk")) {
        if (percentage >= 90) bgColor = "error.main"; 
        else if (percentage >= 75) bgColor = "warning.main"; 
    }

     
    return (
        <Card
            sx={{
                backgroundColor: bgColor,
                color: theme.palette.secondary.contrastText,
                borderRadius: theme.spacing(1),
                boxShadow: 3,
                padding: theme.spacing(1),
                minWidth: 300,
                textAlign: 'center',
                verticalAlign: 'center'
            }}
        >
            <CardContent>
                <Typography variant="h4_underline" gutterBottom sx={{ fontWeight: 'bold', color: "black" }}>
                    {title}
                </Typography>
                <br />
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: "white" }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default StatusCard;
