/** URL ảnh Unsplash đã kiểm tra HTTP 200 — dùng chung cho web & seed */
function u(photoId: string, w = 800) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&q=80`;
}

export const STOCK_IMAGES = {
  interior: u("photo-1616486338812-3dadae4b4ace", 900),
  kitchen: u("photo-1556911220-bff31c812dba", 900),
  decor: u("photo-1586023492125-27b2c045efd7", 900),
  construction: u("photo-1504307651254-35680f356dfd", 900),
  materials: u("photo-1541888946425-d81bb19240f5", 900),
  electrical: u("photo-1621905251189-08b45d6a269e", 900),
  office: u("photo-1497366216548-37526070297c", 900),
  software: u("photo-1460925895917-afdab827c52f", 900),
  business: u("photo-1454165804606-c3d57bc86b40", 900),
  warehouse: u("photo-1586528116311-ad8dd3c8310d", 900),
  tiles: u("photo-1600607687939-ce8a6c25118c", 900),
  cable: u("photo-1558618666-fcd25c85cd64", 900),
  chart: u("photo-1551288049-bebda4e38f71", 900),
} as const;

/** Fallback khi ảnh ngoài lỗi (picsum ổn định) */
export const IMAGE_FALLBACK =
  "https://picsum.photos/seed/hoaphong-default/1200/800";
