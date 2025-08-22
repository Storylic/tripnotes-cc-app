// app/layout.tsx
// Root layout for TripNotes CC

import type { Metadata } from 'next';
import { Inter, Crimson_Pro, Kalam } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const crimsonPro = Crimson_Pro({ 
  subsets: ['latin'],
  variable: '--font-crimson',
});

const kalam = Kalam({ 
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-kalam',
});

export const metadata: Metadata = {
  title: 'TripNotes CC - Creator-Curated Travel Plans',
  description: 'Buy personalized trip plans from expert creators. AI-powered customization for your perfect journey.',
  keywords: 'travel, trip planning, curated trips, travel guides, personalized travel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable} ${kalam.variable}`}>
      <body>{children}</body>
    </html>
  );
}
