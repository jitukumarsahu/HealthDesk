import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ReduxProvider } from '../redux/provider';
import { ClientWrapper } from '../components/ClientWrapper';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'HealthDesk - Secure Patient & Clinical Consultation Platform',
  description: 'Book and manage patient appointments, record prescriptions securely, track medical record access, and enable real-time notifications with role-based clinical access.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ReduxProvider>
          <ClientWrapper>{children}</ClientWrapper>
        </ReduxProvider>
      </body>
    </html>
  );
}

