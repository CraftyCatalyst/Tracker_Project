import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Button,
  TextField,
  Divider,
} from "@mui/material";
import PsychologyIcon from '@mui/icons-material/Psychology';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { useTheme } from '@mui/material/styles';
import { useAlert } from "../context/AlertContext";
import { UserContext } from "../context/UserContext";
import { Alert, Chip } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

const SupportInbox = () => {
  const { user } = React.useContext(UserContext);
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [quickActions, setQuickActions] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [threadSummary, setThreadSummary] = useState(null);
  const [showAllMessages, setShowAllMessages] = useState(false);

  const handleToggle = () => {
    setShowAllMessages((prev) => !prev);
  };


  // Load inbox
  useEffect(() => {
    fetchInbox();
    const interval = setInterval(() => {
      fetchInbox();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [showAllMessages]);

  // Load inbox on refresh
  const fetchInbox = () => {
    axios
      .get(API_ENDPOINTS.support_messages + `?show_all=${showAllMessages}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error("Failed to fetch support messages", err));
    // console.log("Messages: ", messages);
    // setRows((prev) => prev.filter((row) => row.conversation_id !== replyTarget.conversation_id));
  };

  useEffect(() => {
    if (!selectedMessage) return;
    handleOpenReplyModal(selectedMessage);
  }, [quickActions]);

  const chipColors = {
    feature_request: '#4166f5',
    improvement: '#6050dc',
    thanks: '#18dc3b',
    question: '#FF33A1',
    task: '#dc1882',
    bug_report: '#ff0000',
    delete_account: '#b81414',
    complaint: '#800000',
    reset_password: '#FF8C33',
    login_issue: '#ff7f00',
    general: '#8A2BE2',
  };

  const columns = [
    { field: "id", headerName: "ID", width: 50, hide: true, },
    { field: "conversation_id", headerName: "Thread ID", width: 50, hide: true },
    { field: "from", headerName: "From", flex: 1 },
    { field: "username", headerName: "Username", flex: 0.5 },
    { field: "subject", headerName: "Subject", flex: 2 },
    { field: "created_at", headerName: "Received", width: 140 },
    { field: "body", headerName: "Body", flex: 2, },
    { field: "summary", headerName: "Summary", flex: 2, },
    // { field: "tags", headerName: "Tags", flex: 1, },
    { field: "suggested_actions", headerName: "Suggested Actions", flex: 2, },
    { field: "resolved", headerName: "Resolved", flex: 1, },
    {
      field: "tags",
      headerName: "Tags",
      width: 150,
      renderCell: (params) => {
        const tag = params.value;
        // console.log("Tag: ", tag); // OUTPUT Tag:  feature_request
        const chipColor = chipColors[tag] || "#bdbdbd"; // fallback grey


        // console.log("Chip color: ", chipColor,); // OUTPUT Chip color:  #bdbdbd

        return (
          <Chip
            label={tag}
            size="small"
            sx={{
              backgroundColor: chipColor,
              color: "#fff",
              fontWeight: 500,
              // textTransform: "capitalize"
            }}
          />
        );
      }
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: theme.spacing(1) }}>
          <Button
            variant="contained"
            onClick={() => handleRowClick(params)}
          >
            Select
          </Button>
          <Button
            variant="contained"
            onClick={() => handleOpenThreadModal(params.row.conversation_id)}
          >
            View Thread
          </Button>
        </Box>
      )
    },
  ];

  const handleRowClick = async (params) => {
    const rowId = params.row.id;
    // console.log("Selected message ID: ", rowId);
    setLoadingContent(true);
    setReplyModalOpen(true);
    try {
      const res = await axios.get(API_ENDPOINTS.support_message(rowId));
      setSelectedMessage(res.data);
      console.log("res.data: ", res.data);
      handleOpenReplyModal(res.data);
    } catch (error) {
      console.error("Failed to load message content", error);
      setSelectedMessage({ body_plain: "Failed to load content." });
    }
    setLoadingContent(false);
  };

  const handleOpenReplyModal = (msg) => {
    const usersName = msg?.username || null;
    const adminUsername = user?.username;
    const actionsTaken = quickActions.length > 0
      ? `taken the following actions: ${quickActions.join(", ")}.`
      : `not taken any specific action yet.`;

    setReplyTarget(msg);
    console.log("Reply target: ", msg);
    // check for any saved drafts by calling get_support_draft(messageID) and set the replyBody to the draft body if it exists.
    axios.get(API_ENDPOINTS.get_support_draft(msg.id))
      .then((res) => {
        if (res.data.body) {
          setReplyBody(res.data.body);
          showAlert("info", "Draft loaded successfully!");
        } else {

          setReplyBody(
            `Hi ${usersName || "there"},\n\n` +
            `Thanks for your message. I have ${actionsTaken} \n\n` +
            `<space for anything else> \n\n` +
            `I hope this helps you out!\n\n` +
            `If you have any more queries or need any more help please let us know.\n\n` +
            `Take care,\n${adminUsername}`
          );
        }
      })
    setReplyModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyTarget || !replyBody) return;

    const response = await axios.post(API_ENDPOINTS.support_reply, {
      to: replyTarget.from,
      subject: `support-id-${replyTarget.conversation_id} Re: ${replyTarget.subject}`,
      body: replyBody,
      support_message_id: replyTarget.id,
      conversation_id: replyTarget.conversation_id
    });

    // #TODO: Save support related activities - Save the reply to the database. We can either create a new table or expand on the SupportMessage table support table to store support related activities.
    showAlert("success", "Reply sent successfully!");
    setReplyModalOpen(false);
  };

  const toggleQuickAction = (actionLabel) => {
    setQuickActions(prev =>
      prev.includes(actionLabel)
        ? prev.filter(a => a !== actionLabel)
        : [...prev, actionLabel]
    );
  };

  const handleOpenThreadModal = async (conversationId) => {
    const res = await axios.get(API_ENDPOINTS.support_conversation(conversationId));
    setThreadMessages(res.data.messages);
    setThreadSummary(res.data.summary);
    console.log("Thread messages: ", res.data.messages);
    setThreadModalOpen(true);
  };

  const handleSaveDraft = async () => {
    try {
      if (!replyBody) return;
      const response = await axios.post(API_ENDPOINTS.save_support_draft, {
        body: replyBody,
        message_id: selectedMessage.id,
        conversation_id: selectedMessage.conversation_id,
      });
      showAlert("success", "Draft saved successfully!");
    }
    catch (error) {
      console.error("Error saving draft:", error);
      showAlert("error", "Failed to save draft.");
    }
  }

  const handleResolve = async () => {
    try {
      const response = await axios.post(
        API_ENDPOINTS.resolve_support_message(selectedMessage.id)
      );
      showAlert("success", "Message marked as resolved!");
      setReplyModalOpen(false);
      fetchInbox();
    } catch (error) {
      console.error("Error marking message as resolved:", error);
      showAlert("error", "Failed to mark message as resolved.");
    }
  };

  return (
    <Box p={3} maxHeight={"90vh"} overflow="auto">
      <Typography variant="h4" gutterBottom>
        📬 Support Inbox
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 2,
          width: "100%",
        }}
      >
        <Button
          onClick={handleToggle}
          variant="contained"
          color={showAllMessages ? "info" : "warning"}
        >
          {showAllMessages ? "Viewing: All Messages" : "Viewing: Unresolved Messages"}
        </Button>
      </Box>

      <Box>
        <Paper elevation={3} sx={{ height: 500 }}>
          <DataGrid
            rows={messages}
            columns={columns}
            getRowId={(row) => row.id}
          // onRowClick={handleRowClick}
          />
        </Paper>
      </Box>

      <Dialog open={replyModalOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            setReplyModalOpen(false);
          }
        }}
        disableEscapeKeyDown
        width="60vh" maxWidth="md" fullWidth
      >
        {/*If the replyTarget.username is null set the DialogTitle to the selectedMessage.from */}
        <DialogTitle variant="h3" sx={{ color: theme.palette.text.info }}>
          Support email from {replyTarget?.username || selectedMessage?.from}
        </DialogTitle>
        {/* <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Suggested Actions (debug):</strong>
              <pre>{JSON.stringify(selectedMessage?.suggested_actions, null, 2)}</pre>
            </Alert> */}
        {selectedMessage?.suggested_actions?.length > 0 && (
          <Alert severity="info" icon={<TextSnippetIcon />} sx={{ mt: 2 }}>
            <strong>Summary</strong> <br />
              {selectedMessage.summary} <br /><br />
            <strong>Suggested Actions:</strong>
            <ul style={{ marginTop: 8 }}>
              {selectedMessage.suggested_actions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Divider sx={{ my: 2 }} color="white" />
        <DialogContent dividers
          sx={{
            backgroundColor: "background.default",
            color: "text.primary",
          }}
        >
          {loadingContent ? (
            <CircularProgress />
          ) : selectedMessage ? (
            <>
              <Typography variant="body2" color="text.secondary">
                From: {selectedMessage.from}, To: {selectedMessage.to}
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
                {selectedMessage.body || "(No plain text content found)"}
              </Typography>
            </>
          ) : (
            <Typography>Nothing selected.</Typography>
          )}
          <Divider sx={{ my: 2 }} color="white" />
          <Box sx={{
            gap: theme.spacing(2),
            borderRadius: "8px",
            padding: theme.spacing(2),
          }}>
            <Typography variant="h3" gutterBottom sx={{ color: theme.palette.text.info }}>Quick Actions </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
              <Button onClick={() => toggleQuickAction("Reset your password")}>
                {/* #TODO: Reset Password -  Re-use the reset password functionality from the User Management Page  */}
                Reset Password
              </Button>
              {/* #TODO: New feature to delete a user's account. I need time to spec this properly. BONUS: Can be re-used when doing the user settings feature later */}
              <Button onClick={() => toggleQuickAction("Deleted your account")}>
                Delete Account
              </Button>
              {/* #TODO: Quick Actions - We need brainstorm the most common things a user may need an admin's help with. */}
              <Button onClick={() => toggleQuickAction("Quick Action 3")}>
                Quick Action 3
              </Button>
              <Button onClick={() => toggleQuickAction("Quick Action 4")}>
                Quick Action 4
              </Button>
              <Button onClick={() => toggleQuickAction("Quick Action 5")}>
                Quick Action 5
              </Button>
              <Button onClick={() => toggleQuickAction("Quick Action 6")}>
                Quick Action 6
              </Button>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} color="white" />
          <Box sx={{
            gap: theme.spacing(2),
            borderRadius: "8px",
            padding: theme.spacing(2),
          }}>
            <Typography variant="h3" gutterBottom sx={{ color: theme.palette.text.info }}>Reply to Message</Typography>
            <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
              To: <strong>{replyTarget?.from}</strong>
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
              Subject: <strong>Re: {replyTarget?.subject}</strong>
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={5}
              maxRows={12}
              label="Message"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              sx={{ mt: 2, backgroundColor: theme.palette.background.paper }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "left", mt: 2, gap: theme.spacing(2) }}>
              <Button
                variant="contained" onClick={handleSendReply} disabled={!replyBody.trim()}>
                Send Reply
              </Button>
              {/* Save as Draft - Functionality to allow the admin to save a reply as draft and come back to it later. Links in with the need to create a new table or expand on the SupportMessage table to store support related activities */}
              <Button variant="contained" onClick={handleSaveDraft} disabled={!replyBody.trim()}>
                Save as Draft
              </Button>
            </Box>
            {/* Resolve - Functionality to mark an item as resolved. This should be dependent on a reply having been sent to the user. If no reply was sent then a reason must be given. */}
            <Box sx={{ display: "flex", justifyContent: "right", mt: 2, gap: theme.spacing(2) }}>
              <Button variant="contained" color="warning" onClick={handleResolve}
                startIcon={<CheckCircle />}
              >
                Resolve
              </Button>
              <Button variant="outlined" onClick={() => setReplyModalOpen(false)}>
                Close
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog open={threadModalOpen} onClose={() => setThreadModalOpen(false)} width="60vh" maxWidth="md" fullWidth
      >
        <DialogTitle variant="h3" sx={{ color: theme.palette.text.info }}>
          Support Thread
        </DialogTitle>
        {/* <Alert severity="info" icon={<TextSnippetIcon />} sx={{ mb: 2 }}>
          <strong>AI Summary:</strong><br />
          {threadSummary || "No summary available."}
        </Alert> */}

        {threadSummary && (
          <Alert severity="info" icon={<TextSnippetIcon />} sx={{ mb: 2 }}>
            <strong>Thread Summary:</strong>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              {threadSummary
                .split("\n")
                .filter((line) => line.trim().startsWith("-"))
                .map((line, index) => {
                  // Remove the "- " and apply bold formatting
                  const plain = line.replace(/^-\s*/, "");

                  // Split into parts to wrap bold phrases
                  const parts = plain.split(/(\*\*.*?\*\*)/g);

                  return (
                    <li key={index}>
                      {parts.map((part, i) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={i}>{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </li>
                  );
                })}
            </ul>
          </Alert>
        )}
        <DialogContent dividers
          sx={{
            backgroundColor: "background.default",
            color: "text.primary",
          }}
        >
          {threadMessages.map((msg, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Typography variant="caption" color={theme.palette.text.info} sx={{ mb: 0.5, display: "block" }}>
                {msg.type === "reply" ? "Admin reply from" : "Message from"} <strong>{msg.from}</strong> at {new Date(msg.timestamp).toLocaleString()}
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mt: 0.5,
                  backgroundColor: msg.type === "reply" ? "primary.secondary" : "background.paper",
                  color: "text.primary",
                  borderLeft: msg.type === "reply" ? "4px solid #2196f3" : "4px solid #4caf50",
                  boxShadow: 1,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {msg.body}
                </Typography>
              </Paper>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SupportInbox;
