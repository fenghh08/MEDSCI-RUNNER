import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medsci Runner — Study Site',
  description:
    'The website version of Medsci Runner. Questions are served from Postgres and graded on the server, so the answer key stays off the client.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
