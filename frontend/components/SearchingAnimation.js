export default function SearchingAnimation() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-sm">

      {/* Animated Circle */}
      <div
        className="
          relative 
          w-20 h-20 
          sm:w-24 sm:h-24 
          md:w-28 md:h-28
        "
      >
        {/* Spinning Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-green-400 border-t-transparent animate-spin"></div>

        {/* Pulse Glow */}
        <div className="absolute inset-0 rounded-full bg-green-500 opacity-40 animate-ping"></div>

        {/* Solid Center */}
        <div className="relative w-full h-full rounded-full bg-green-600 shadow-xl"></div>
      </div>

      {/* Text */}
      <p
        className="
          text-gray-300 
          text-base 
          sm:text-lg 
          md:text-xl 
          font-medium
        "
      >
        Looking for a stranger…
      </p>

    </div>
  );
}
