// app/context/Providers.tsx
"use client";
import { AuthProvider } from "./authContext";
import { CartProvider } from "./cartContext";
import { TrackingProvider } from "./TrackingContext";
import GeoPushSync from "../componentes/GeoPushSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GeoPushSync />
      <TrackingProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </TrackingProvider>
    </AuthProvider>
  );
}
