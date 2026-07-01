"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import type { AdminProduct } from "@/lib/admin-products";
import { csrfFetch } from "@/lib/csrf-client";

const CATEGORIES = ["pants", "diapers"] as const;
const LINES = ["premium", "ultrathin", "daily"] as const;

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const TEXTAREA_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Props = {
  mode: "create" | "edit";
  product?: AdminProduct;
  locale: Locale;
  onClose: () => void;
  onSaved: (product: AdminProduct) => void;
};

type FormState = {
  slug: string;
  nameRu: string;
  nameEn: string;
  shortRu: string;
  shortEn: string;
  descriptionRu: string;
  descriptionEn: string;
  category: (typeof CATEGORIES)[number];
  line: (typeof LINES)[number];
  size: string;
  count: string;
  price: string;
  oldPrice: string;
  bonusPoints: string;
  stock: string;
  seoTitle: string;
  seoDescription: string;
  isActive: boolean;
};

function initForm(product?: AdminProduct): FormState {
  return {
    slug: product?.slug ?? "",
    nameRu: product?.nameRu ?? "",
    nameEn: product?.nameEn ?? "",
    shortRu: product?.shortRu ?? "",
    shortEn: product?.shortEn ?? "",
    descriptionRu: product?.descriptionRu ?? "",
    descriptionEn: product?.descriptionEn ?? "",
    category: (product?.category as (typeof CATEGORIES)[number]) ?? "diapers",
    line: (product?.line as (typeof LINES)[number]) ?? "daily",
    size: product?.size ?? "",
    count: product ? String(product.count) : "",
    price: product ? String(product.price) : "",
    oldPrice: product?.oldPrice ? String(product.oldPrice) : "",
    bonusPoints: product ? String(product.bonusPoints) : "0",
    stock: product ? String(product.stock) : "0",
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
    isActive: product?.isActive ?? true,
  };
}

