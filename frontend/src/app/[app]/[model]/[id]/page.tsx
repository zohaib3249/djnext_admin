import DetailPageClient from './DetailPageClient';

/** Required for output: 'export'. SPA is served by Django for all paths; one placeholder is enough. */
export function generateStaticParams() {
  return [{ app: '_', model: '_', id: '_' }];
}

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ app: string; model: string; id: string }>;
}) {
  return <DetailPageClient params={params} />;
}
