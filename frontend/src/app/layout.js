import Providers from "@/components/Providers";
import "./globals.css";

export const metadata = {
    title: "MULTITIPS",
    description: "SMS-First Betting Tips Platform",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body>
        {/*
          Providers is a 'use client' component (see src/components/Providers.js).
          Auth0Provider must run client-side so profileRoute="/api/auth/me"
          reaches the browser SDK. Rendering it directly in this server
          component silently drops the prop.
        */}
        <Providers>{children}</Providers>
        </body>
        </html>
    );
}
