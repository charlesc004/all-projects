import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import { ui } from '@/components/ui/styles';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Nexus CRM — A clearer view of your business', template: '%s · Nexus CRM' },
  description: 'Your relationships, pipeline, and next opportunity. Together in Nexus CRM.',
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={ui.document}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
