// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// JSON file to store configs
const CONFIG_FILE = path.join(__dirname, "deviceConfigs.json");

// Read configs from JSON
let deviceConfigs = {};
if (fs.existsSync(CONFIG_FILE)) {
  const fileData = fs.readFileSync(CONFIG_FILE, "utf-8");
  deviceConfigs = JSON.parse(fileData);
  console.log("🔁 Loaded configs from deviceConfigs.json");
} else {
  console.log("📁 deviceConfigs.json not found, using empty config.");
}

const DEFAULT_CONFIG = {
  databaseUrl: "https://cooldude-88379-default-rtdb.firebaseio.com",
  apiKey: "AIzaSyBt06-UOjjs75eySqqdNU9O8qv9nYHOPfY",
  projectId: "cooldude-88379",
  appId: "1:435966902362:web:133b0715cd80a19f531863",
};

// Save function
function saveConfigsToFile() {
  fs.writeFile(CONFIG_FILE, JSON.stringify(deviceConfigs, null, 2), (err) => {
    if (err) console.error("❌ Failed to write configs:", err);
    else console.log("💾 Configs saved to file.");
  });
}

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("getFirebaseConfig", (deviceId, callback) => {
    const config = deviceConfigs[deviceId] || DEFAULT_CONFIG;
    callback({ status: "success", config });
  });

  socket.on("firebaseConfig", (callback) => {
    const config = deviceConfigs || DEFAULT_CONFIG;
    callback({ status: "success", config });
  });

  socket.on("commitConfig", ({ deviceId, config }) => {
    if (!deviceId || typeof config !== "object") {
      return socket.emit("error", { message: "Invalid deviceId or config." });
    }

    // Merge or add new device config
    deviceConfigs[deviceId] = {
      ...(deviceConfigs[deviceId] || {}), // existing values if any
      ...config, // new values overwrite/merge
    };

    saveConfigsToFile();
    console.log(`✅ Config saved for device: ${deviceId}`);

    // Notify all clients about the update
    io.emit("configUpdated", { deviceId, config: deviceConfigs[deviceId] });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
