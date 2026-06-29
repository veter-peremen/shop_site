"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCommerceStore } from "@/store/commerce-store";

export function AddToCartButton({
  productId,
  className,
  variant = "default",
}: {
  productId: string;
  className?: string;
  variant?: "default" | "secondary" | "bronze";
}) {
  const t = useTranslations("product");
  const addToCart = useCommerceStore((state) => state.addToCart);

  return (
    <Button className={className} variant={variant} onClick={() => addToCart(productId)}>
      <ShoppingBag className="h-4 w-4" />
      {t("quickAdd")}
    </Button>
  );
}
