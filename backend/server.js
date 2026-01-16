require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const connectDB = require("./config/database");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api", apiRoutes);

// Export io để sử dụng trong các controller
app.set("io", io);

const { initializeDefaultUsers } = require("./services/votingService");

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const startServer = async () => {
  try {
    await connectDB();

    // Initialize default voting users
    try {
      await initializeDefaultUsers();
      console.log("Default voting users initialized");
    } catch (error) {
      console.log("Error initializing default users:", error.message);
    }

    server.listen(port, () => {
      console.log(`Backend Nodejs App listening on port ${port}`);
      console.log(`WebSocket server ready`);
    });
  } catch (error) {
    console.log(">>> Error connecting to DB:", error);
  }
};

startServer();
