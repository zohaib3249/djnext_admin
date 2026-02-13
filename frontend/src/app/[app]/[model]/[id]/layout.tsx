/** Required for output: 'export'. Same placeholder as page so build succeeds; Django serves SPA for all paths. */
export function generateStaticParams() {
  return [{ app: '_', model: '_', id: '_' }];
}

export default function ModelIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
