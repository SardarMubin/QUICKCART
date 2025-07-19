"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  from: "user" | "bot";
  text: string;
  products?: Product[];
};

type Product = {
  _id: string;
  name: string;
  price: number;
  slug: string;
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Hi! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { from: "user", text: input.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();

      const botReply: Message = {
        from: "bot",
        text: data.reply || "Here's what I found.",
        products: data.products || [],
      };

      setMessages([...updatedMessages, botReply]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setMessages([
        ...updatedMessages,
        { from: "bot", text: "❌ Sorry, I couldn't get a response." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-black text-white p-3 rounded-full shadow-lg"
        aria-label="Toggle chatbot"
      >
        💬
      </button>

      {isOpen && (
        <div className="w-80 h-96 bg-white border rounded-2xl shadow-lg flex flex-col overflow-hidden mt-2">
          <div className="bg-black text-white p-3 font-bold text-center">
            QuickBot
          </div>

          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div
                  className={`flex ${
                    msg.from === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <span
                    className={`inline-block px-3 py-1 rounded-xl max-w-[75%] whitespace-pre-line ${
                      msg.from === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.text}
                  </span>
                </div>

                {msg.products?.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.products.map((product) => (
                      <div
                        key={product._id}
                        className="p-2 border rounded-xl bg-white shadow-sm"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          ৳{product.price}
                        </div>
                        <a
                          href={`/product/${product.slug}`}
                          className="text-xs mt-1 inline-block text-blue-600 underline"
                        >
                          View Product
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="text-left text-gray-500 italic">Typing...</div>
            )}
            <div ref={scrollRef}></div>
          </div>

          <div className="p-2 border-t flex items-center gap-2">
            <input
              type="text"
              className="flex-1 border rounded-xl px-3 py-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-black text-white rounded-xl disabled:opacity-50"
              disabled={isLoading}
              aria-label="Send message"
            >
              📤
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-xs px-3 pb-2">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
