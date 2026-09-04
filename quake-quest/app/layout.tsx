import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://ai-adventure-bi.github.io/ai-adventure-web-tools/quake-quest/'),
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
      <body>{children}</body>
    </html>
  );
}
