import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Cadence — someone to talk to',
  description: 'A fictional, browser-only Cadence product demo.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={archivo.className}>{children}</body></html>;
}
