import type { Metadata, Viewport } from "next";
import { Manrope, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
// import DiscountModal from "@/components/DiscountModal"; // Desactivado: popup de bienvenida/descuento al cargar
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "react-hot-toast";
import SiteFooter from "@/components/SiteFooter";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getSiteUrl } from "@/app/lib/site-url";

// Sans para textos + geométrica gruesa para la marca y títulos
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
// Serif de acento: solo para la palabra LINGERIE de la marca (contraste con SOFT)
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600"], variable: "--font-accent-serif", display: "swap" });

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
  // Pantalla fija en el celular: sin zoom con dos dedos ni el zoom automático al tocar un campo
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body 
        className={`${manrope.variable} ${outfit.variable} ${playfair.variable} antialiased bg-[#fdf8f6] text-[#4a1d44]`}
        suppressHydrationWarning={true}
      >
        <CartProvider>
          <GoogleAnalytics />
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
