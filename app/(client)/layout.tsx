import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ClerkProvider } from "@clerk/nextjs";
// import FloatingChatWidget from "@/components/FloatingChatWidget.";

export const metadata: Metadata = {
  title: {
    template: "%s - QuickCart online store",
    default: "QuickCart online store",
  },
  description: "QuickCart online store, Your one stop shop for all your needs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
        {/* <FloatingChatWidget /> */}
        <Footer />
      </div>
    </ClerkProvider>
  );
}
