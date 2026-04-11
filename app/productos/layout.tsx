/**
 * Sin metadata aquí: el SEO del listado vive solo en productos/page.tsx para no mezclar
 * títulos/descripciones con el layout raíz y duplicar snippets en resultados de búsqueda.
 */
export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
