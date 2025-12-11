import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenContext API",
  description: "Simple API for AI-powered company context analysis using Google Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
