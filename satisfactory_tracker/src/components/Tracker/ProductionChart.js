import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Box, Typography } from "@mui/material";
import logToBackend from "../../services/logService";

const barSize = 18; // Adjust bar height here

const ProductionChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return <Typography>No production data available.</Typography>;
  }

  const chartData = Object.keys(data).map((key) => ({
    name: key,
    Actual: Number(data[key].actual) || 0,  // Ensure it's a number
    Target: Number(data[key].target) || 0,  // Ensure it's a number
  }));


  // Normalize the data for the chart
  const normalizedChartData = chartData
    .map(d => {
      const realActualPPM = d.Actual;
      const realTargetPPM = d.Target;

      const realActualPercent = (realActualPPM / realTargetPPM) * 100; // Convert to % #0bc260 #084B3B #0F705C
      const displayActual = Math.min(realActualPercent, 100); // Cap at 100%
      const displayTarget = realActualPercent > 100 ? 0 : 100 - displayActual; // Remaining portion
      const actualColor = realActualPercent > 100 ? "#084B3B" : "#0bc260"; // Choose color

      return {
        name: d.name,
        Target: displayTarget, // Visual display (0-100%)
        Actual: displayActual, // Visual display (0-100%)
        RealActualPPM: realActualPPM, // Store real actual PPM for tooltip
        RealTargetPPM: realTargetPPM, // Store real target PPM for tooltip
        actualColor, // Store color
      };
    })
    .filter(d => d.RealTargetPPM > 0) // Ensure valid values

  return (
    <Box sx={{ border: "2px solid #ddd", borderRadius: "8px", padding: "8px", backgroundColor: "#1E1E1E", width: "100%" }}>
      <Typography variant="h3" sx={{ textAlign: "center", width: "100%" }}>
        Actual vs. Target Production <br /> (Parts Per Minute)
      </Typography>
      <ResponsiveContainer width="100%" height={barSize * (normalizedChartData.length) * 2}>
        <BarChart 
          layout="vertical" 
          data={normalizedChartData} 
          width={100} 
          margin={{ top: 10, right: 30, left: -8, bottom: 5 }}
          padding={{ top: 10, right: 5, bottom: 5, left: 5 }}        
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(tick) => `${tick}%`}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={250}
            orientation="left"
            height={barSize * normalizedChartData.length}
            tick={{ fontSize: barSize - 2, fill: "#FFFFFF" }}
            interval={0}
          />
          <Tooltip content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const rowData = payload[0].payload;
              const actualPPM = rowData.RealActualPPM || 0;
              const targetPPM = rowData.RealTargetPPM || 0;

              // console.log(`Tooltip Data -> Part: ${label}, Actual PPM: ${actualPPM}, Target PPM: ${targetPPM}`);

              return (
                <div style={{ backgroundColor: "#FFFFFF", padding: "10px", border: "1px solid #ccc" }}>
                  <strong style={{ color: "#000000" }}>Part: {label}</strong>
                  <p style={{ color: actualPPM > targetPPM ? "#084B3B" : "#0bc260" }}>
                    Actual: {actualPPM.toFixed(1)} PPM
                  </p>
                  <p style={{ color: "#555555" }}>
                    Target: {targetPPM.toFixed(1)} PPM
                  </p>
                </div>
              );
            }
            return null;
          }} />

          <Legend
            // verticalAlign="bottom"
            // align="center"
            iconSize={10}
            wrapperStyle={{ display: "flex", justifyContent: "center", width: "100%" }} // ✅ Forces centering
            payload={[
              { value: "Actual", type: "rect", color: "#0bc260" },
              { value: "Target", type: "rect", color: "#ddd" },
              { value: "Met/Exceeded Target", type: "rect", color: "#084B3B" }
            ]}
          />
          <Bar dataKey="Actual" barSize={barSize} stackId="production" animationDuration={1200} animationEasing="ease-out">
            {/* <LabelList
              dataKey="RealActualPPM"
              position="right" // ✅ Center inside the stack
              fill="#FFFFFF" // ✅ White text for readability
              fontSize={14}
              formatter={(value, entry) =>
                `${(value || 0).toFixed(1)} / ${(entry?.targetPPM || 0).toFixed(1)} PPM`} // ✅ Safe formatting
            /> */}
            {normalizedChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.actualColor} /> // ✅ Assign color dynamically
            ))}
          </Bar>

          <Bar
            dataKey="Target"
            fill="#ddd"
            barSize={barSize}
            stackId="production"
            animationDuration={1200} animationEasing="ease-out">
            {/* <LabelList
              dataKey="RealTargetPPM" // ✅ Show true Target PPM
              position="inside"
              fill="#000000" // ✅ Black text for contrast
              fontSize={14}
              formatter={(value) => `${value.toFixed(1)} PPM`} // ✅ Format as PPM
            /> */}
          </Bar>

          {/* Hidden Bars to Pass True PPM Values to Tooltip */}
          <Bar dataKey="RealActualPPM" fill="transparent" legendType="none" hide />
          <Bar dataKey="RealTargetPPM" fill="transparent" legendType="none" hide />

        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ProductionChart;
