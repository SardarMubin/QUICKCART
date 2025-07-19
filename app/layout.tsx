import "./globals.css";
import { Toaster } from "react-hot-toast";
// import FloatingChatWidget from "@/components/FloatingChatWidget.";
import Chatbot from "@/components/Chatbot";
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className="font-poppins antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#000000",
              color: "#fff",
            },
          }}
        />
        <Chatbot />
      </body>
    </html>
  );
};

export default RootLayout;
