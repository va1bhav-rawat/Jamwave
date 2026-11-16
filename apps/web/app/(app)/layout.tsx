import { Footer } from '@/components/marketing/Footer';
import { Header } from '@/components/marketing/Header';

/** Signed-in area and public profiles: same chrome as the landing page, narrower content. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <Footer />
    </>
  );
}
