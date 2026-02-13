import SPARouterClient from './SPARouterClient';

export function generateStaticParams() {
  return [{ path: [] }];
}

export default function Page() {
  return <SPARouterClient />;
}
