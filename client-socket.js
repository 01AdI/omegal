import { io } from "socket.io-client";

const client_socket = io(window.location.origin, {
  autoConnect: false, // don't connect until we explicitly call .connect()
  transports: ["polling", "websocket"], // polling first, upgrades to WS
});

export default client_socket;
