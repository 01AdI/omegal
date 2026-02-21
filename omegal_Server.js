const http = require("http");
const socketIO = require("socket.io");
const connectDB = require("./config/db");
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const getTurnCredentials = require("./twil_server");

require("dotenv").config();

const auth_router = require("./routes/auth_router");

const app = express();
const Server = http.createServer(app);
const io = socketIO(Server);

app.use(express.json());
app.use(cookieParser());
const onlineUsers = new Map();

app.use("/api/auth", auth_router);

app.use(express.static(path.join(__dirname, "dist")));


app.get("/",(req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});



app.get("/api/turn-credentials", async (req, res) => {
  try {
    const iceServers = await getTurnCredentials();
    res.json({ iceServers });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get TURN credentials" });
  }
});


io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;

    next();
  } catch (err) {
    return next(new Error("Authentication error: invalid token"));
  }
});

io.on("connect", (socket) => {

  console.log("🔌 New connection - socket id:", socket.id);
  console.log("👤 User id:", socket.userId);
  console.log("📊 Total online users:", onlineUsers.size);
  
  // add user to the onlineUser map
  addUser(socket.userId, socket.id);

   console.log("Online users:", Array.from(onlineUsers.entries()).map(([id, data]) => ({
    userId: id,
    status: data.status
  })));

  // connect the user to a random free user
  socket.on("start", () => {
    socket.emit("searching");

    const userId = socket.userId;
    const patnerId = getRandomFreeUser(userId);

    const user = onlineUsers.get(userId);

    if (!user || user.status !== "IDLE") return;

    if (!patnerId) {
      socket.emit("match-not-found");
      return;
    }

    const partner = onlineUsers.get(patnerId);

    if (!partner || partner.status !== "IDLE") return;

    user.status = "IN_CALL";
    user.partnerId = patnerId;

    partner.status = "IN_CALL";
    partner.partnerId = userId;

    io.to(user.SocketId).emit("match-found", { role: "caller" });
    io.to(partner.SocketId).emit("match-found", { role: "callee" });
  });

  // disconnect the ongoing connection and connect to the next random person who is free
  socket.on("next", () => {
    const userId = socket.userId;
    endcall(userId);
    socket.emit("start");
  });

  socket.on("stop", () => {
    const userId = socket.userId;
    endcall(userId);

    const user = onlineUsers.get(userId);
    if (user) {
      user.status = "IDLE";
      user.partnerId = null;
    }
  });

  // remove user form onlineUser map as soon as they disconnect
  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.userId);
    if (!user) {
      return;
    }
    if (user.partnerId) {
      const partner = onlineUsers.get(user.partnerId);
      if (partner) {
        partner.status = "IDLE";
        partner.partnerId = null;
        io.to(partner.SocketId).emit("partner-disconnected");
      }
    }
    onlineUsers.delete(socket.userId);
  });

  // send message to the receiver
  socket.on("send-message", (text) => {
    const user = onlineUsers.get(socket.userId);
    if (!user || !user.partnerId) return;

    const partner = onlineUsers.get(user.partnerId);
    if (!partner) return;

    io.to(partner.SocketId).emit("receive-message", {
      from: socket.userId,
      text,
      timestamp: Date.now(),
    });
  });

  // webRTC socket:

  // WebRTC signaling
  socket.on("webrtc-offer", ({ offer }) => {
    const user = onlineUsers.get(socket.userId);
    if (!user || !user.partnerId) return;

    const partner = onlineUsers.get(user.partnerId);
    if (!partner) return;

    io.to(partner.SocketId).emit("webrtc-offer", {
      from: socket.userId,
      offer,
    });
  });

  socket.on("webrtc-answer", ({ answer }) => {
    const user = onlineUsers.get(socket.userId);
    if (!user || !user.partnerId) return;

    const partner = onlineUsers.get(user.partnerId);
    if (!partner) return;

    io.to(partner.SocketId).emit("webrtc-answer", {
      from: socket.userId,
      answer,
    });
  });

  socket.on("webrtc-ice-candidate", ({ candidate }) => {
    const user = onlineUsers.get(socket.userId);
    if (!user || !user.partnerId) return;

    const partner = onlineUsers.get(user.partnerId);
    if (!partner) return;

    io.to(partner.SocketId).emit("webrtc-ice-candidate", {
      from: socket.userId,
      candidate,
    });
  });
});

function addUser(userId, SocketId) {
  onlineUsers.set(userId, {
    SocketId: SocketId,
    status: "IDLE",
    partnerId: null,
    joinedAt: Date.now(),
    lastActive: Date.now(),
  });
}

function endcall(userId) {
  const user = onlineUsers.get(userId);
  if (!user || !user.partnerId) return;

  const partner = onlineUsers.get(user.partnerId);

  user.status = "IDLE";
  user.partnerId = null;

  if (partner) {
    partner.status = "IDLE";
    partner.partnerId = null;

    io.to(partner.SocketId).emit("call-ended");
  }

  io.to(user.SocketId).emit("call-ended");
}

function getRandomFreeUser(excludeUserId) {
  const freeUsers = [];

  for (const [id, user] of onlineUsers) {
    if (id !== excludeUserId && user.status === "IDLE") {
      freeUsers.push(id);
    }
  }

  if (freeUsers.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * freeUsers.length);
  return freeUsers[randomIndex];
}

async function StartServer() {
  try {
    await connectDB();

    Server.listen(process.env.PORT, () => {
      console.log(`server is listening on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
}

StartServer();


