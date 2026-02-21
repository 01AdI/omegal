import { io } from "socket.io-client";

const client_socket = io("http://localhost:4000", {
  auth: {
    token: localStorage.getItem("token"),
  },
  transports: ["websocket"], // better for real-time
});

export default client_socket;
