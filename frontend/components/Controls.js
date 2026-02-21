import { useState } from "react";
import { toggleMute, toggleCamera } from "../webrtc_video";

export default function Controls({ status }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const handleMute = () => {
    const enabled = toggleMute();
    setIsMuted(!enabled);
  };

  const handleCamera = () => {
    const enabled = toggleCamera();
    setIsCameraOn(enabled);
  };

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] md:w-auto flex justify-center gap-3 md:gap-4
      bg-black/40 backdrop-blur-md px-4 py-2 rounded-full"
    >
      {/* Mute */}
      <button
        onClick={handleMute}
        disabled={status !== "MATCHED"}
        className="
        flex-1 md:flex-none
        px-4 py-3 md:py-2
        text-sm md:text-base
        bg-blue-600
        rounded-full
        hover:bg-blue-700
        disabled:opacity-50
        transition
      "
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>

      {/* Camera */}
      <button
        onClick={handleCamera}
        disabled={status !== "MATCHED"}
        className="
        flex-1 md:flex-none
        px-4 py-3 md:py-2
        text-sm md:text-base
        bg-purple-600
        rounded-full
        hover:bg-purple-700
        disabled:opacity-50
        transition
      "
      >
        {isCameraOn ? "Turn Off" : "Camera"}
      </button>
    </div>
  );
}
