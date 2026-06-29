import { queryOne, withTransaction } from "@/lib/db";

export type StoreSettings = {
  bonusLoyaltyRates: { silk: number; calm: number; sora: number };
  loyaltyThresholds: { calm: number; sora: number };
  bonusMaxSpendShare: number;
  bonusExpiryDays: number;
  bonusPendingFallbackDays: number;
  ndsRate: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  bonusLoyaltyRates: { silk: 3, calm: 5, sora: 7 },
  loyaltyThresholds: { calm: 10000, sora: 30000 },
  bonusMaxSpendShare: 0.2,
  bonusExpiryDays: 365,
  bonusPendingFallbackDays: 14,
  ndsRate: 20,
};

const SETTINGS_KEY = "store_settings";

export async function getSettings(): Promise<StoreSettings> {
  const row = await queryOne<{ value: Partial<StoreSettings> }>(
    `select value from settings where key = $1`,
    [SETTINGS_KEY],
  );

  if (!row) return DEFAULT_SETTINGS;

  return {
    ...DEFAULT_SETTINGS,
    ...row.value,
    bonusLoyaltyRates: {
      ...DEFAULT_SETTINGS.bonusLoyaltyRates,
      ...row.value.bonusLoyaltyRates,
    },
    loyaltyThresholds: {
      ...DEFAULT_SETTINGS.loyaltyThresholds,
      ...row.value.loyaltyThresholds,
    },
  };
}

export async function updateSettings(
  adminId: string,
  patch: Partial<Omit<StoreSettings, "bonusLoyaltyRates" | "loyaltyThresholds">> & {
    bonusLoyaltyRates?: Partial<StoreSettings["bonusLoyaltyRates"]>;
    loyaltyThresholds?: Partial<StoreSettings["loyaltyThresholds"]>;
  },
): Promise<StoreSettings> {
  const current = await getSettings();
  const next: StoreSettings = {
    ...current,
    ...patch,
    bonusLoyaltyRates: { ...current.bonusLoyaltyRates, ...patch.bonusLoyaltyRates },
    loyaltyThresholds: { ...current.loyaltyThresholds, ...patch.loyaltyThresholds },
  };

  await withTransaction(async (client) => {
    await client.query(
      `insert into settings (key, value, updated_at)
       values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [SETTINGS_KEY, JSON.stringify(next)],
    );

    await client.query(
      `insert into audit_logs (admin_id, action, entity, payload)
       values ($1, 'settings.update', 'settings', $2)`,
      [adminId, JSON.stringify(patch)],
    );
  });

  return next;
}
