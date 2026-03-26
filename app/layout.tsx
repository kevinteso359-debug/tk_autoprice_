import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'eBay IT Repricer',
  description: 'Aggancia le tue inserzioni e aggiorna il prezzo ogni 2 ore.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
