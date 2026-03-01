// lib/db.ts - Simulated database (replace with real DB like Supabase, MongoDB, etc.)

export interface Category {
  id: string;
  name: string;
  iconName: string; // nombre exacto del icono en lucide-react
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category: string;
  businessId: string;
  businessName: string;
  rating: number;
  reviews: number;
  stock: number;
  lat?: number;
  lng?: number;
  city: string;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  rating: number;
  totalProducts: number;
  city: string;
  lat: number;
  lng: number;
  verified: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: 'user' | 'seller' | 'admin';
  businessId?: string;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  lat?: number;
  lng?: number;
  createdAt: string;
}



export const categories: Category[] = [
  { id: '1',  name: 'Electrónica',     iconName: 'Monitor',      slug: 'electronica'    },
  { id: '2',  name: 'Ropa y Moda',     iconName: 'Shirt',        slug: 'ropa-moda'      },
  { id: '3',  name: 'Hogar',           iconName: 'Home',         slug: 'hogar'          },
  { id: '4',  name: 'Deportes',        iconName: 'Dumbbell',     slug: 'deportes'       },
  { id: '5',  name: 'Alimentos',       iconName: 'ShoppingBag',  slug: 'alimentos'      },
  { id: '6',  name: 'Salud y Belleza', iconName: 'Heart',        slug: 'salud-belleza'  },
  { id: '7',  name: 'Automotriz',      iconName: 'Car',          slug: 'automotriz'     },
  { id: '8',  name: 'Juguetes',        iconName: 'Gift',         slug: 'juguetes'       },
  { id: '9',  name: 'Libros',          iconName: 'BookOpen',     slug: 'libros'         },
  { id: '10', name: 'Mascotas',        iconName: 'PawPrint',     slug: 'mascotas'       },
];

