import React from "react";
import { ThemeProvider } from "../context/ThemeContext";
//@ts-ignore
import "../globals.css";

export const metadata = {
  title: "INITIAL — Report Log Web App",
  description: "ระบบบันทึกปัญหาเทคนิคประจำทีมแข่งรถสูตรไฟฟ้า",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}