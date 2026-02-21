// webrtc.js
import client_socket from "../client-socket";

let peer;
let localStream;

export async function initWebRTC(isCaller) {
  try {
    console.log("Initializing WebRTC, isCaller:", isCaller);

    // Fetch TURN credentials
    const response = await fetch("/api/turn-credentials");
    if (!response.ok) {
      throw new Error("Failed to fetch TURN credentials");
    }
    const data = await response.json();
    
    // Create peer connection
    peer = new RTCPeerConnection({
      iceServers: data.iceServers,
    });
    
    // Get local media
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // Use refs instead of getElementById
    if (window.localVideoRef?.current) {
      window.localVideoRef.current.srcObject = localStream;
    }

    // Add tracks to peer connection
    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
    });

    // Remote media handler
    peer.ontrack = event => {
      if (window.remoteVideoRef?.current) {
        window.remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidates
    peer.onicecandidate = event => {
      if (event.candidate) {
        client_socket.emit("webrtc-ice-candidate", {
          candidate: event.candidate,
        });
      }
    };

    // Caller creates offer
    if (isCaller) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      client_socket.emit("webrtc-offer", { offer });
    }

    return true;
  } catch (error) {
    console.error("WebRTC init error:", error);
    throw error;
  }
}

export async function handleOffer(offer) {
  if (!peer) {
    await initWebRTC(false);
  }

  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  client_socket.emit("webrtc-answer", { answer });
}

export async function handleAnswer(answer) {
  await peer.setRemoteDescription(answer);
}

export function addIceCandidate(candidate) {
  if (peer) {
    peer.addIceCandidate(candidate).catch(err => {
      console.error("Error adding ICE candidate:", err);
    });
  }
}

export function closeWebRTC() {
  if (peer) {
    peer.close();
    peer = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  // Clear video elements
  if (window.localVideoRef?.current) {
    window.localVideoRef.current.srcObject = null;
  }
  if (window.remoteVideoRef?.current) {
    window.remoteVideoRef.current.srcObject = null;
  }
}

export function toggleMute() {
  if (!localStream) return false;

  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) return false;

  audioTrack.enabled = !audioTrack.enabled;
  return audioTrack.enabled;
}

export function toggleCamera() {
  if (!localStream) return false;

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return false;

  videoTrack.enabled = !videoTrack.enabled;
  return videoTrack.enabled;
}