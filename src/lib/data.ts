import { query, queryOne } from "./db";
import type { BlogPost, Product, Service } from "./types";

function mapBlog(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    coverImage: row.cover_image as string,
    published: row.published as number,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as string,
    image: row.image as string,
    category: row.category as string,
    featured: row.featured as number,
    published: row.published as number,
    sortOrder: row.sort_order as number,
  };
}

function mapService(row: Record<string, unknown>): Service {
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    icon: row.icon as string,
    features: row.features as string,
    published: row.published as number,
    sortOrder: row.sort_order as number,
  };
}

export async function getPublishedPosts(limit?: number): Promise<BlogPost[]> {
  try {
  const rows = limit
    ? await query("SELECT * FROM blog_posts WHERE published = 1 ORDER BY created_at DESC LIMIT $1", [limit])
    : await query("SELECT * FROM blog_posts WHERE published = 1 ORDER BY created_at DESC");
  return rows.map(mapBlog);
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
  const row = await queryOne("SELECT * FROM blog_posts WHERE slug = $1 AND published = 1", [slug]);
  return row ? mapBlog(row) : null;
  } catch {
    return null;
  }
}

export async function getPublishedProducts(): Promise<Product[]> {
  try {
  const rows = await query("SELECT * FROM products WHERE published = 1 ORDER BY sort_order, id");
  return rows.map(mapProduct);
  } catch {
    return [];
  }
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  try {
  const rows = await query(
    "SELECT * FROM products WHERE published = 1 AND featured = 1 ORDER BY sort_order LIMIT $1",
    [limit]
  );
  return rows.map(mapProduct);
  } catch {
    return [];
  }
}

export async function getPublishedServices(): Promise<Service[]> {
  try {
  const rows = await query("SELECT * FROM services WHERE published = 1 ORDER BY sort_order, id");
  return rows.map(mapService);
  } catch {
    return [];
  }
}

export async function getContactStats() {
  try {
  const newCount = await queryOne<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM contact_requests WHERE status = 'new'"
  );
  const postCount = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM blog_posts");
  const productCount = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM products");
  const serviceCount = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM services");
  return {
    newContacts: newCount?.c ?? 0,
    posts: postCount?.c ?? 0,
    products: productCount?.c ?? 0,
    services: serviceCount?.c ?? 0,
  };
  } catch {
    return { newContacts: 0, posts: 0, products: 0, services: 0 };
  }
}
