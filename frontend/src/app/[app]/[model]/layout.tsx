/** Required for output: 'export'. Same placeholder as page so build succeeds; Django serves SPA for all paths. */
export function generateStaticParams() {
  return [{ app: '_', model: '_' }];
}

export default function ModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
