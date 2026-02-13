import { Suspense } from 'react';
import ModelCreatePageClient from './ModelCreatePageClient';

/** Required for output: 'export'. SPA is served by Django for all paths; one placeholder is enough. */
export function generateStaticParams() {
  return [{ app: '_', model: '_' }];
}

export default function ModelCreatePage({
  params,
}: {
  params: Promise<{ app: string; model: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>}>
      <ModelCreatePageClient params={params} />
    </Suspense>
  );
}
