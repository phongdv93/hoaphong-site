export interface SiteSettings {
  companyName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutContent: string;
  facebook: string;
  linkedin: string;
  zalo: string;
  logoUrl: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  published: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  featured: number;
  published: number;
  sortOrder: number;
}

export interface Service {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  features: string;
  published: number;
  sortOrder: number;
}

export interface ContactRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}
