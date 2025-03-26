import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Box, Typography } from "@mui/material";
import logToBackend from "../../services/logService";

const barSize = 18; // Adjust bar height here

const MachineChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return <Typography>No machine data available.</Typography>;
  }

  const chartData = Object.keys(data).map((key) => ({
    name: key,
    Actual: Number(data[key].actual) || 0,  // Ensure it's a number
    Target: Number(data[key].target) || 0,  // Ensure it's a number
  }));
// logToBackend(`*****************Machine Chart********************
  
//   chartData: ${JSON.stringify(chartData, null, 2)}`, "INFO");

// logToBackend(`*****************Machine Chart********************
//   Nomalizing chart data`, "INFO");
  
// Normalize the data for the chart
  const normalizedChartData = chartData
  .map(machine => {
    const realActualMachines = machine.Actual;
    const realTargetMachines = machine.Target;
    // logToBackend(`************************Real Actual Machines: ${realActualMachines}, Real Target Machines: ${realTargetMachines}`, "INFO");
    
    const actualPercent = realTargetMachines === 0 ? 0 : (realActualMachines / realTargetMachines) * 100;
    // logToBackend(`************************Actual Percent: ${actualPercent}`, "INFO");
    
    const displayActual = Math.min(actualPercent, 100); // Cap at 100%
    const displayTarget = actualPercent > 100 ? 0 : 100 - displayActual; // Remaining portion
    const actualColor = actualPercent > 100 ? "#084B3B" : "#0bc260"; // Darker green if exceeded
    // capitalize the name of the machine
    const machineName = machine.name.toUpperCase()

    // logToBackend(`************************Display Actual: ${displayActual}, Display Target: ${displayTarget}, Actual Color: ${actualColor}`, "INFO");
    return {
      name: machineName,
      Target: displayTarget, // Display value (0-100%)
      Actual: displayActual, // Display value (0-100%)
      RealActualMachines: realActualMachines, // True value for tooltip
      RealTargetMachines: realTargetMachines, // True value for tooltip
      actualColor, // Store color
    };
  });

  // logToBackend(`*****************Machine Chart********************
  // Normalized chart data: ${JSON.stringify(normalizedChartData, null, 2)}`, "INFO");

  return (
    <Box sx={{ border: "2px solid #ddd", borderRadius: "8px", padding: "8px", backgroundColor: "#1E1E1E", width: "100%" }}>
      <Typography variant="h3" sx={{ textAlign: "center", width: "100%" }}>
        Actual vs. Target Machines <br /> (Count)
      </Typography>
      <ResponsiveContainer width="100%" height={barSize * (normalizedChartData.length) * 2}>
        <BarChart 
          layout="vertical"
          barGap={0}
          data={normalizedChartData} 
          margin={{ top: 10, right: 30, left: -8, bottom: 5 }}
          padding={{ top: 10, right: 5, bottom: 5, left: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(value) => `${value}%`} />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={200} 
            height={barSize * normalizedChartData.length}
            tick={{ fontSize: barSize - 2, fill: "#FFFFFF" }}
            interval={0}
          />
          <Tooltip content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const rowData = payload[0].payload;
              return (
                <div style={{ backgroundColor: "#FFFFFF", padding: "10px", border: "1px solid #ccc" }}>
                  <strong style={{ color: "#000000" }}>Machine: {label}</strong>
                  <p style={{ color: rowData.RealActualMachines > rowData.RealTargetMachines ? "#084B3B" : "#0bc260" }}>
                    Actual: {rowData.RealActualMachines.toFixed(1)}
                  </p>
                  <p style={{ color: "#555555" }}>
                    Target: {rowData.RealTargetMachines.toFixed(1)}
                  </p>
                </div>
              );
            }
            return null;
          }} />

          {/* Bars */}
          <Bar dataKey="Actual" barSize={barSize} stackId="machines" animationDuration={1200} animationEasing="ease-out">
            {normalizedChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.actualColor} />
            ))}
          </Bar>
          <Bar dataKey="Target" fill="#ddd" barSize={barSize} stackId="machines" animationDuration={1200} animationEasing="ease-out" />
          {/* Legend */}
          <Legend 
            verticalAlign="bottom" 
            align="center" 
            wrapperStyle={{ display: "flex", justifyContent: "center", width: "90%" }} 
            payload={[
              { value: "Actual", type: "rect", color: "#0bc260" },
              { value: "Target", type: "rect", color: "#ddd" },
              { value: "Met / Exceeded Target", type: "rect", color: "#084B3B" }
            ]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default MachineChart;
