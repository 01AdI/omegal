import { useEffect, useState, useRef } from "react";
import client_socket from "../client-socket";
import ChatPanel from "./components/ChatPanel";
import SearchingAnimation from "./components/SearchingAnimation";
import {
  initWebRTC,
  handleOffer,
  handleAnswer,
  addIceCandidate,
  closeWebRTC,
} from "./webrtc_video";

export default function App({ onLogout }) {
  const [status, setStatus] = useState("IDLE");
  const [role, setRole] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    console.log("App mounted, setting up socket...");
    
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found!");
      return;
    }

    client_socket.auth = { token };
    
    client_socket.on("connect", () => {
      console.log("✅ Socket connected! ID:", client_socket.id);
      setIsSocketConnected(true);
      setConnectionError("");
    });

    client_socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setConnectionError("Failed to connect to server. Please refresh.");
      setIsSocketConnected(false);
    });

    client_socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsSocketConnected(false);
    });

    client_socket.on("searching", () => {
      console.log("🔍 Searching for partner...");
      setStatus("SEARCHING");
    });

    client_socket.on("match-found", ({ role: userRole }) => {
      console.log("✅ Match found! Role:", userRole);
      setRole(userRole);
      setStatus("MATCHED");
    });

    client_socket.on("match-not-found", () => {
      console.log("❌ No match found");
      setStatus("IDLE");
    });

    client_socket.on("webrtc-offer", async ({ offer }) => {
      console.log("Received WebRTC offer");
      await handleOffer(offer);
    });

    client_socket.on("webrtc-answer", async ({ answer }) => {
      console.log("Received WebRTC answer");
      await handleAnswer(answer);
    });

    client_socket.on("webrtc-ice-candidate", ({ candidate }) => {
      console.log("Received ICE candidate");
      addIceCandidate(candidate);
    });

    client_socket.on("call-ended", () => {
      console.log("Call ended");
      closeWebRTC();
      setStatus("IDLE");
      setRole(null);
    });

    client_socket.on("partner-disconnected", () => {
      console.log("Partner disconnected");
      closeWebRTC();
      setStatus("IDLE");
      setRole(null);
    });

    client_socket.connect();

    return () => {
      console.log("Cleaning up");
      client_socket.removeAllListeners();
      client_socket.disconnect();
      closeWebRTC();
    };
  }, []);

  // Initialize WebRTC when matched
  useEffect(() => {
    if (status === "MATCHED" && role) {
      console.log("Initializing WebRTC with role:", role);
      
      // Pass refs to WebRTC functions
      window.localVideoRef = localVideoRef;
      window.remoteVideoRef = remoteVideoRef;
      
      // Check if we already have permissions
      if (!hasPermissions) {
        setPermissionError("Please grant camera permissions first");
        setStatus("IDLE");
        return;
      }

      initWebRTC(role === "caller").catch(err => {
        console.error("WebRTC initialization failed:", err);
        setPermissionError(err.message);
        setStatus("IDLE");
      });
    }
  }, [status, role, hasPermissions]);

  // Function to check available devices
  const checkAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');
      
      console.log("Available devices:", { hasVideo, hasAudio });
      
      if (!hasVideo || !hasAudio) {
        setPermissionError(`Missing: ${!hasVideo ? 'camera' : ''} ${!hasAudio ? 'microphone' : ''}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error checking devices:", err);
      return false;
    }
  };

  const requestPermissions = async () => {
    setIsCheckingPermissions(true);
    setPermissionError("");
    
    try {
      console.log("🎥 Requesting camera/microphone permissions...");
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support video chat. Please use Chrome, Firefox, or Edge.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      console.log("✅ Permissions granted!");
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("Available devices after permission:", 
        devices.map(d => ({ kind: d.kind, label: d.label }))
      );
      
      window.tempStream = stream;
      setHasPermissions(true);
      return true;
    } catch (error) {
      console.error("❌ Permission error details:", error);
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera and microphone access denied. " +
          "Click the camera/lock icon in the address bar and allow access, then refresh."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        const hasDevices = await checkAvailableDevices();
        if (!hasDevices) {
          setPermissionError("No camera or microphone found on your device.");
        } else {
          setPermissionError("Camera or microphone not found. Please connect a device.");
        }
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setPermissionError("Camera or microphone is already in use by another application.");
      } else if (error.name === "OverconstrainedError") {
        setPermissionError("Camera doesn't support required settings.");
      } else {
        setPermissionError(`Failed to access camera/microphone: ${error.message}`);
      }
      return false;
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleStart = async () => {
    console.log("🟢 Start button clicked");
    
    if (!isSocketConnected) {
      setConnectionError("Not connected to server. Please refresh.");
      return;
    }

    if (!hasPermissions) {
      const granted = await requestPermissions();
      if (!granted) {
        return;
      }
    }

    if (status !== "IDLE") {
      console.log("Cannot start: current status is", status);
      return;
    }

    console.log("Emitting 'start' event...");
    client_socket.emit("start");
  };

  const handleStop = () => {
    console.log("Stopping...");
    client_socket.emit("stop");
    closeWebRTC();
    setStatus("IDLE");
    setRole(null);
    
    if (window.tempStream) {
      window.tempStream.getTracks().forEach(t => t.stop());
      window.tempStream = null;
    }
  };

  const handleNext = () => {
    console.log("Finding next partner...");
    client_socket.emit("next");
  };

  const handleLogoutClick = () => {
    client_socket.disconnect();
    onLogout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    import("./webrtc_video").then(module => {
      module.toggleMute();
    });
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    import("./webrtc_video").then(module => {
      module.toggleCamera();
    });
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Main Content Area - Left Side (Video Section) */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-green-500">Omegle Clone</h1>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              isSocketConnected ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span>{isSocketConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400 hidden sm:inline">
              {status === "MATCHED" ? "🔴 In Call" : status === "SEARCHING" ? "🔍 Searching..." : "⚫ Idle"}
            </span>
            <button
              onClick={handleLogoutClick}
              className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {(connectionError || permissionError) && (
          <div className="bg-red-600/90 text-white px-4 py-3 text-sm text-center relative">
            <p className="font-semibold mb-1">⚠️ {connectionError || permissionError}</p>
            {permissionError && permissionError.includes("denied") && (
              <p className="text-xs opacity-90">
                Click the camera/lock icon in the address bar → Allow camera and microphone → Refresh
              </p>
            )}
            <button 
              onClick={() => {
                setConnectionError("");
                setPermissionError("");
              }}
              className="absolute right-2 top-2 text-white font-bold hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Video Section - Split Screen */}
        <div className="flex-1 flex">
          {/* Left Side - Your Camera */}
          <div className="w-1/2 relative bg-black border-r border-gray-700">
            {status === "IDLE" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <h2 className="text-3xl font-bold text-white mb-4">Welcome</h2>
                  <p className="text-gray-400 mb-8">Video chat with random strangers</p>
                  
                  {hasPermissions ? (
                    <div className="mb-4 text-green-400 text-sm">
                      ✅ Camera and microphone access granted
                    </div>
                  ) : (
                    <div className="mb-4 text-yellow-400 text-sm">
                      ⚠️ Camera and microphone access required
                    </div>
                  )}

                  <button
                    onClick={handleStart}
                    disabled={!isSocketConnected || isCheckingPermissions}
                    className="bg-green-600 text-white px-8 py-4 rounded-full text-xl hover:bg-green-700 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingPermissions ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Requesting permissions...
                      </span>
                    ) : (
                      "Start Chatting"
                    )}
                  </button>

                  {!isSocketConnected && (
                    <p className="mt-4 text-yellow-500">Connecting to server...</p>
                  )}
                </div>
              </div>
            )}

            {status === "SEARCHING" && (
              <div className="absolute inset-0">
                <SearchingAnimation />
              </div>
            )}

            {status === "MATCHED" && (
              <>
                <video
                  ref={localVideoRef}
                  id="localVideo"
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  Your Camera {!isCameraOn && "(Off)"}
                </div>
                <div className="absolute top-4 left-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></span>
                  Live
                </div>
              </>
            )}
          </div>

          {/* Right Side - Stranger's Camera */}
          <div className="w-1/2 relative bg-black">
            {status === "MATCHED" ? (
              <>
                <video
                  ref={remoteVideoRef}
                  id="remoteVideo"
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  Stranger's Camera
                </div>
                <div className="absolute top-4 left-4 bg-blue-500/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                  Connected
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <p className="text-gray-500">Waiting to connect...</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls Bar - Centered Buttons */}
        {status === "MATCHED" && (
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
            <div className="flex justify-center items-center gap-3">
              <button
                onClick={toggleMute}
                className={`px-6 py-3 rounded-full text-sm font-medium transition ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isMuted ? '🔇 Unmute' : '🎤 Mic On'}
                </span>
              </button>

              <button
                onClick={toggleCamera}
                className={`px-6 py-3 rounded-full text-sm font-medium transition ${
                  !isCameraOn 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isCameraOn ? '📹 Camera On' : '📹 Camera Off'}
                </span>
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full text-sm font-medium transition"
              >
                ⏭️ Skip
              </button>

              <button
                onClick={handleStop}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full text-sm font-medium transition"
              >
                ⏹️ End
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel - Right Side (Fixed Width) */}
      <div className="w-80 border-l border-gray-700 bg-gray-800 flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-700 bg-gray-900">
            <h3 className="font-semibold text-gray-300">Chat</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}