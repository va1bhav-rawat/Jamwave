'use client';

import { Check, Copy, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { track } from '@/lib/analytics';
import { useRoomStore } from '@/lib/store';
import { useOrigin } from '@/lib/useBrowser';

export function ShareDialog({ children }: { children: ReactNode }) {
  const code = useRoomStore((s) => s.snapshot?.code ?? '');
  const name = useRoomStore((s) => s.snapshot?.settings.name ?? 'a jam');
  const [copied, setCopied] = useState(false);
  const origin = useOrigin();
  const url = `${origin}/jam/${code}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track('invite_shared', { method: 'copy' });
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — long-press the link instead');
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: `Join ${name} on Jamwave`,
        text: `Listen with me — code ${code}`,
        url,
      });
      track('invite_shared', { method: 'share' });
    } catch {
      // user cancelled
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="Invite people"
        description="Anyone with the link or code can join. No account needed."
      >
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-2xl bg-white p-3">
            <QRCodeSVG value={url} size={176} level="M" bgColor="#ffffff" fgColor="#09090b" />
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-fg-subtle">Jam code</div>
            <div className="mt-1 font-mono text-4xl font-semibold tracking-[0.3em]">{code}</div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-fg-muted">{url}</span>
            <Button variant="ghost" size="icon" aria-label="Copy link" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex w-full gap-2">
            <Button className="flex-1" onClick={copy}>
              <Copy className="h-4 w-4" /> Copy link
            </Button>
            {canShare ? (
              <Button variant="secondary" className="flex-1" onClick={share}>
                <Share2 className="h-4 w-4" /> Share…
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
