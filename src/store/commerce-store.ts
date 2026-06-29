"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { csrfFetch } from "@/lib/csrf-client";

type CartItem = {
  productId: string;
  quantity: number;
};

type CartResponse = {
  lines: Array<{ productId: string; quantity: number }>;
};

type CommerceState = {
  cart: CartItem[];
  cartLoaded: boolean;
  wishlist: string[];
  wishlistLoaded: boolean;
  promoCode: string;
  useBonus: boolean;
  bonusBalance: number;
  bonusLoaded: boolean;
  loadCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadWishlist: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  loadBonusBalance: () => Promise<void>;
  setPromoCode: (code: string) => void;
  toggleBonus: () => void;
};

function toCartItems(data: CartResponse): CartItem[] {
  return data.lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({ productId: line.productId, quantity: line.quantity }));
}

export const useCommerceStore = create<CommerceState>()(
  persist(
    (set, get) => ({
      cart: [],
      cartLoaded: false,
      wishlist: [],
      wishlistLoaded: false,
      promoCode: "",
      useBonus: false,
      bonusBalance: 0,
      bonusLoaded: false,
      loadCart: async () => {
        try {
          const response = await fetch("/api/cart");
          const data: CartResponse = await response.json();
          set({ cart: toCartItems(data), cartLoaded: true });
        } catch {
          set({ cartLoaded: true });
        }
      },
      addToCart: async (productId, quantity = 1) => {
        const previous = get().cart;
        const existing = previous.find((item) => item.productId === productId);
        const optimistic = existing
          ? previous.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
                : item,
            )
          : [...previous, { productId, quantity }];
        set({ cart: optimistic });

        try {
          const response = await csrfFetch("/api/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, quantity }),
          });
          const data: CartResponse = await response.json();
          set({ cart: toCartItems(data) });
        } catch {
          set({ cart: previous });
        }
      },
      removeFromCart: async (productId) => {
        const previous = get().cart;
        set({ cart: previous.filter((item) => item.productId !== productId) });

        try {
          const response = await csrfFetch(`/api/cart/items/${productId}`, { method: "DELETE" });
          const data: CartResponse = await response.json();
          set({ cart: toCartItems(data) });
        } catch {
          set({ cart: previous });
        }
      },
      setQuantity: async (productId, quantity) => {
        const previous = get().cart;
        const optimistic =
          quantity <= 0
            ? previous.filter((item) => item.productId !== productId)
            : previous.map((item) =>
                item.productId === productId ? { ...item, quantity: Math.min(99, quantity) } : item,
              );
        set({ cart: optimistic });

        try {
          const response = await csrfFetch(`/api/cart/items/${productId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity }),
          });
          const data: CartResponse = await response.json();
          set({ cart: toCartItems(data) });
        } catch {
          set({ cart: previous });
        }
      },
      clearCart: async () => {
        set({ cart: [], promoCode: "", useBonus: false });
        try {
          await csrfFetch("/api/cart/clear", { method: "POST" });
        } catch {
          // best-effort; the next loadCart() call reconciles with the server
        }
      },
      loadWishlist: async () => {
        try {
          const response = await fetch("/api/wishlist");
          const data: { productIds: string[] } = await response.json();
          set({ wishlist: data.productIds, wishlistLoaded: true });
        } catch {
          set({ wishlistLoaded: true });
        }
      },
      toggleWishlist: async (productId) => {
        const previous = get().wishlist;
        const wished = previous.includes(productId);
        set({ wishlist: wished ? previous.filter((id) => id !== productId) : [...previous, productId] });

        try {
          const response = wished
            ? await csrfFetch(`/api/wishlist/items/${productId}`, { method: "DELETE" })
            : await csrfFetch("/api/wishlist/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
              });
          const data: { productIds: string[] } = await response.json();
          set({ wishlist: data.productIds });
        } catch {
          set({ wishlist: previous });
        }
      },
      loadBonusBalance: async () => {
        try {
          const response = await fetch("/api/account/bonuses");
          if (!response.ok) {
            set({ bonusBalance: 0, bonusLoaded: true });
            return;
          }
          const data: { account: { balanceActive: number } | null } = await response.json();
          set({ bonusBalance: data.account?.balanceActive ?? 0, bonusLoaded: true });
        } catch {
          set({ bonusLoaded: true });
        }
      },
      setPromoCode: (promoCode) => set({ promoCode }),
      toggleBonus: () => set((state) => ({ useBonus: !state.useBonus })),
    }),
    {
      name: "sonkei-commerce",
      partialize: (state) => ({
        promoCode: state.promoCode,
        useBonus: state.useBonus,
      }),
    },
  ),
);
