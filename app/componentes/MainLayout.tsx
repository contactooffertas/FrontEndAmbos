// components/MainLayout.tsx
import Navbar from './navbar';
import Footer from './footer';
import SellerOnboardingBanner from './SellerOnboardingBanner';
import SellerSessionSync from './SellerSessionSync';
import AndroidDownloadButton from './AndroidDownloadButton';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SellerSessionSync />
      <Navbar />
      <AndroidDownloadButton />
      <main>
        <SellerOnboardingBanner />
        {children}
      </main>
      <Footer />
    </>
  );
}