// ── BUSINESSES ────────────────────────────────────────────────────────────────
export const businesses: Business[] = [
  {
    id: 'b1',
    name: 'TechStore Pro',
    description: 'Los mejores productos de tecnología al mejor precio.',
    logo: 'https://ui-avatars.com/api/?name=TechStore+Pro&background=3b82f6&color=fff&size=80',
    category: 'electronica',
    rating: 4.8,
    totalProducts: 120,
    city: 'Buenos Aires',
    lat: -34.6037,
    lng: -58.3816,
    verified: true,
  },
  {
    id: 'b2',
    name: 'Fashion World',
    description: 'Moda para todos los gustos y ocasiones.',
    logo: 'https://ui-avatars.com/api/?name=Fashion+World&background=ec4899&color=fff&size=80',
    category: 'ropa-moda',
    rating: 4.5,
    totalProducts: 85,
    city: 'Córdoba',
    lat: -31.4201,
    lng: -64.1888,
    verified: true,
  },
  {
    id: 'b3',
    name: 'Hogar & Deco',
    description: 'Todo para decorar tu hogar con estilo.',
    logo: 'https://ui-avatars.com/api/?name=Hogar+Deco&background=10b981&color=fff&size=80',
    category: 'hogar',
    rating: 4.3,
    totalProducts: 60,
    city: 'Rosario',
    lat: -32.9468,
    lng: -60.6393,
    verified: false,
  },
  {
    id: 'b4',
    name: 'Sport Zone',
    description: 'Equipamiento deportivo para profesionales y aficionados.',
    logo: 'https://ui-avatars.com/api/?name=Sport+Zone&background=f59e0b&color=fff&size=80',
    category: 'deportes',
    rating: 4.6,
    totalProducts: 95,
    city: 'Mendoza',
    lat: -32.8895,
    lng: -68.8458,
    verified: true,
  },
  {
    id: 'b5',
    name: 'Gourmet Express',
    description: 'Productos gourmet y artesanales de todo el país.',
    logo: 'https://ui-avatars.com/api/?name=Gourmet+Express&background=ef4444&color=fff&size=80',
    category: 'alimentos',
    rating: 4.7,
    totalProducts: 45,
    city: 'Buenos Aires',
    lat: -34.5995,
    lng: -58.3738,
    verified: true,
  },
];

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export const products: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Gaming RTX 4060',
    description: 'Laptop gaming con RTX 4060, 16GB RAM, 512GB SSD',
    price: 1299.99, originalPrice: 1599.99, discount: 19,
    image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=300&fit=crop',
    category: 'electronica', businessId: 'b1', businessName: 'TechStore Pro',
    rating: 4.8, reviews: 234, stock: 15, city: 'Buenos Aires', lat: -34.6037, lng: -58.3816,
  },
  {
    id: 'p2',
    name: 'iPhone 15 Pro Max',
    description: 'El último iPhone con chip A17 Pro, cámara 48MP',
    price: 1099.00, originalPrice: 1199.00, discount: 8,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop',
    category: 'electronica', businessId: 'b1', businessName: 'TechStore Pro',
    rating: 4.9, reviews: 512, stock: 8, city: 'Buenos Aires', lat: -34.6037, lng: -58.3816,
  },
  {
    id: 'p3',
    name: 'Vestido Floral Premium',
    description: 'Vestido floral de temporada, telas importadas',
    price: 89.99, originalPrice: 149.99, discount: 40,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=300&fit=crop',
    category: 'ropa-moda', businessId: 'b2', businessName: 'Fashion World',
    rating: 4.5, reviews: 89, stock: 30, city: 'Córdoba', lat: -31.4201, lng: -64.1888,
  },
  {
    id: 'p4',
    name: 'Zapatillas Running Pro',
    description: 'Zapatillas de running con tecnología amortiguación',
    price: 129.99, originalPrice: 179.99, discount: 28,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
    category: 'deportes', businessId: 'b4', businessName: 'Sport Zone',
    rating: 4.7, reviews: 156, stock: 22, city: 'Mendoza', lat: -32.8895, lng: -68.8458,
  },
  {
    id: 'p5',
    name: 'Smart TV 65" OLED 4K',
    description: 'Televisor OLED 65 pulgadas, Dolby Vision, WebOS',
    price: 799.00, originalPrice: 999.00, discount: 20,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834b?w=400&h=300&fit=crop',
    category: 'electronica', businessId: 'b1', businessName: 'TechStore Pro',
    rating: 4.6, reviews: 178, stock: 5, city: 'Buenos Aires', lat: -34.6037, lng: -58.3816,
  },
  {
    id: 'p6',
    name: 'Sillón Ergonómico Premium',
    description: 'Sillón de oficina ergonómico, lumbar ajustable',
    price: 299.00, originalPrice: 399.00, discount: 25,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
    category: 'hogar', businessId: 'b3', businessName: 'Hogar & Deco',
    rating: 4.4, reviews: 67, stock: 12, city: 'Rosario', lat: -32.9468, lng: -60.6393,
  },
  {
    id: 'p7',
    name: 'Bicicleta Montaña Carbon',
    description: 'Bicicleta de montaña carbono, 21 velocidades',
    price: 899.00, originalPrice: 1200.00, discount: 25,
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&h=300&fit=crop',
    category: 'deportes', businessId: 'b4', businessName: 'Sport Zone',
    rating: 4.8, reviews: 203, stock: 7, city: 'Mendoza', lat: -32.8895, lng: -68.8458,
  },
  {
    id: 'p8',
    name: 'Caja de Quesos Artesanales',
    description: 'Selección de 6 quesos artesanales de origen argentino',
    price: 49.99, originalPrice: 65.00, discount: 23,
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop',
    category: 'alimentos', businessId: 'b5', businessName: 'Gourmet Express',
    rating: 4.9, reviews: 412, stock: 50, city: 'Buenos Aires', lat: -34.5995, lng: -58.3738,
  },
  {
    id: 'p9',
    name: 'Auriculares Sony WH-1000XM5',
    description: 'Auriculares noise-cancelling premium, 30h batería',
    price: 349.00, originalPrice: 449.00, discount: 22,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    category: 'electronica', businessId: 'b1', businessName: 'TechStore Pro',
    rating: 4.7, reviews: 289, stock: 18, city: 'Buenos Aires', lat: -34.6037, lng: -58.3816,
  },
  {
    id: 'p10',
    name: 'Campera de Cuero Premium',
    description: 'Campera de cuero genuino, forro interior suave',
    price: 199.00, originalPrice: 299.00, discount: 33,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop',
    category: 'ropa-moda', businessId: 'b2', businessName: 'Fashion World',
    rating: 4.6, reviews: 134, stock: 20, city: 'Córdoba', lat: -31.4201, lng: -64.1888,
  },
  {
    id: 'p11',
    name: 'Set Yoga Completo',
    description: 'Mat, bloques, correa y bolsa. Todo para tu práctica.',
    price: 79.00, originalPrice: 120.00, discount: 34,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
    category: 'deportes', businessId: 'b4', businessName: 'Sport Zone',
    rating: 4.5, reviews: 98, stock: 40, city: 'Mendoza', lat: -32.8895, lng: -68.8458,
  },
  {
    id: 'p12',
    name: 'Lámpara Nórdica LED',
    description: 'Lámpara de pie estilo nórdico, luz cálida ajustable',
    price: 89.00, originalPrice: 129.00, discount: 31,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop',
    category: 'hogar', businessId: 'b3', businessName: 'Hogar & Deco',
    rating: 4.3, reviews: 54, stock: 25, city: 'Rosario', lat: -32.9468, lng: -60.6393,
  },
];

// ── API FUNCTIONS ─────────────────────────────────────────────────────────────
export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p: Product) => p.category === categorySlug);
}

export function getRandomProducts(count: number = 8): Product[] {
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getNearbyProducts(userLat: number, userLng: number, radiusKm: number = 200): Product[] {
  return products.filter((p: Product) => {
    if (!p.lat || !p.lng) return true;
    const dist = getDistanceKm(userLat, userLng, p.lat, p.lng);
    return dist <= radiusKm;
  });
}

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBusinessById(id: string): Business | undefined {
  return businesses.find((b: Business) => b.id === id);
}

export function getProductsByBusiness(businessId: string): Product[] {
  return products.filter((p: Product) => p.businessId === businessId);
}

const usersDB: User[] = [
  {
    id: 'u1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'hashed_password_123',
    role: 'seller',
    businessId: 'b1',
    notificationsEnabled: false,
    locationEnabled: false,
    createdAt: '2024-01-15',
  },
];

export function getUserByEmail(email: string): User | undefined {
  return usersDB.find((u: User) => u.email === email);
}

export interface NewUserData {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'seller' | 'admin';
  avatar?: string;
  businessId?: string;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  lat?: number;
  lng?: number;
}

export function createUser(data: NewUserData): User {
  const newUser: User = {
    ...data,
    id: `u${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
  };
  usersDB.push(newUser);
  return newUser;
}