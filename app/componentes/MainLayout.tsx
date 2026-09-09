// components/MainLayout.tsx
import Navbar from './navbar';
import Footer from './footer';
import SellerOnboardingBanner from './SellerOnboardingBanner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>
        <SellerOnboardingBanner />
        {children}
      </main>
      <Footer />
    </>
  );
}
