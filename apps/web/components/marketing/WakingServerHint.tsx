/**
 * Shown while a connect is taking longer than one attempt. Free hosting puts an idle server to
 * sleep; being honest about the wait beats a spinner that looks broken.
 */
export function WakingServerHint({ attempts }: { attempts: number }) {
  if (attempts < 1) return null;
  return (
    <p className="text-center text-xs text-fg-subtle" role="status">
      Still connecting… the server may be waking up from a nap. This can take up to a minute.
    </p>
  );
}
