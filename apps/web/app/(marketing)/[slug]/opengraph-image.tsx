import { ImageResponse } from 'next/og';
import { contentPages, getPage } from '@/content/pages';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return contentPages.map((page) => ({ slug: page.slug }));
}

/** The root share image with the page's headline, so every guide has its own card. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = getPage((await params).slug);
  const headline = page?.h1 ?? 'Listen together. For free.';
  const sub = page?.description ?? 'Same song, same second, anywhere.';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(135deg, #0b0b10 0%, #17111f 60%, #1f1017 100%)',
        color: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 56 }}>
          {[24, 56, 40, 64].map((h, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: h,
                borderRadius: 7,
                background: 'linear-gradient(180deg, #a855f7, #ec4899, #f97316)',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Jamwave</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div
          style={{
            fontSize: headline.length > 48 ? 58 : 72,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {headline}
        </div>
        <div style={{ fontSize: 28, color: '#a1a1aa', lineHeight: 1.3 }}>{sub}</div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 8,
            fontSize: 22,
            color: '#fafafa',
          }}
        >
          {['Free', 'No app', 'No account to join', 'Same second'].map((pill) => (
            <div
              key={pill}
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                border: '1px solid #34343e',
                background: '#16161a',
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
