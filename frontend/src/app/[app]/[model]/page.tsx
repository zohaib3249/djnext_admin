import ModelListPageClient from './ModelListPageClient';

/** Required for output: 'export'. SPA is served by Django for all paths; one placeholder is enough. */
export function generateStaticParams() {
  return [{ app: '_', model: '_' }];
}

export default function ModelListPage({
  params,
}: {
  params: Promise<{ app: string; model: string }>;
}) {
  return <ModelListPageClient params={params} />;
}
