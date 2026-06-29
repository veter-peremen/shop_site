"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const t = useTranslations("product");
  const image = images[active] || images[0];

  return (
    <div className="space-y-4">
      <div className="premium-panel relative aspect-[4/5] overflow-hidden rounded-lg bg-gradient-to-b from-ivory to-secondary dark:from-secondary dark:to-background">
        {image ? (
          <Image
            src={image}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-contain p-8 transition duration-500 hover:scale-[1.03]"
          />
        ) : null}
        <Button
          variant="icon"
          size="icon"
          onClick={() => setOpen(true)}
          className="absolute right-4 top-4 bg-card/80"
          aria-label={t("fullscreen")}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
        {images.slice(0, 7).map((thumb, index) => (
          <button
            key={thumb}
            onClick={() => setActive(index)}
            className={`focus-ring relative aspect-square overflow-hidden rounded-lg border bg-card transition ${
              active === index ? "border-bronze" : "border-border"
            }`}
            aria-label={`${t("gallery")} ${index + 1}`}
          >
            <Image src={thumb} alt={alt} fill sizes="96px" className="object-contain p-2" />
          </button>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-background/92 backdrop-blur-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed inset-4 z-50 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <Dialog.Title className="sr-only">{alt}</Dialog.Title>
                  {image ? (
                    <Image src={image} alt={alt} fill sizes="100vw" className="object-contain p-4" />
                  ) : null}
                  <Dialog.Close asChild>
                    <button className="focus-ring fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card">
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  );
}
