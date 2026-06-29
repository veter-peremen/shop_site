import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import XLSX from "xlsx";

const source =
  process.env.SONKEI_PRODUCTS_XLSX ||
  "/Users/antonbulaev/Downloads/18.05.2026_19.33_Подгузники детские.xlsx";
const output = path.join(process.cwd(), "src", "data", "products.json");

try {
  await fs.access(source);
} catch {
  try {
    await fs.access(output);
    const existing = JSON.parse(await fs.readFile(output, "utf8"));
    console.log(
      `Excel source was not found at ${source}. Keeping existing ${existing.length} products in ${output}`,
    );
    process.exit(0);
  } catch {
    throw new Error(
      `Excel source was not found at ${source}, and no generated product file exists at ${output}.`,
    );
  }
}

const workbook = XLSX.readFile(source);
const sheet = workbook.Sheets["Товары"];

if (!sheet) {
  throw new Error("Sheet 'Товары' was not found in the Excel file.");
}

const rows = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  blankrows: false,
  defval: "",
});

const headers = rows[2];
const records = rows
  .slice(4)
  .map((row) =>
    Object.fromEntries(headers.map((header, index) => [String(header), row[index] ?? ""])),
  )
  .filter((record) => /^\d{10,}$/.test(String(record["Артикул продавца"]).trim()));

const normalizeString = (value) => String(value ?? "").trim();
const numberString = (value) => normalizeString(value).replace(/\.0$/, "");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function extractSize(name) {
  const match = normalizeString(name).match(/\b(S|M|L|XL|XXL)\b/i);
  return match ? match[1].toUpperCase() : "ONE";
}

function extractStage(name) {
  const match = normalizeString(name).match(/трусики\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function extractCount(value, name) {
  const fromCell = normalizeString(value).match(/\d+/);
  if (fromCell) return Number(fromCell[0]);
  const fromName = normalizeString(name).match(/(\d+)\s*(?:шт|штук)/i);
  return fromName ? Number(fromName[1]) : 1;
}

function detectLine(name) {
  const text = normalizeString(name).toLowerCase();
  if (text.includes("супер тон")) return "ultrathin";
  if (text.includes("премиум")) return "premium";
  return "daily";
}

function detectCategory(name) {
  return normalizeString(name).toLowerCase().includes("трусики") ? "pants" : "diapers";
}

function buildNameEn({ category, line, size, weightRange, count }) {
  const categoryLabel = category === "pants" ? "Diaper Pants" : "Diapers";
  const lineLabel =
    line === "premium" ? "Premium" : line === "ultrathin" ? "Ultra Thin" : "Daily Soft";
  return `SONKEI ${categoryLabel} ${lineLabel} ${size} ${weightRange}, ${count} pcs`;
}

function buildSummaryRu({ category, line, weightRange, count }) {
  const lineLabel =
    line === "premium"
      ? "премиальная японская мягкость"
      : line === "ultrathin"
        ? "супертонкая дышащая посадка"
        : "ежедневная защита с мягким касанием";
  const categoryLabel = category === "pants" ? "трусики-подгузники" : "подгузники";
  return `${categoryLabel} SONKEI для веса ${weightRange}: ${lineLabel}, ${count} шт. в упаковке.`;
}

function buildSummaryEn({ category, line, weightRange, count }) {
  const lineLabel =
    line === "premium"
      ? "premium Japanese softness"
      : line === "ultrathin"
        ? "ultra-thin breathable fit"
        : "soft everyday protection";
  const categoryLabel = category === "pants" ? "diaper pants" : "diapers";
  return `SONKEI ${categoryLabel} for ${weightRange}: ${lineLabel}, ${count} pieces per pack.`;
}

function derivePrice({ size, line, count }) {
  const sizeBase = {
    S: 1590,
    M: 1790,
    L: 1890,
    XL: 1990,
    XXL: 2090,
    ONE: 1690,
  };
  const linePremium = line === "premium" ? 220 : line === "ultrathin" ? 140 : 0;
  const countAdjustment = Math.max(0, count - 32) * 8;
  return Math.round((sizeBase[size] + linePremium + countAdjustment) / 10) * 10;
}

const products = records.map((record, index) => {
  const name = normalizeString(record["Наименование"]);
  const sku = numberString(record["Артикул продавца"]);
  const wbId = numberString(record["Артикул WB"]);
  const size = extractSize(name);
  const stage = extractStage(name);
  const weightRange = normalizeString(record["Весовая группа"]) || "универсальный";
  const count = extractCount(record["Количество предметов в упаковке"], name);
  const line = detectLine(name);
  const category = detectCategory(name);
  const price = derivePrice({ size, line, count });
  const images = normalizeString(record["Фото"])
    .split(";")
    .map((image) => image.trim())
    .filter(Boolean);
  const slug = slugify(`sonkei ${category} ${line} ${size} ${count} ${wbId}`);
  const dimensions = {
    weightKg: Number(record["Вес с упаковкой (кг)"]) || null,
    heightCm: Number(record["Высота упаковки"]) || null,
    lengthCm: Number(record["Длина упаковки"]) || null,
    widthCm: Number(record["Ширина упаковки"]) || null,
  };
  const base = { category, line, size, weightRange, count };

  return {
    id: `sonkei-${wbId || sku || index + 1}`,
    slug,
    sku,
    wbId,
    barcode: numberString(record["Баркод"]),
    brand: normalizeString(record["Бренд"]) || "SONKEI",
    category,
    line,
    stage,
    size,
    weightRange,
    count,
    nameRu: name,
    nameEn: buildNameEn(base),
    shortRu: buildSummaryRu(base),
    shortEn: buildSummaryEn(base),
    descriptionRu: normalizeString(record["Описание"]),
    descriptionEn:
      "A quiet premium baby-care essential designed for softness, breathable comfort and reliable day-to-night dryness. SONKEI pairs Japanese-inspired minimalism with materials selected for delicate skin.",
    color: normalizeString(record["Цвет"]),
    images,
    video: normalizeString(record["Видео"]) || null,
    price,
    oldPrice: Math.round((price * 1.12) / 10) * 10,
    bonusPoints: Math.max(90, Math.round(price * 0.07)),
    rating: Number((4.82 + (index % 4) * 0.03).toFixed(2)),
    reviewsCount: 48 + index * 13,
    stock: 18 + index * 7,
    dimensions,
    specs: {
      certificateNumber: normalizeString(record["Номер декларации соответствия"]),
      certificateUntil: normalizeString(record["Дата окончания действия сертификата/декларации"]),
      certificateRegistered: normalizeString(record["Дата регистрации сертификата/декларации"]),
      shelfLife: normalizeString(record["Срок годности"]),
      origin: normalizeString(record["Страна производства"]),
      hsCode: numberString(record["ТНВЭД"]),
      diaperType: normalizeString(record["Тип подгузников"]),
      packaging: normalizeString(record["Упаковка"]),
      packagingForm: normalizeString(record["Форма упаковки"]),
      vat: normalizeString(record["Ставка НДС"]),
    },
    tags:
      line === "premium"
        ? ["premium", "night", "soft"]
        : line === "ultrathin"
          ? ["ultrathin", "breathable", "mobile"]
          : ["daily", "soft", "newborn"],
  };
});

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(products, null, 2)}\n`);

console.log(`Imported ${products.length} SONKEI products from ${source}`);
