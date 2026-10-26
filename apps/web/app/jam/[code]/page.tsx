import { isValidRoomCode, normalizeRoomCode } from '@jamwave/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { RoomClient } from '@/components/room/RoomClient';
import { fetchRoomPreview } from '@/lib/preview';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: raw } = await params;
  const code = normalizeRoomCode(raw);
  if (!isValidRoomCode(code)) return { title: 'Jam not found' };
  const preview = await fetchRoomPreview(code);
  const title = preview ? `${preview.hostName} invited you to ${preview.name}` : `Join jam ${code}`;
  const description = preview?.nowPlaying
    ? `Now playing: ${preview.nowPlaying.title}. Join with code ${code} and listen in sync — free, no account needed.`
    : `Join with code ${code} and listen together in sync — free, no account needed.`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function JamPage({ params }: Props) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(raw);
  if (!isValidRoomCode(code)) notFound();
  if (code !== raw) redirect(`/jam/${code}`);
  return <RoomClient code={code} />;
}
