// app/context/Providers.tsx
"use client";
import { AuthProvider } from "./authContext";
import { CartProvider } from "./cartContext";
import { TrackingProvider } from "./TrackingContext"; 

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TrackingProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </TrackingProvider>
    </AuthProvider>
  );
}
