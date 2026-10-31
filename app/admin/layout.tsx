/**
 * Solo estilo: el panel admin usa la misma tipografía de la tienda (Outfit).
 * No agrega lógica; la protección de /admin sigue en proxy.ts.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-display">{children}</div>;
}
