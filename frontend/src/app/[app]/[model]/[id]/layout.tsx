/**
 * Layout for [app]/[model]/[id]. Exports generateStaticParams so static export
 * can pre-render at least one detail path.
 */
export function generateStaticParams() {
  return [{ app: 'users', model: 'user', id: '0' }];
}

export default function ModelIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
