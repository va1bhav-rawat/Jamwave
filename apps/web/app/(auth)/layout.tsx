import { Logo } from '@/components/brand/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Logo className="mb-10" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface/50 p-6">
        {children}
      </div>
    </main>
  );
}
