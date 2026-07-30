"use client";
// app/componentes/cateroryicon.tsx
import React, { memo, type ComponentProps } from "react";
import {
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
} from "lucide-react";

// Props que usa tu componente
interface CategoryIconProps {
  name: string;
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Fix: Acepta cualquier cosa que devuelva React (lucide + img)
type AnyIconComponent = React.ComponentType<any>;

const ImgIcon = ({ src, size = 14, style,...rest }: any) => (
  <img
    src={src}
    alt=""
    width={Number(size)}
    height={Number(size)}
    style={{ objectFit: "contain", display: "block", flexShrink: 0,...style }}
    {...rest}
  />
);

const ICON_MAP: Record<string, AnyIconComponent> = {
  // Lucide
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,

  // CUSTOM WEBP - reemplazan a Home, Shirt, Monitor
  Home: (p: any) => <ImgIcon src="/icons/Home.webp" {...p} />,
  Shirt: (p: any) => <ImgIcon src="/icons/Shirt.webp" {...p} />,
  Monitor: (p: any) => <ImgIcon src="/icons/Monitor.webp" {...p} />,
};

const CategoryIcon = memo(function CategoryIcon({ name,...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name]?? Package;
  return <Icon {...props} />;
});

CategoryIcon.displayName = "CategoryIcon";
export default CategoryIcon;