export function ProductFormModal({ mode, product, locale, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(product));
  const [currentImages, setCurrentImages] = useState<string[]>(product?.images ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ru = locale === "ru";

  function set(key: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadImage(id: string, file: File): Promise<AdminProduct> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await csrfFetch(`/api/admin/products/${id}/images`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload-failed");
    return (await res.json()).product as AdminProduct;
  }

  async function handleRemoveImage(url: string) {
    if (!product) return;
    const res = await csrfFetch(`/api/admin/products/${product.id}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      setError(ru ? "Не удалось удалить изображение" : "Failed to remove image");
      return;
    }
    const updated: AdminProduct = (await res.json()).product;
    setCurrentImages(updated.images);
    onSaved(updated);
  }

  async function handleSave() {
    setError(null);
    const count = Number(form.count);
    const price = Number(form.price);
    const oldPrice = form.oldPrice.trim() ? Number(form.oldPrice) : undefined;
    const bonusPoints = Number(form.bonusPoints || "0");
    const stock = Number(form.stock || "0");

    if (
      !form.slug.trim() ||
      !form.nameRu.trim() ||
      !form.nameEn.trim() ||
      !form.size.trim() ||
      !Number.isFinite(count) ||
      count <= 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(ru ? "Заполните обязательные поля" : "Fill in required fields");
      return;
    }
    if (!Number.isFinite(bonusPoints) || bonusPoints < 0) {
      setError(ru ? "Некорректное количество бонусов" : "Invalid bonus points");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        slug: form.slug.trim(),
        nameRu: form.nameRu.trim(),
        nameEn: form.nameEn.trim(),
        shortRu: form.shortRu.trim() || undefined,
        shortEn: form.shortEn.trim() || undefined,
        descriptionRu: form.descriptionRu.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        category: form.category,
        line: form.line,
        size: form.size.trim(),
        count,
        price,
        oldPrice,
        bonusPoints,
        stock,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
      };
      if (mode === "edit") body.isActive = form.isActive;

      const url =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${product!.id}`;
      const res = await csrfFetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(
          d?.error === "slug-taken"
            ? ru
              ? "Такой slug уже занят"
              : "Slug is already taken"
            : ru
              ? "Не удалось сохранить товар"
              : "Failed to save product",
        );
        return;
      }

      let saved: AdminProduct = (await res.json()).product;

      if (newImages.length > 0) {
        setUploadingCount(newImages.length);
        try {
          for (const file of newImages) {
            saved = await uploadImage(saved.id, file);
            setUploadingCount((n) => n - 1);
          }
        } catch {
          setError(
            ru
              ? "Товар сохранён, но не удалось загрузить изображения"
              : "Product saved, but image upload failed",
          );
        }
      }

      onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
      setUploadingCount(0);
    }
  }

  const busy = saving || uploadingCount > 0;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl outline-none">
          <div className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-medium">
              {mode === "create"
                ? ru
                  ? "Новый товар"
                  : "New product"
                : ru
                  ? `Редактировать: ${product!.nameRu}`
                  : `Edit: ${product!.nameEn}`}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 hover:bg-accent" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Slug *</label>
                <Input
                  placeholder="sonkei-pants-xl"
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  disabled={mode === "edit"}
                  className={mode === "edit" ? "cursor-not-allowed opacity-50" : ""}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Размер *" : "Size *"}
                </label>
                <Input
                  placeholder="XL"
                  value={form.size}
                  onChange={(e) => set("size", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Название RU *" : "Name RU *"}
                </label>
                <Input value={form.nameRu} onChange={(e) => set("nameRu", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Название EN *" : "Name EN *"}
                </label>
                <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Краткое описание RU" : "Short desc RU"}
                </label>
                <Input value={form.shortRu} onChange={(e) => set("shortRu", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Краткое описание EN" : "Short desc EN"}
                </label>
                <Input value={form.shortEn} onChange={(e) => set("shortEn", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Описание RU" : "Description RU"}
                </label>
                <textarea
                  rows={4}
                  className={TEXTAREA_CLASS}
                  value={form.descriptionRu}
                  onChange={(e) => set("descriptionRu", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Описание EN" : "Description EN"}
                </label>
                <textarea
                  rows={4}
                  className={TEXTAREA_CLASS}
                  value={form.descriptionEn}
                  onChange={(e) => set("descriptionEn", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Категория *" : "Category *"}
                </label>
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className={SELECT_CLASS}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Линейка *" : "Line *"}
                </label>
                <select
                  value={form.line}
                  onChange={(e) => set("line", e.target.value)}
                  className={SELECT_CLASS}
                >
                  {LINES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Цена *" : "Price *"}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Старая цена" : "Old price"}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.oldPrice}
                  onChange={(e) => set("oldPrice", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "В упаковке *" : "Count *"}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.count}
                  onChange={(e) => set("count", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Остаток" : "Stock"}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {ru ? "Бонусы за покупку" : "Bonus points"}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.bonusPoints}
                  onChange={(e) => set("bonusPoints", e.target.value)}
                />
              </div>
              {mode === "edit" && (
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set("isActive", e.target.checked)}
                      className="h-4 w-4 accent-[#9b8465]"
                    />
                    {ru ? "Активен в каталоге" : "Active in catalog"}
                  </label>
                </div>
              )}
            </div>

            <details className="rounded-lg border border-border p-4">
              <summary className="cursor-pointer select-none text-sm text-muted-foreground">
                SEO
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">SEO Title</label>
                  <Input
                    value={form.seoTitle}
                    onChange={(e) => set("seoTitle", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    SEO Description
                  </label>
                  <textarea
                    rows={2}
                    className={TEXTAREA_CLASS}
                    value={form.seoDescription}
                    onChange={(e) => set("seoDescription", e.target.value)}
                  />
                </div>
              </div>
            </details>

            <div>
              <label className="mb-2 block text-xs text-muted-foreground">
                {ru ? "Изображения" : "Images"}
              </label>
              {currentImages.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {currentImages.map((url) => (
                    <div
                      key={url}
                      className="group relative h-16 w-16 overflow-hidden rounded-lg bg-secondary"
                    >
                      <Image src={url} alt="" fill sizes="64px" className="object-contain p-1" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(url)}
                        className="absolute inset-0 hidden items-center justify-center bg-black/60 group-hover:flex"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-[#9b8465]">
                <ImagePlus className="h-4 w-4" />
                {newImages.length > 0
                  ? `${newImages.length} ${ru ? "файл(ов) выбрано" : "file(s) selected"}`
                  : ru
                    ? "Добавить изображения"
                    : "Add images"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
                />
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={busy}>
                {busy
                  ? uploadingCount > 0
                    ? ru
                      ? `Загрузка (${uploadingCount})...`
                      : `Uploading (${uploadingCount})...`
                    : ru
                      ? "Сохранение..."
                      : "Saving..."
                  : ru
                    ? "Сохранить"
                    : "Save"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
