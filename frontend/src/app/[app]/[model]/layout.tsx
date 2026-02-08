/**
 * Layout for [app]/[model]. Exports generateStaticParams so static export
 * can pre-render at least one list path. Other paths work via client-side routing
 * when Django serves the same HTML (SPA-style).
 */
export function generateStaticParams() {
  return [{ app: 'users', model: 'user' }];
}

export default function ModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
