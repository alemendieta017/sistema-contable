import "./globals.css";
import { ThemeProvider } from "../lib/theme-context";
import { SearchProvider } from "../lib/search-context";
import { ModalProvider } from "../lib/modal-context";
import MainLayout from "../components/MainLayout";

export const metadata = {
  title: "Sistema Contable",
  description: "Contabilidad personal y familiar con partida doble"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <SearchProvider>
            <ModalProvider>
              <MainLayout>{children}</MainLayout>
            </ModalProvider>
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
