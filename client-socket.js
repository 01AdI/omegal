import { io } from "socket.io-client";

const client_socket = io(window.location.origin, {
  auth: {
    token: localStorage.getItem("token"),
  },
  transports: ["websocket"],
});

export default client_socket;
