// components/MainLayout.tsx
import Navbar from './navbar';
import Footer from './footer';
import SellerOnboardingBanner from './SellerOnboardingBanner';
import SellerSessionSync from './SellerSessionSync';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SellerSessionSync />
      <Navbar />
      <main>
        <SellerOnboardingBanner />
        {children}
      </main>
      <Footer />
    </>
  );
}
