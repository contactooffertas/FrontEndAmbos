"use client";
// app/componentes/categoryicon.tsx

import React, { memo, type ComponentProps } from "react";
import {
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
} from "lucide-react";

// Props base de lucide
interface CategoryIconProps extends ComponentProps<"svg"> {
  name: string;
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
}

type IconComponent = (props: Omit<CategoryIconProps, "name">) => React.ReactElement | null;

// Componente para tus.webp con el mismo peso que lucide
const WebpIcon = ({ src, size = 24, style,...props }: { src: string; size?: number | string; style?: any }) => (
  <img
    src={src}
    alt=""
    width={Number(size)}
    height={Number(size)}
    style={{ objectFit: 'contain', display: 'inline-block',...style }}
    {...props}
  />
);

const ICON_MAP: Record<string, IconComponent> = {
  // LUCIDE - dejo todos los que usabas menos los 3 que reemplazamos
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,

  // CUSTOM.WEBP - reemplazan a lucide y pesan igual
  Home: (props) => <WebpIcon src="/icons/Home.webp" {...props} />,
  Shirt: (props) => <WebpIcon src="/icons/Shirt.webp" {...props} />,
  Monitor: (props) => <WebpIcon src="/icons/Monitor.webp" {...props} />,

  // Extras que te generé con la misma identidad
  Food: (props) => <WebpIcon src="/icons/Food.webp" {...props} />,
  Spa: (props) => <WebpIcon src="/icons/Spa.webp" {...props} />,
  PcGrowth: (props) => <WebpIcon src="/icons/Monitor.webp" {...props} />,
} as Record<string, IconComponent>;

const CategoryIcon = memo(function CategoryIcon({ name,...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name]?? Package;
  return <Icon {...props} />;
});

CategoryIcon.displayName = "CategoryIcon";
export default CategoryIcon;
