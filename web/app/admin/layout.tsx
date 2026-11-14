import type { ReactNode } from 'react';
import './admin.css';

export const metadata = { title: 'Medsci Runner · Content', robots: { index: false } };

/** The only React pages in the project: everything else is the game file, served as-is. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
