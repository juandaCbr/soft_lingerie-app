import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DiscountModal from "@/components/DiscountModal";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: {
    default: "Soft Lingerie | Lencería Valledupar y Boutique Online",
    template: "%s | Soft Lingerie"
  },
  description: "La mejor lencería en Valledupar. Boutique online con conjuntos exclusivos, bodies y seducción. Envíos seguros a todo Colombia. Resalta tu belleza con Soft.",
  keywords: ["lencería valledupar", "lencería colombia", "ropa interior femenina", "soft lingerie boutique", "comprar lencería online"],
  openGraph: {
    title: "Soft Lingerie | Lencería Valledupar",
    description: "Elegancia y seducción en cada prenda. Envíos nacionales.",
    url: "https://soft-lingerie-app.vercel.app",
    siteName: "Soft Lingerie",
    images: [
      {
        url: "https://soft-lingerie-app.vercel.app/home.jpg",
        width: 1200,
        height: 630,
        alt: "Soft Lingerie Boutique",
      },
    ],
    locale: "es_CO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
          <DiscountModal />
          
          {/* AJUSTE GLOBAL: 
              pt-16 (para móviles) y md:pt-20 (para desktop) 
              Esto evita que el Navbar tape el contenido de cualquier página.
          */}
          <div className="min-h-screen w-full overflow-x-hidden pt-16 md:pt-20">
            {children}
          </div>

          <footer className="bg-[#4a1d44] text-white py-12 mt-20">
            <div className="max-w-7xl mx-auto px-6 text-center md:text-left grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <h3 className="font-playfair text-xl font-bold mb-4 tracking-widest uppercase">Soft Lingerie</h3>
                <p className="text-white/60 text-sm italic">Resaltando tu belleza con la mejor calidad.</p>
              </div>
              <div>
                <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-white/40">Menú</h4>
                <ul className="text-sm space-y-2">
                  <li><a href="/" className="hover:underline">Inicio</a></li>
                  <li><a href="/productos" className="hover:underline">Catálogo</a></li>
                  <li><a href="/contacto" className="hover:underline">Contacto</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-white/40">Soporte</h4>
                <p className="text-sm text-white/60">Pagos seguros con PSE, Nequi y Bancolombia.</p>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}