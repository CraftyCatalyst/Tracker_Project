import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Warning } from '@mui/icons-material';

const StatusCard = ({ title, value }) => {
    const theme = useTheme();

    return (
        <Card
            sx={{
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.secondary.contrastText,
                borderRadius: theme.spacing(1),
                boxShadow: 3,
                padding: theme.spacing(1),
                minWidth: 300,
                textAlign: 'center'
            }}
        >
            <CardContent>
                <Typography variant="h4_underline" gutterBottom>
                    {title}
                </Typography>
                <br />
                <br />
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: "orange" }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default StatusCard;
