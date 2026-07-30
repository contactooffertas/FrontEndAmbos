"use client";
// app/componentes/cateroryicon.tsx
import React, { memo, type ComponentProps } from "react";
import {
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
} from "lucide-react";

interface CategoryIconProps extends ComponentProps<"svg"> {
  name: string;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
}

type IconComponent = (props: any) => React.ReactElement | null;

// Tu icono custom que pesa igual que lucide
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

const ICON_MAP: Record<string, IconComponent> = {
  // Lucide que quedan
  Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,

  // REEMPLAZOS - ahora apuntan a tus webp
  Home: (p) => <ImgIcon src="/icons/Home.webp" {...p} />,
  Shirt: (p) => <ImgIcon src="/icons/Shirt.webp" {...p} />,
  Monitor: (p) => <ImgIcon src="/icons/Monitor.webp" {...p} />,
};

const CategoryIcon = memo(function CategoryIcon({ name,...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name]?? Package;
  return <Icon {...props} />;
});

CategoryIcon.displayName = "CategoryIcon";
export default CategoryIcon;
