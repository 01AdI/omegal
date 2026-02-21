import client_socket from "../../client-socket";
import { useEffect, useState } from "react";

export default function ChatPanel({ status }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    client_socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => client_socket.off("receive-message");
  }, []);

  const sendMessage = () => {
    if (!text.trim()) return;
    client_socket.emit("send-message", text);
    setMessages((prev) => [...prev, { text, self: true }]);
    setText("");
  };

  return (
  <div className="flex flex-col h-full bg-gray-900 text-white">

    {/* Messages */}
    <div className="flex-1 p-4 overflow-y-auto space-y-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.self ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`
              max-w-[75%] 
              px-4 py-2 
              rounded-2xl 
              text-sm 
              wrap-break-word
              ${
                m.self
                  ? "bg-green-500 text-white rounded-br-none"
                  : "bg-gray-700 text-white rounded-bl-none"
              }
            `}
          >
              {m.text}
          </div>
        </div>
      ))}
    </div>

    {/* Input */}
    <div className="p-3 border-t border-gray-700 bg-gray-900">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={status !== "MATCHED"}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-green-500"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={sendMessage}
          disabled={status !== "MATCHED"}
          className="px-4 py-2 bg-green-500 rounded-full text-white hover:bg-green-600 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>

</div>

);

}
