import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Lencería",
  description: "Explora nuestra colección de lencería fina en Valledupar. Conjuntos, bodies, baby dolls y más. Calidad premium con envíos a todo Colombia.",
  keywords: ["catálogo lencería", "conjuntos de encaje", "bodies femeninos", "lencería valledupar", "comprar ropa interior"],
};

export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
