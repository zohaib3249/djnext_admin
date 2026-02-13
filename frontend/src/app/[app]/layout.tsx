/** Required for output: 'export'. Must match params used by child [model] and [model]/[id]. */
export function generateStaticParams() {
  return [{ app: '_' }];
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
