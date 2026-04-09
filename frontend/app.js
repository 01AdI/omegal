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

// ── SVG Icon components ──────────────────────────────────────────────────────
const MicIcon = ({ muted }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    )}
  </svg>
);

const CameraIcon = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </>
    )}
  </svg>
);

const SkipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const EndCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 3.07 8.63 19.79 19.79 0 0 1 0 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L6.18 6.68" transform="rotate(135 12 12)" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
  </svg>
);

// ── Inline styles (avoids Tailwind purge issues with dynamic classes) ─────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

  .vc-root {
    height: 100vh;
    display: flex;
    background: #080c14;
    color: #e8ecf4;
    font-family: 'Outfit', system-ui, sans-serif;
    overflow: hidden;
  }

  /* ── Topbar ── */
  .vc-topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: linear-gradient(to bottom, rgba(8,12,20,0.95) 0%, transparent 100%);
  }

  .vc-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .vc-logo-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #00c6ff;
    box-shadow: 0 0 8px #00c6ff88;
  }

  .vc-logo-text {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.5px;
    background: linear-gradient(90deg, #fff 0%, #8ab4f8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .vc-status-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.3px;
    backdrop-filter: blur(8px);
  }
  .vc-status-pill.connected { background: rgba(0,198,100,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
  .vc-status-pill.disconnected { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
  .vc-status-pill.searching { background: rgba(0,198,255,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.2); }
  .vc-status-pill.incall { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }

  .vc-status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
  .vc-status-dot.pulse { animation: pulse 1.5s infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.7); }
  }

  .vc-logout-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: #94a3b8;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
  }
  .vc-logout-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }

  /* ── Error banner ── */
  .vc-error {
    position: absolute;
    top: 64px; left: 50%; transform: translateX(-50%);
    z-index: 40;
    background: rgba(239,68,68,0.9);
    backdrop-filter: blur(8px);
    color: white;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 480px;
    width: calc(100% - 40px);
    box-shadow: 0 4px 20px rgba(239,68,68,0.3);
  }
  .vc-error-close {
    margin-left: auto;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 16px;
    padding: 0 2px;
    opacity: 0.7;
  }
  .vc-error-close:hover { opacity: 1; }

  /* ── Video area ── */
  .vc-video-area {
    flex: 1;
    position: relative;
    background: #040609;
    overflow: hidden;
  }

  /* Primary (remote) video fills the area */
  .vc-remote-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Local video - PiP in bottom-right */
  .vc-local-pip {
    position: absolute;
    bottom: 100px;
    right: 20px;
    width: 200px;
    aspect-ratio: 16/9;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    z-index: 20;
    transition: transform 0.2s;
  }
  .vc-local-pip:hover { transform: scale(1.04); }
  .vc-local-pip video { width: 100%; height: 100%; object-fit: cover; display: block; }

  .vc-pip-label {
    position: absolute;
    bottom: 6px; left: 8px;
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.8);
    letter-spacing: 0.3px;
  }

  .vc-live-badge {
    position: absolute;
    top: 16px; left: 16px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(239,68,68,0.85);
    backdrop-filter: blur(6px);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    color: white;
  }

  /* ── Idle screen ── */
  .vc-idle {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at 40% 50%, #0d1829 0%, #080c14 60%);
  }

  .vc-idle-card {
    text-align: center;
    max-width: 360px;
    padding: 0 20px;
  }

  .vc-idle-icon {
    width: 72px; height: 72px;
    border-radius: 24px;
    background: rgba(0,198,255,0.08);
    border: 1px solid rgba(0,198,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 28px;
  }

  .vc-idle-title {
    font-size: 28px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0 0 10px;
    letter-spacing: -0.5px;
  }

  .vc-idle-sub {
    font-size: 14px;
    color: #64748b;
    margin: 0 0 28px;
    line-height: 1.6;
  }

  .vc-perm-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    margin-bottom: 24px;
  }
  .vc-perm-badge.granted { background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
  .vc-perm-badge.pending { background: rgba(234,179,8,0.1); color: #facc15; border: 1px solid rgba(234,179,8,0.2); }

  .vc-start-btn {
    padding: 14px 40px;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #0072ff, #00c6ff);
    color: white;
    font-size: 16px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: all 0.2s;
    box-shadow: 0 4px 24px rgba(0,114,255,0.35);
  }
  .vc-start-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,114,255,0.5); }
  .vc-start-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

  .vc-connecting-hint {
    font-size: 12px;
    color: #facc15;
    margin-top: 14px;
  }

  /* ── Waiting state (right panel when not matched) ── */
  .vc-waiting {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0f1a;
  }
  .vc-waiting-text {
    font-size: 13px;
    color: #334155;
    letter-spacing: 0.5px;
  }

  /* ── Control bar ── */
  .vc-controls {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(10, 14, 26, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  }

  .vc-ctrl-btn {
    width: 46px; height: 46px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .vc-ctrl-btn:hover { background: rgba(255,255,255,0.12); color: white; transform: scale(1.08); }
  .vc-ctrl-btn.active-red { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #f87171; }
  .vc-ctrl-btn.active-red:hover { background: rgba(239,68,68,0.35); }

  .vc-ctrl-divider {
    width: 1px;
    height: 28px;
    background: rgba(255,255,255,0.08);
    margin: 0 4px;
  }

  .vc-skip-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px;
    height: 46px;
    border-radius: 999px;
    border: 1px solid rgba(56,189,248,0.25);
    background: rgba(56,189,248,0.08);
    color: #38bdf8;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }
  .vc-skip-btn:hover { background: rgba(56,189,248,0.18); border-color: rgba(56,189,248,0.45); transform: scale(1.04); }

  .vc-end-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px;
    height: 46px;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 12px rgba(239,68,68,0.35);
    letter-spacing: 0.3px;
  }
  .vc-end-btn:hover { transform: scale(1.04); box-shadow: 0 4px 20px rgba(239,68,68,0.55); }

  /* ── Chat sidebar ── */
  .vc-chat {
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #0c1120;
    border-left: 1px solid rgba(255,255,255,0.05);
  }

  .vc-chat-header {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0a0f1c;
    margin-top: 0;
    padding-top: 60px;
  }

  .vc-chat-title {
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .vc-chat-body {
    flex: 1;
    overflow: hidden;
  }
`;

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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    client_socket.auth = { token };
    client_socket.connect(); 

    client_socket.on("connect", () => { setIsSocketConnected(true); setConnectionError(""); });
    client_socket.on("connect_error", () => { setConnectionError("Failed to connect. Please refresh."); setIsSocketConnected(false); });
    client_socket.on("disconnect", () => setIsSocketConnected(false));
    client_socket.on("searching", () => setStatus("SEARCHING"));
    client_socket.on("match-found", ({ role: userRole }) => { setRole(userRole); setStatus("MATCHED"); });
    client_socket.on("match-not-found", () => setStatus("IDLE"));
    client_socket.on("webrtc-offer", async ({ offer }) => await handleOffer(offer));
    client_socket.on("webrtc-answer", async ({ answer }) => await handleAnswer(answer));
    client_socket.on("webrtc-ice-candidate", ({ candidate }) => addIceCandidate(candidate));
    client_socket.on("call-ended", () => { closeWebRTC(); setStatus("IDLE"); setRole(null); });
    client_socket.on("partner-disconnected", () => { closeWebRTC(); setStatus("IDLE"); setRole(null); });

    return () => { client_socket.removeAllListeners(); client_socket.disconnect(); closeWebRTC(); };
  }, []);

  useEffect(() => {
    if (status === "MATCHED" && role) {
      window.localVideoRef = localVideoRef;
      window.remoteVideoRef = remoteVideoRef;
      if (!hasPermissions) { setPermissionError("Please grant camera permissions first"); setStatus("IDLE"); return; }
      initWebRTC(role === "caller").catch(err => { setPermissionError(err.message); setStatus("IDLE"); });
    }
  }, [status, role, hasPermissions]);

  const checkAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(d => d.kind === "videoinput");
      const hasAudio = devices.some(d => d.kind === "audioinput");
      if (!hasVideo || !hasAudio) { setPermissionError(`Missing: ${!hasVideo ? "camera" : ""} ${!hasAudio ? "microphone" : ""}`); return false; }
      return true;
    } catch { return false; }
  };

  const requestPermissions = async () => {
    setIsCheckingPermissions(true);
    setPermissionError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Your browser doesn't support video chat.");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      window.tempStream = stream;
      setHasPermissions(true);
      return true;
    } catch (error) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionError("Camera and microphone access denied. Click the camera/lock icon in the address bar and allow access, then refresh.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        const hasDevices = await checkAvailableDevices();
        if (!hasDevices) setPermissionError("No camera or microphone found on your device.");
        else setPermissionError("Camera or microphone not found. Please connect a device.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setPermissionError("Camera or microphone is already in use by another application.");
      } else {
        setPermissionError(`Failed to access camera/microphone: ${error.message}`);
      }
      return false;
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleStart = async () => {
    if (!isSocketConnected) { setConnectionError("Not connected to server. Please wait..."); return; }
    if (!hasPermissions) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    client_socket.emit("start");
  };

  const handleStop = () => {
    client_socket.emit("stop");
    closeWebRTC();
    setStatus("IDLE");
    setRole(null);
  };

  const handleNext = () => {
    client_socket.emit("next");
    closeWebRTC();
    setStatus("SEARCHING");
    setRole(null);
  };

  const handleLogoutClick = () => {
    closeWebRTC();
    client_socket.disconnect();
    onLogout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    import("./webrtc_video").then(m => m.toggleMute());
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    import("./webrtc_video").then(m => m.toggleCamera());
  };

  const statusConfig = {
    IDLE: { label: "Idle", cls: "connected" },
    SEARCHING: { label: "Searching...", cls: "searching", pulse: true },
    MATCHED: { label: "In Call", cls: "incall", pulse: true },
  };
  const sc = statusConfig[status] || statusConfig.IDLE;

  return (
    <>
      <style>{styles}</style>
      <div className="vc-root">
        {/* ── Video Area ── */}
        <div className="vc-video-area">

          {/* Topbar */}
          <div className="vc-topbar">
            <div className="vc-logo">
              <div className="vc-logo-dot" />
              <span className="vc-logo-text">NexChat</span>
            </div>
            <div className="vc-status-pill" style={{ display: "flex", gap: "16px", background: "none", border: "none", padding: 0 }}>
              <div className={`vc-status-pill ${isSocketConnected ? "connected" : "disconnected"}`}>
                <div className={`vc-status-dot ${!isSocketConnected ? "pulse" : ""}`} />
                {isSocketConnected ? "Connected" : "Disconnected"}
              </div>
              {status !== "IDLE" && (
                <div className={`vc-status-pill ${sc.cls}`}>
                  <div className={`vc-status-dot ${sc.pulse ? "pulse" : ""}`} />
                  {sc.label}
                </div>
              )}
            </div>
            <button className="vc-logout-btn" onClick={handleLogoutClick}>
              <LogoutIcon /> Sign out
            </button>
          </div>

          {/* Error banner */}
          {(connectionError || permissionError) && (
            <div className="vc-error">
              <span>⚠ {connectionError || permissionError}</span>
              <button className="vc-error-close" onClick={() => { setConnectionError(""); setPermissionError(""); }}>✕</button>
            </div>
          )}

          {/* IDLE state */}
          {status === "IDLE" && (
            <div className="vc-idle">
              <div className="vc-idle-card">
                <div className="vc-idle-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c6ff" strokeWidth="1.5">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <h2 className="vc-idle-title">Meet someone new</h2>
                <p className="vc-idle-sub">Connect instantly with strangers around the world via live video chat.</p>
                <div className={`vc-perm-badge ${hasPermissions ? "granted" : "pending"}`}>
                  {hasPermissions ? "✓ Camera & mic ready" : "⚠ Camera & mic required"}
                </div>
                <br />
                <button className="vc-start-btn" onClick={handleStart} disabled={!isSocketConnected || isCheckingPermissions}>
                  {isCheckingPermissions ? "Requesting access..." : "Start chatting"}
                </button>
                {!isSocketConnected && <p className="vc-connecting-hint">Connecting to server…</p>}
              </div>
            </div>
          )}

          {/* SEARCHING state */}
          {status === "SEARCHING" && (
            <div className="vc-idle" style={{ background: "radial-gradient(ellipse at 50% 50%, #0d1829 0%, #080c14 70%)" }}>
              <SearchingAnimation />
            </div>
          )}

          {/* MATCHED state - remote video full screen */}
          {status === "MATCHED" && (
            <>
              <div className="vc-live-badge">
                <div className="vc-status-dot pulse" style={{ background: "white", width: 6, height: 6 }} />
                LIVE
              </div>
              <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline className="vc-remote-video" />

              {/* PiP local video */}
              <div className="vc-local-pip">
                <video ref={localVideoRef} id="localVideo" autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <span className="vc-pip-label">You {!isCameraOn && "(off)"}</span>
              </div>
            </>
          )}

          {/* Control bar (only in call) */}
          {status === "MATCHED" && (
            <div className="vc-controls">
              <button className={`vc-ctrl-btn ${isMuted ? "active-red" : ""}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                <MicIcon muted={isMuted} />
              </button>
              <button className={`vc-ctrl-btn ${!isCameraOn ? "active-red" : ""}`} onClick={toggleCamera} title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
                <CameraIcon off={!isCameraOn} />
              </button>
              <div className="vc-ctrl-divider" />
              <button className="vc-skip-btn" onClick={handleNext}>
                <SkipIcon /> Next
              </button>
              <button className="vc-end-btn" onClick={handleStop}>
                <EndCallIcon /> End
              </button>
            </div>
          )}
        </div>

        {/* ── Chat Sidebar ── */}
        <div className="vc-chat">
          <div className="vc-chat-header">
            <span className="vc-chat-title">Chat</span>
          </div>
          <div className="vc-chat-body">
            <ChatPanel status={status} />
          </div>
        </div>
      </div>
    </>
  );
}
