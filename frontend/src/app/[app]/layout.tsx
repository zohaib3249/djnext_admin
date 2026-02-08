/**
 * Layout for [app] segment. Exports generateStaticParams so static export
 * (output: 'export') can pre-render at least one path. All real routes are
 * client-rendered; this only satisfies the build.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
