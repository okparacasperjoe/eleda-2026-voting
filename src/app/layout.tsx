import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'ELEDA 2026 DIGITAL VOTING ARENA',
  description: 'ONE PARTICIPANT. ONE VOTE. ONE VOICE. Certified, secure, cryptographically anonymous election platform for ELEDA 2026.',
  keywords: ['ELEDA 2026', 'Digital Voting', 'Election Arena', 'Anonymous Voting', 'Decentralized Ballot'],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
