import { UserProvider } from '@auth0/nextjs-auth0/client';
import './globals.css';

export const metadata = {
  title: 'Betting Tips Admin',
  description: 'SMS-First Betting Tips Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}