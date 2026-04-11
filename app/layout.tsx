import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
// import DiscountModal from "@/components/DiscountModal"; // Desactivado: popup de bienvenida/descuento al cargar
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import SiteFooter from "@/components/SiteFooter";
import { getSiteUrl } from "@/app/lib/site-url";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Soft Lingerie | Lencería Valledupar y Boutique Online",
    template: "%s | Soft Lingerie"
  },
  description: "La mejor lencería en Valledupar. Boutique online con conjuntos exclusivos, bodies y seducción. Envíos seguros a todo Colombia. Resalta tu belleza con Soft.",
  keywords: ["lencería valledupar", "lencería colombia", "ropa interior femenina", "soft lingerie boutique", "comprar lencería online"],
  openGraph: {
    title: "Soft Lingerie | Lencería Valledupar",
    description: "Elegancia y seducción en cada prenda. Envíos nacionales.",
    url: siteUrl,
    siteName: "Soft Lingerie",
    locale: "es_CO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <Script 
          src="https://checkout.wompi.co/widget.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body 
        className={`${inter.variable} ${playfair.variable} antialiased bg-[#fdf8f6] text-[#4a1d44]`}
        suppressHydrationWarning={true}
      >
        <CartProvider>
          <Toaster position="bottom-right" />
          <Navbar />
          {/* <DiscountModal /> */}
          
          {/* AJUSTE GLOBAL: 
              pt-16 (para móviles) y md:pt-20 (para desktop) 
              Esto evita que el Navbar tape el contenido de cualquier página.
          */}
          <div className="min-h-screen w-full overflow-x-hidden pt-16 md:pt-20">
            {children}
          </div>

          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}