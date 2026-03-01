"use client";
// app/componentes/cateroryicon.tsx

import React, { memo, type ComponentProps } from "react";
import {
  Monitor, Shirt, Home, Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
} from "lucide-react";

// Props base de SVG + las props específicas de lucide (size, strokeWidth, etc.)
interface CategoryIconProps extends ComponentProps<"svg"> {
  name: string;
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
}

type IconComponent = (props: Omit<CategoryIconProps, "name">) => React.ReactElement | null;

const ICON_MAP: Record<string, IconComponent> = {
  Monitor, Shirt, Home, Dumbbell, ShoppingBag, Heart, Car, Gift,
  BookOpen, PawPrint, Tag, MapPin, Bell, CheckCircle, Package, Star,
  Search, User, LogOut, Store, ShoppingCart, ChevronDown, ArrowRight,
  Trash2, Pencil, Plus, X,
} as Record<string, IconComponent>;

const CategoryIcon = memo(function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon {...props} />;
});

CategoryIcon.displayName = "CategoryIcon";

export default CategoryIcon;