import React, { useState, useEffect, useCallback, useContext } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Typography, CircularProgress, Tab, Button, Modal, Box as MuiBox, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { CheckCircle, ErrorOutline } from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import TrackerTables from "../components/Tracker/TrackerTables";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { UserContext, useUserContext } from "../context/UserContext";
import centralLogging from "../services/logService";
import ProductionChart from "../components/Tracker/ProductionChart";
import MachineChart from "../components/Tracker/MachineChart";
import ConnectionData from "../components/Tracker/ConnectionData";
import PipeData from "../components/Tracker/PipeData";
import BubblePopGame from "../components/BubblePopGame";
import { useTheme } from "@mui/material/styles";
import { useAlert } from "../context/AlertContext";
import { motion } from "framer-motion";
import Tooltip from "@mui/material/Tooltip";
import AddToTrackerModal from "./AddToTrackerModal";
import AlternateRecipesModal from "./AlternateRecipesModal";
import CloseIcon from '@mui/icons-material/Close';


const TrackerPage = () => {
  const theme = useTheme();
  const { user } = useContext(UserContext);
  const { showAlert } = useAlert();
  const [trackerData, setTrackerData] = useState([]);
  const [trackerTreeData, setTrackerTreeData] = useState([]);
  const [trackerReports, setTrackerReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState({ partProduction: {}, machineUsage: {} });
  const [flattenedTreeData, setFlattenedTreeData] = useState([]);
  const [userSaveData, setUserSaveData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [machineUsageReports, setMachineUsageReports] = useState([]);
  const hasUploadedSaveFile = userSaveData.length > 0;
  const isDataReady = userSaveData.length > 0 &&
    Object.keys(reports.partProduction).length > 0 &&
    Object.keys(reports.machineUsage).length > 0;
  const [activeTab, setActiveTab] = useState("1");
  const uploadedFileName = hasUploadedSaveFile ? userSaveData[0]?.sav_file_name : "";
  const { resetGraphData } = useUserContext();
  const [trackerModalOpen, setTrackerModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [hasTrackerData, setHasTrackerData] = useState(false);
  const [showSaveFile, setShowSaveFile] = useState(false);
  const [gameModalOpen, setGameModalOpen] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (uploading) {
      setGameModalOpen(true);
    } else {
      setGameModalOpen(false);
    }
  }, [uploading]);

  // useEffect(() => {
  //   console.log("uploadSuccess changed:", uploadSuccess);
  //   let timer;

  //   // Only start timer when uploadSuccess becomes true
  //   if (uploadSuccess) {
  //     timer = setTimeout(() => {
  //       setShowSaveFile(true);
  //     }, 10000); // 10 seconds
  //   }

  // Clean up the timer if component unmounts or uploadSuccess changes
  //   return () => clearTimeout(timer);
  // }, [uploadSuccess]);

  const handleTestGame = () => {
    setGameModalOpen(true);
  };

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const fetchTrackerReports = async () => {
    // console.log("Fetching tracker reports...");
    try {
      const response = await axios.get(API_ENDPOINTS.tracker_reports);
      setTrackerReports(response.data);
      // console.log("Tracker reports:", response.data);

      setFlattenedTreeData(flattenDependencyTrees(response.data));
      // console.log("Flattened tree data:", flattenedTreeData);

      return response.data;

    } catch (error) {
      console.error("Error fetching tracker reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const flattenDependencyTrees = (reports) => {
    let flattened = [];
    reports.forEach((report, reportIndex) => {
      if (!report.tree) return;

      const traverseTree = (node, parent = "Root", level = 0) => {
        Object.keys(node).forEach((key, index) => {
          const item = node[key];
          const rowId = `${report.part_id}-${report.recipe_name}-${level}-${index}-${Math.random().toString(36).slice(2, 7)
            }`;

          const requiredQuantity = item["Required Quantity"] || 0;
          const requiredPartsPm = item["Required Parts PM"] || 0;
          const timeInMinutes = item["Timeframe"] || 0; //requiredPartsPm > 0 ? requiredQuantity / requiredPartsPm : 0;

          // Format to hh:mm:ss
          const hours = Math.floor(timeInMinutes / 60);
          const minutes = Math.round(timeInMinutes % 60);
          const formattedTime = `${hours}h ${minutes}m ${Math.round(timeInMinutes % 1 * 60)}s`;

          flattened.push({
            id: rowId,
            parent,
            node: key,
            level,
            requiredQuantity,
            requiredPartsPm,
            timeFrame: formattedTime,  // ✅ NEW FIELD
            producedIn: item["Produced In"] || "N/A",
            machines: item["No. of Machines"] || 0,
            recipe: item["Recipe"] || "N/A",
            partSupplyPM: item["Part Supply PM"] || null,
            partSupplyQty: item["Part Supply Quantity"] || null,
            ingredientDemandPM: item["Ingredient Demand PM"] || null,
            ingredientDemandQty: item["Ingredient Demand Quantity"] || null,
            ingredientSupplyPM: item["Ingredient Supply PM"] || null,
            ingredientSupplyQty: item["Ingredient Supply Quantity"] || null,
          });

          if (item.Subtree) {
            traverseTree(item.Subtree, key, level + 1);
          }
        });
      };
      traverseTree(report.tree);
    });

    return flattened;
  };

  const columns = [
    { field: "parent", headerName: "Parent Part", flex: 1 },
    { field: "node", headerName: "Ingredient", flex: 1 },
    { field: "level", headerName: "Level", flex: 0.5, type: "number" },
    { field: "requiredQuantity", headerName: "Required Quantity", flex: 1, type: "number" },
    { field: "requiredPartsPm", headerName: "Parts / Min", flex: 1, type: "number" },
    { field: "timeFrame", headerName: "Time to Complete", flex: 1 },
    { field: "producedIn", headerName: "Produced In", flex: 1 },
    { field: "machines", headerName: "No. of Machines", flex: 1, type: "number" },
    { field: "recipe", headerName: "Recipe Name", flex: 1 },
    { field: "partSupplyPM", headerName: "Part Supply PM", flex: 1, type: "number" },
    { field: "partSupplyQty", headerName: "Part Supply Qty", flex: 1, type: "number" },
    { field: "ingredientDemandPM", headerName: "Ingredient Demand PM", flex: 1, type: "number" },
    { field: "ingredientDemandQty", headerName: "Ingredient Demand Qty", flex: 1, type: "number" },
    { field: "ingredientSupplyPM", headerName: "Ingredient Supply PM", flex: 1, type: "number" },
    { field: "ingredientSupplyQty", headerName: "Ingredient Supply Qty", flex: 1, type: "number" },
  ];



  const fetchData = async () => {
    try {
      setLoading(true);
      const [trackerRes, saveRes] = await Promise.all([
        fetchTrackerReports(),
        fetchUserSaveData()
      ]);

      //Ensure both reports update state correctly without overwriting each other
      const productionData = await fetchProductionReport(trackerRes, saveRes);
      const machineData = await fetchMachineUsageReport(trackerRes, saveRes);

      setReports(prevReports => ({
        ...prevReports,
        partProduction: productionData,
        machineUsage: machineData
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionReport = async (trackerData, saveData) => {
    try {
      setLoading(true);
      const response = await axios.post(API_ENDPOINTS.production_report, {
        trackerData,
        saveData
      });
      setHasTrackerData(true);
      return response.data;
    } catch (error) {
      console.error("Error fetching production report:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchMachineUsageReport = async (trackerData, saveData) => {
    try {
      setLoading(true);
      const response = await axios.post(API_ENDPOINTS.machine_report, {
        trackerData,
        saveData
      });

      setMachineUsageReports(response.data);

      return response.data;

    } catch (error) {
      console.error("Error fetching machine usage report:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.tracker_data);
      setTrackerData(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching tracker data:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSaveData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.user_save);
      setUserSaveData(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching user_save data:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };


  const recalculateTotals = (modifiers) => {
    const updatedTotals = {}; // Perform calculations here
    setTotals(updatedTotals);
  };


  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles) => {
    // centralLogging("TrackerPage: File dropped" + { acceptedFiles }, "INFO");
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    // console.log("Uploading file:", file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadStatus(null);
      setUploadSuccess(null);
      setProgress(0);
      resetGraphData();

      // Send file to backend
      const logOnDropMessage = "TrackerPage: Uploading save file" + file + formData;
      // centralLogging(logOnDropMessage, "INFO");
      const response = await axios.post(API_ENDPOINTS.upload_sav, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      setUploadStatus(response.data.message || "Upload successful!");
      setUploadSuccess(true);
      setUploading(false);

      showAlert("success", "File uploaded successfully!");
      fetchData();

    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("Upload failed. Please try again.");
      setUploadSuccess(false);
      setUploading(false);
      const logerrorMessage = "❌ TrackerPage: File upload failed" + error;
      // centralLogging(logerrorMessage, "ERROR");
      console.error(logerrorMessage);
      showAlert("error", "File upload failed. Please try again.");
    }
  }, []);

  const pollProcessingStatus = async (processingId) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.processing_status}/${processingId}`);
      if (response.data.status === "completed") {
        setProcessing(false);
      } else {
        setTimeout(() => pollProcessingStatus(processingId), 2000); // Poll every 2 seconds
      }
    } catch (error) {
      console.error("Error fetching processing status:", error);
      setProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ".sav",
    multiple: false,
  });

  //  Define columns for DataGrid
  const userColumns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "part_name", headerName: "Part Name", width: 180 },
    { field: "recipe_name", headerName: "Recipe", width: 200 },
    { field: "machine_name", headerName: "Machine", width: 200 },
    { field: "machine_level", headerName: "Machine Level", width: 200 },
    { field: "resource_node_purity", headerName: "Node Purity", width: 200 },
    { field: "machine_power_modifier", headerName: "Power Modifier", width: 150 },
    { field: "part_supply_pm", headerName: "Part Supply PM", width: 200 },
    { field: "actual_ppm", headerName: "Actual PPM", width: 200 },
    { field: "created_at", headerName: "Created", width: 180 },
    { field: "sav_file_name", headerName: "Save File", width: 180 },
  ];

  return (
    <Box sx={{
      borderBottom: 2,
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      width: "100%",
      padding: 4,
      background: theme.palette.background,
    }}
    >

      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "left", mb: 2, width: "100%", gap: 2 }}>

        {/* Drag and Drop Zone */}
        <Tooltip
          title={
            <Typography variant="body4" sx={{ color: "#FFFFFF" }}>
              Drag & drop your Satisfactory save file here, or click to browse.
              <br />
              {hasUploadedSaveFile ? (
                <span style={{ color: "#FFA500", fontSize: "14px", fontWeight: "bold" }}>This will overwrite your current save file.</span>
              ) : null}
            </Typography>
          }
          arrow
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: "preventOverflow",
                  options: {
                    boundary: "window",
                  },
                },
              ],
            },
            tooltip: {
              sx: {
                backgroundColor: "#222831", // Dark grey background for contrast
                color: "#EEEEEE", // Light grey text for readability
                padding: "10px",
                fontSize: "14px",
                borderRadius: "8px",
                border: "1px solid #444", // Optional subtle border
              },
            },
            arrow: {
              sx: {
                color: "#222831", // Match arrow color with tooltip background
              },
            },
          }}
        >
          <Box
            {...getRootProps()}
            sx={{
              ...theme.components.Dropzone.styleOverrides.root,
              ...(isDragActive && theme.components.Dropzone.styleOverrides.active),
            }}
          >
            <input {...getInputProps()} />

            {/* Animated Upload State */}
            {uploading ? (
              <>
                <Typography variant="body3">Extracting save file data...This may take some time</Typography>
                <Typography variant="body4_underline_bold" sx={{ color: "orange" }}>DO NOT REFRESH YOUR BROWSER</Typography>
                <CircularProgress color="progressIndicator.main" size={20} />

                {/* {showSaveFile ? (
                  <Typography variant="body4" sx={{ fontWeight: "bold", color: "success.main" }}>
                    Current save file <br />
                    {uploadedFileName}
                  </Typography>
                ) : (
                  <CircularProgress color="progressIndicator.main" size={20} />
                )} */}
              </>
            ) : uploadSuccess === true ? (
              <CheckCircle sx={{ fontSize: 30, color: "success.main" }} />
            ) : uploadSuccess === false ? (
              <ErrorOutline sx={{ fontSize: 30, color: "red" }} />
            ) : hasUploadedSaveFile ? (
              <Typography variant="body4" sx={{ fontWeight: "bold", color: "success.main" }}>
                Current save file <br />
                {uploadedFileName}
              </Typography>
            ) : (
              <Typography variant="body3">
                Drop your Satisfactory save file here...
              </Typography>
            )}
          </Box>
        </Tooltip>
        <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
          <Button variant="contained" onClick={() => setRecipeModalOpen(true)}>
            Choose Alternate Recipes
          </Button>
          {recipeModalOpen && (  // ✅ Only render when open
            <AlternateRecipesModal open={recipeModalOpen} onClose={() => setRecipeModalOpen(false)} />
          )}
          <Button variant="contained" onClick={() => setTrackerModalOpen(true)}>
            Add Parts To Track
          </Button>
          <Button variant="contained" onClick={() => handleTestGame()}>
            Test Game
          </Button>
        </Box>
        {trackerModalOpen && (  // ✅ Only render when open
          // <AddToTrackerModal open={trackerModalOpen} onClose={() => setTrackerModalOpen(false)} />
          <AddToTrackerModal
            open={trackerModalOpen}
            onClose={() => {
              setTrackerModalOpen(false);
              fetchTrackerReports();
            }}
          />
        )}
      </Box>
      {/* Tabs Container */}
      <TabContext value={activeTab}>
        <Box sx={theme.trackerPageStyles.tabsContainer}>
          <TabList onChange={handleChange} aria-label="Tracker Sections" sx={theme.trackerPageStyles.tabList}>
            <Tab label="Save File Data" value="1" />
            <Tab label="Conveyor Network" value="2" />
            <Tab label="Pipe Network" value="3" />
            <Tab label="Dependency Data" value="4" />
            <Tab label="Charts" value="5" />
            <Tab label="Main Tables" value="6" />
          </TabList>
        </Box>



        {/* User Save Data Panel */}
        <TabPanel value="1">
          <Box sx={theme.trackerPageStyles.tabPanelBox}>
            {loading ? (
              <CircularProgress />
            ) : (
              <>

                <Box sx={theme.trackerPageStyles.reportBox}>
                  <div style={{ flexGrow: 1, overflow: "auto", height: "80vh", width: "100%" }}>
                    <DataGrid density="compact" rows={userSaveData} columns={userColumns} />
                  </div>
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        {/* Conveyor Network */}
        <TabPanel value="2">
          <Box sx={theme.trackerPageStyles.tabPanelBox}>
            {loading ? (
              <CircularProgress />
            ) : (
              <>

                <Box sx={theme.trackerPageStyles.reportBox}>
                  <ConnectionData />
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        {/* Pipe Network */}
        <TabPanel value="3">
          <Box sx={theme.trackerPageStyles.tabPanelBox}>
            {loading ? (
              <CircularProgress />
            ) : (
              <>

                <Box sx={theme.trackerPageStyles.reportBox}>
                  <PipeData />
                </Box>
              </>
            )}
          </Box>
        </TabPanel>
        {/* Dependency Data Panel */}
        <TabPanel value="4">
          <Box sx={theme.trackerPageStyles.tabPanelBox}>
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <Box sx={theme.trackerPageStyles.reportBox}>
                  <DataGrid density="compact" rows={flattenedTreeData} columns={columns} />
                </Box>

              </>
            )}
          </Box>
        </TabPanel>
        {/* Charts Panel */}
        <TabPanel value="5">
          {hasUploadedSaveFile && hasTrackerData ? (
            !isDataReady ? (
              // ✅ Show spinner while waiting for reports
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
                <CircularProgress size={60} color="primary" />
              </Box>
            ) : (
              // ✅ Show charts once data is ready
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <Box sx={theme.trackerPageStyles.tabPanelBox}>
                  <Box sx={theme.trackerPageStyles.chartBox}>
                    <ProductionChart data={reports.partProduction} />
                  </Box>
                  <Box sx={theme.trackerPageStyles.chartBox}>
                    <MachineChart data={reports.machineUsage} />
                  </Box>
                </Box>
              </motion.div>
            )
          ) : (
            <Typography variant="h6" sx={{ textAlign: "center", mt: 4, color: "gray" }}>
              Upload a save file & add parts to track to view target v actual charts
            </Typography>
          )}
        </TabPanel>

        {/* Main Tables Section */}
        <TabPanel value="6">
          <Box sx={theme.trackerPageStyles.tabPanelBox}>
            <Typography variant="h2">More reports coming soon!</Typography>
          </Box>
          {/* <Box sx={theme.trackerPageStyles.tabPanelBox}>
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <Box sx={theme.trackerPageStyles.reportBox}>
                  <TrackerTables
                    trackerData={trackerData}
                    totals={totals}
                    isLoading={isLoading} />
                </Box>

              </>
            )}
          </Box> */}
        </TabPanel>
      </TabContext>
      <Modal
        open={gameModalOpen}
        onClose={() => setGameModalOpen(false)}
        // disableEscapeKeyDown
        sx={{ "& .MuiBackdrop-root": { pointerEvents: "none" } }}>
        <MuiBox
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min-content + 20%',
            bgcolor: 'background.paper',
            backgroundColor: theme.palette.background.default,
            borderRadius: 2,
            boxShadow: 24,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Tooltip title="Close game">
          <IconButton
            onClick={() => setGameModalOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              zIndex: 10,
            }}
          >
            <CloseIcon />
          </IconButton>
          </Tooltip>
          <br />
          <Typography variant="h4" sx={{ mb: 1 }}>Processing your save file...</Typography>
          <Typography variant="h4" sx={{ mb: 1 }}>Pop some bubbles while you wait</Typography>
          <BubblePopGame />
          <Typography variant="caption" sx={{ mt: 2, color: 'gray' }}>
            This will close automatically when your save is fully processed.
          </Typography>
        </MuiBox>
      </Modal>


    </Box >
  );
};

export default TrackerPage;

