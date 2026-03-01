"use client";
// app/context/Providers.tsx
// Wrapper de todos los providers del lado cliente.
// Se importa desde layout.tsx (que es Server Component).

import { AuthProvider } from "./authContext";
import { CartProvider }  from "./cartContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}