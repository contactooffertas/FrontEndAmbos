// components/MainLayout.tsx
import Navbar from './navbar';
import Footer from './footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}