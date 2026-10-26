import { isValidRoomCode, normalizeRoomCode } from '@jamwave/shared';
import { ImageResponse } from 'next/og';
import { fetchRoomPreview } from '@/lib/preview';

export const alt = 'Join this jam on Jamwave';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(raw);
  const preview = isValidRoomCode(code) ? await fetchRoomPreview(code) : null;
  const headline = preview ? `${preview.hostName} invited you to jam` : 'You are invited to jam';
  const sub = preview?.nowPlaying
    ? `Now playing: ${preview.nowPlaying.title}`
    : 'Same song, same second, anywhere.';

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
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 36, fontWeight: 700 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 44 }}>
          {[18, 44, 30, 50].map((h, i) => (
            <div
              key={i}
              style={{
                width: 11,
                height: h,
                borderRadius: 6,
                background: 'linear-gradient(180deg, #a855f7, #ec4899, #f97316)',
              }}
            />
          ))}
        </div>
        Jamwave
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
          {headline}
        </div>
        <div style={{ fontSize: 30, color: '#a1a1aa' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 26, color: '#a1a1aa' }}>Jam code</div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: 12,
              padding: '8px 24px',
              borderRadius: 16,
              background: '#16161a',
              border: '1px solid #34343e',
            }}
          >
            {code}
          </div>
        </div>
        <div style={{ fontSize: 26, color: '#a1a1aa' }}>Free · no account · listen in sync</div>
      </div>
    </div>,
    size,
  );
}
