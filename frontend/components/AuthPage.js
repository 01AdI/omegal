import { useState } from "react";

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);

  const [UserName, setUserName] = useState("");
  const [Email, setEmail] = useState("");
  const [Password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    const endpoint = isLogin ? "login" : "register";

    const body = isLogin
      ? { Email, Password }
      : { UserName, Email, Password };

    try {
      const res = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // IMPORTANT for cookies
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        onAuthSuccess(data.token);
      }

      if (!isLogin) {
        setIsLogin(true); // after signup switch to login
      }

    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">

      <div className="w-80 bg-gray-800 p-6 rounded-xl shadow-xl space-y-4">

        <h2 className="text-2xl font-semibold text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        {!isLogin && (
          <input
            className="w-full p-2 bg-gray-700 rounded outline-none"
            placeholder="Username"
            value={UserName}
            onChange={(e) => setUserName(e.target.value)}
          />
        )}

        <input
          className="w-full p-2 bg-gray-700 rounded outline-none"
          placeholder="Email"
          value={Email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 bg-gray-700 rounded outline-none"
          placeholder="Password"
          value={Password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full py-2 bg-green-600 rounded hover:bg-green-700 transition"
        >
          {isLogin ? "Login" : "Register"}
        </button>

        <p
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-center text-gray-400 cursor-pointer hover:text-gray-200"
        >
          {isLogin
            ? "Don't have an account? Sign up"
            : "Already have an account? Login"}
        </p>

      </div>
    </div>
  );
}
