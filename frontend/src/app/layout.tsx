import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '../lib/theme-context';
import { SearchProvider } from '../lib/search-context';
import { ModalProvider } from '../lib/modal-context';
import { AuthProvider } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
});

export const metadata = {
  title: 'Sistema Contable',
  description: 'Contabilidad personal y familiar con partida doble',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            <SearchProvider>
              <ModalProvider>
                <MainLayout>{children}</MainLayout>
              </ModalProvider>
            </SearchProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
