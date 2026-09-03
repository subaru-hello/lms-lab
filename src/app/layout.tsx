import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'lms-lab',
  description: '買った人にだけ、期限つきで、動画を見せる',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", sans-serif',
          lineHeight: 1.7,
        }}
      >
        {children}
      </body>
    </html>
  );
}
