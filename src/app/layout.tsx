import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'roomforge',
  description: 'Floor plan editor: draw walls in 2D, see them in 3D.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
