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
        {/* Providers are "use client" — Auth0Provider must render client-side for profileRoute to reach the SDK (see Providers.js) */}
        <Providers>{children}</Providers>
        </body>
        </html>
    );
}
