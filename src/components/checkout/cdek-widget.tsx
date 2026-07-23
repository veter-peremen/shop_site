"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface CdekSelection {
  type: "office" | "door";
  tariffCode: number;
  tariffName: string;
  price: number;
  periodMin: number;
  periodMax: number;
  city: string;
  address: string;
  pvzCode?: string;
}

interface Props {
  goods: { weight: number; length: number; width: number; height: number }[];
  defaultCity?: string;
  onChoose: (selection: CdekSelection) => void;
  label?: string;
}

export function CdekPickupButton({ goods, defaultCity, onChoose, label }: Props) {
  const widgetRef = useRef<{ open: () => void; destroy?: () => void } | null>(null);
  const [ready, setReady] = useState(false);

  const stableGoods = useRef(goods);
  const stableDefaultCity = useRef(defaultCity);
  const stableOnChoose = useCallback(onChoose, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const yandexKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY;
    if (!yandexKey) return;

    let destroyed = false;

    import("@cdek-it/widget")
      .then((mod) => {
        if (destroyed) return;
        // The widget package exports Widget as default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const WidgetClass = (mod as any).default ?? (mod as any).Widget;
        if (!WidgetClass) return;

        widgetRef.current = new WidgetClass({
          apiKey: yandexKey,
          servicePath: "/api/cdek/proxy",
          defaultLocation: stableDefaultCity.current ?? "Москва",
          lang: "rus",
          currency: "RUB",
          goods: stableGoods.current,
          onChoose(
            type: string,
            tariff: Record<string, unknown> | null,
            target: Record<string, unknown>,
          ) {
            if (!tariff) return;
            stableOnChoose({
              type: type === "door" ? "door" : "office",
              tariffCode: tariff.tariff_code as number,
              tariffName: tariff.tariff_name as string,
              price: tariff.delivery_sum as number,
              periodMin: tariff.period_min as number,
              periodMax: tariff.period_max as number,
              city: (target.city ?? "") as string,
              address: (target.address ?? target.formatted ?? "") as string,
              pvzCode: target.code as string | undefined,
            });
          },
        });
        setReady(true);
      })
      .catch((err) => console.error("CDEK widget load error:", err));

    return () => {
      destroyed = true;
      widgetRef.current?.destroy?.();
    };
  }, [stableOnChoose]);

  const hasKey = Boolean(process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY);

  if (!hasKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Карта пунктов СДЭК не настроена — укажите адрес вручную
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={!ready}
      onClick={() => widgetRef.current?.open()}
    >
      {ready ? (label ?? "Выбрать пункт СДЭК на карте") : "Загрузка виджета..."}
    </Button>
  );
}