import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'DJNext Admin',
  description: 'Django Admin API – Modern frontend',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('djnext-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');})();`,
          }}
        />
        {/* User customization: add public/djnext-custom.css to override styles */}
        {/* Relative so it works under any Django mount (e.g. /admin/djnext-custom.css) */}
        <link rel="stylesheet" href="djnext-custom.css" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
