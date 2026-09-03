import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://quake-quest-detective.hally4815162342.chatgpt.site'),
  title: 'Quake Quest — Earthquake Detective',
  description: 'Follow seismic clues, place your guess, and reveal the hidden earthquake.',
  openGraph: {
    title: 'Quake Quest — Earthquake Detective',
    description: 'Use real BGS earthquake coordinates to solve live UK earthquake mysteries.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quake Quest — Earthquake Detective',
    description: 'Use real BGS earthquake coordinates to solve live UK earthquake mysteries.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
