import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Engineer Challenge',
  description: 'Frontend for the AI Engineer Challenge',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 