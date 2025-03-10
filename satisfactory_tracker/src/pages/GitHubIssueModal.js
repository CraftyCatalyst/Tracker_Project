import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, TextField, Button, Alert, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { UserContext } from '../context/UserContext';
import logToBackend from "../services/logService";
import { useLocation } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

const GitHubIssueModal = ({ open, onClose }) => {
  const { user } = React.useContext(UserContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState(["bug"]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [browserInfo, setBrowserInfo] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const location = useLocation();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle file selection
  const handleFileUpload = (acceptedFiles) => {
    setUploadedFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  };

  // Remove file function
  const handleRemoveFile = (index) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    console.log("Files after removal:", uploadedFiles); // Debugging
  };

  useEffect(() => {
    console.log("Updated file list:", uploadedFiles);
  }, [uploadedFiles]);

  const pageTitles = {
    "/": "Home",
    "/data": "Data Management",
    "/dependencies": "Parts & Recipes",
    "/tracker": "My Tracker",
    "/admin/testers": "Testers Registration",
  };

  // Get the current page title, default to "Satisfactory Tracker" if route not found
  const [currentPageTitle, setCurrentPageTitle] = useState(pageTitles[location.pathname] || "Satisfactory Tracker");

  useEffect(() => {
    if (open) {
      setCurrentPageTitle(pageTitles[location.pathname] || "Satisfactory Tracker");
      setTitle("");  // ✅ Reset title input
      setDescription("");  // ✅ Reset description input
      setLabels(["bug"]);  // ✅ Reset labels
    }
  }, [open, location.pathname]);  // ✅ Trigger when modal opens or route changes

  // Function to extract browser & OS from User-Agent
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;

    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Google Chrome";
    if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    if (userAgent.includes("Edge")) browser = "Microsoft Edge";

    let os = "Unknown OS";
    if (userAgent.includes("Windows")) os = "Windows";
    if (userAgent.includes("Mac OS")) os = "Mac OS";
    if (userAgent.includes("Linux")) os = "Linux";

    return `Browser: ${browser} | OS: ${os} | Page: ${currentPageTitle}`;
  };




  // Inside `useEffect()`, replace the old `setBrowserInfo`
  useEffect(() => {
    setBrowserInfo(getBrowserInfo());
  }, []);

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    let uploadedImageUrls = [];

    // ✅ Upload image if one is selected
    // ✅ Upload all selected files
    if (uploadedFiles.length > 0) {
      // const formData = new FormData();
      // files.forEach((file) => formData.append("file", file));
      const formData = new FormData();
      uploadedFiles.forEach((file) => formData.append("file", file));

      try {
        const uploadResponse = await axios.post(API_ENDPOINTS.upload_screenshot, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadedImageUrls = uploadResponse.data.image_urls || [];

      } catch (error) {
        setError("Failed to upload screenshot.");
        setLoading(false);
        return;
      }
    }

    // ✅ Include the tester's username in the issue description
    const issueDescription = `
### Issue Reported by: ${user?.username || "Unknown"}
---
${description}

**Uploaded Files:**  
${uploadedImageUrls.length > 0
        ? uploadedImageUrls.map((url) => {
          const filename = url.split("/").pop(); // Extract filename from URL
          return `📎 [View File - ${filename}](${url})`;
        }).join("\n")
        : "No files uploaded"}


---
**Browser Info:**  
${browserInfo}
`;

    try {
      const response = await axios.post(API_ENDPOINTS.github_issue, {
        title,
        description: issueDescription,
        labels
      });

      setSuccessMessage(response.data.issue_url);
      setTitle("");
      setDescription("");
      setLabels(["bug"]);
      setUploadedFiles([]); // ✅ Clear files after successful upload
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create issue.");
      console.error("Failed to create GitHub issue", error);
      // logToBackend("Failed to create GitHub issue", error);
    } finally {
      setLoading(false);
    }
  };
  const [files, setFiles] = useState([]);

  // ✅ Handle Drop Event
  const onDrop = (acceptedFiles) => {
    setUploadedFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    console.log("Files after upload:", uploadedFiles); // Debugging
    // handleFileUpload(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "image/*",
    multiple: true,  // ✅ Allow multiple uploads
  });

  // ✅ Display File Previews
  const filePreviews = files.map((file, index) => (
    <Typography key={index} variant="body2">
      📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
    </Typography>
  ));

  return (
    <Modal
      open={open}
      onClose={onClose}
      disableEscapeKeyDown  // 🔹 Prevent closing with ESC key
      sx={{ "& .MuiBackdrop-root": { pointerEvents: "none" } }}  // 🔹 Prevent clicking outside to close
    >
      <Box sx={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        bgcolor: "background.paper", padding: 4, borderRadius: 3, boxShadow: 24,
        width: "500px", maxWidth: "90%" // 🔹 Responsive width
      }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>Report an Issue</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Issue created successfully! {" "}
            <a href={successMessage} target="_blank" rel="noopener noreferrer">
              View it here.
            </a>
          </Alert>
        )}


        {/* 🔹 Restrict issue reporting to logged-in users */}
        {!user ? (
          <Alert severity="warning">⚠️ You must be logged in to report an issue.</Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField fullWidth required label="Title" value={title} onChange={(e) => setTitle(e.target.value)} margin="normal" />

            <TextField fullWidth required label="Detailed Description" multiline rows={4} value={description} onChange={(e) => setDescription(e.target.value)} margin="normal" />

            <FormControl fullWidth margin="normal">
              <InputLabel>Labels</InputLabel>
              <Select multiple value={labels} onChange={(e) => setLabels(e.target.value)}>
                <MenuItem value="bug">Bug</MenuItem>
                <MenuItem value="enhancement">Enhancement</MenuItem>
                <MenuItem value="question">Question</MenuItem>
              </Select>
            </FormControl>

            {/* ✅ Image Upload Field */}
            {/* <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: "10px" }} /> */}
            <>
              {/* ✅ Modern Drag & Drop Zone */}
              <Box {...getRootProps()} sx={{
                border: "2px dashed #ddd", padding: 3, textAlign: "center",
                cursor: "pointer", borderRadius: 2, backgroundColor: isDragActive ? "#f0f8ff" : "transparent"
              }}>
                <input {...getInputProps()} />
                <Typography variant="body2">
                  {isDragActive ? "Drop the files here..." : "Drag & drop files here or click to select"}
                </Typography>
              </Box>

              {/* ✅ Show File Previews */}
              <Box sx={{ mt: 2 }}>
                {uploadedFiles.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {uploadedFiles.map((file, index) => (
                      <li key={index} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                        📎 {file.name}
                        <Button
                          onClick={() => handleRemoveFile(index)}
                          variant="outlined"
                          size="small"
                          sx={{ ml: 2, color: "red", borderColor: "red", "&:hover": { backgroundColor: "#ffcccb" } }}
                        >
                          ❌ Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Box>

            </>
            {/* 🔹 Display Browser & URL Info */}
            <Typography variant="body2" sx={{ mt: 2, color: "gray", fontSize: "0.9rem" }}>
              <strong>Browser Info:</strong>
              <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", fontSize: "0.8rem", background: "#f4f4f4", padding: "8px", borderRadius: "4px" }}>
                {browserInfo}
              </pre>
            </Typography>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2, backgroundColor: "#ff5722", "&:hover": { backgroundColor: "#e64a19" } }}
              disabled={loading}  // 🔹 Disable when loading
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
            <Button
              onClick={onClose}
              variant="outlined"
              fullWidth
              sx={{ mt: 2, float: "right", borderColor: "#ff5722", color: "#ff5722", "&:hover": { backgroundColor: "#ffe0b2" } }}
            >
              Close
            </Button>
          </form>
        )}
      </Box>
    </Modal>
  );
};

export default GitHubIssueModal;
