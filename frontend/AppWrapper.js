import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import App from "./app";

export default function AppWrapper() {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for token when component mounts
    const storedToken = localStorage.getItem("token");
    console.log("Stored token:", storedToken); // Debug log
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  // Handle auth success
  const handleAuthSuccess = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  // Show loading state while checking token
  if (isLoading) {
    return (
      <div style={{height:'100dvh'}} className="flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If no token, show auth page
  if (!token) {
    console.log("No token found, showing AuthPage"); // Debug log
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Token exists, show main app
  console.log("Token found, showing App"); // Debug log
  return <App onLogout={handleLogout} />;
}
