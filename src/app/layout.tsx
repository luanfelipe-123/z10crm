import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'https://z10-crm.vercel.app'),
  title: { default: 'Z10 CRM', template: '%s | Z10 CRM' },
  description: 'Gestão de leads, vendas, WhatsApp e automações em um só lugar.',
  openGraph: { title: 'Z10 CRM', description: 'Gestão de leads, vendas, WhatsApp e automações em um só lugar.', type: 'website', locale: 'pt_BR' },
  twitter: { card: 'summary', title: 'Z10 CRM', description: 'Gestão de leads, vendas, WhatsApp e automações em um só lugar.' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className="h-full antialiased"><body className="min-h-full">{children}</body></html>;
}
