export type Locale = "ru" | "en";

export type ProductLine = "premium" | "ultrathin" | "daily";
export type ProductCategory = "pants" | "diapers";

export type Product = {
  id: string;
  slug: string;
  sku: string;
  wbId: string;
  barcode: string;
  brand: string;
  category: ProductCategory;
  line: ProductLine;
  stage: number | null;
  size: string;
  weightRange: string;
  count: number;
  nameRu: string;
  nameEn: string;
  shortRu: string;
  shortEn: string;
  descriptionRu: string;
  descriptionEn: string;
  color: string;
  images: string[];
  video: string | null;
  price: number;
  oldPrice: number;
  bonusPoints: number;
  rating: number;
  reviewsCount: number;
  stock: number;
  dimensions: {
    weightKg: number | null;
    heightCm: number | null;
    lengthCm: number | null;
    widthCm: number | null;
  };
  specs: {
    certificateNumber: string;
    certificateUntil: string;
    certificateRegistered: string;
    shelfLife: string;
    origin: string;
    hsCode: string;
    diaperType: string;
    packaging: string;
    packagingForm: string;
    vat: string;
  };
  tags: string[];
};
