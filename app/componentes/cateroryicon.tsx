"use client";
// app/componentes/cateroryicon.tsx
import React, { memo } from "react";
import {
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
  type LucideProps,
} from "lucide-react";

// Tus 3 webp que están en app/componentes/icons/
import HomeWebp from "./icons/Home.png";
import ShirtWebp from "./icons/Shirt.png";
import MonitorWebp from "./icons/Monitor.png";

type LucideIcon = React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

interface CategoryIconProps {
  name: string;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const LUCIDE_ICONS = {
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
} as const satisfies Record<string, LucideIcon>;

const CUSTOM_ICONS = {
  Home: HomeWebp,
  Shirt: ShirtWebp,
  Monitor: MonitorWebp,
} as const;

const WebpIcon = ({ src, size = 24, style }: { src: { src: string }; size?: number | string; style?: React.CSSProperties }) => (
  <img
    src={src.src}
    alt=""
    width={Number(size)}
    height={Number(size)}
    style={{ objectFit: "contain", display: "block", flexShrink: 0, ...style }}
  />
);

const CategoryIcon = memo(function CategoryIcon({ name, size = 24, style, ...props }: CategoryIconProps) {
  if (name in CUSTOM_ICONS) {
    const src = CUSTOM_ICONS[name as keyof typeof CUSTOM_ICONS];
    return <WebpIcon src={src as { src: string }} size={size} style={style} />;
  }

  const LucideComp = LUCIDE_ICONS[name as keyof typeof LUCIDE_ICONS] ?? Package;
  return <LucideComp size={Number(size)} style={style} {...props} />;
});

CategoryIcon.displayName = "CategoryIcon";
export default CategoryIcon;
