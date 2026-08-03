const CDEK_API = process.env.CDEK_API_URL ?? "https://api.cdek.ru/v2";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getCdekToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.CDEK_CLIENT_ID;
  const clientSecret = process.env.CDEK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("CDEK credentials not configured");
  }

  const res = await fetch(`${CDEK_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CDEK OAuth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.token;
}

export async function cdekRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getCdekToken();
  const url = `${CDEK_API}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CDEK ${method} ${path} -> ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface CdekTariff {
  tariff_code: number;
  tariff_name: string;
  tariff_description: string;
  delivery_mode: number;
  period_min: number;
  period_max: number;
  delivery_sum: number;
}

export async function calculateCdekTariffs(params: {
  fromCityCode: number;
  toCityCode?: number;
  toCityPostal?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
}): Promise<CdekTariff[]> {
  const toLocation: Record<string, unknown> = params.toCityCode
    ? { code: params.toCityCode }
    : { postal_code: params.toCityPostal };

  const result = await cdekRequest<{ tariff_codes?: CdekTariff[] }>(
    "POST",
    "/calculator/tarifflist",
    {
      from_location: { code: params.fromCityCode },
      to_location: toLocation,
      packages: [
        {
          weight: params.weight,
          length: params.length,
          width: params.width,
          height: params.height,
        },
      ],
    },
  );

  return result.tariff_codes ?? [];
}

export interface CdekOrderResult {
  entity: { uuid: string };
  requests: Array<{
    state: string;
    errors?: Array<{ message: string; code: string }>;
  }>;
}

export async function createCdekOrder(params: {
  orderNumber: string;
  tariffCode: number;
  fromCityCode: number;
  toCity: string;
  deliveryPoint?: string;
  toAddress?: string;
  recipientName: string;
  recipientPhone: string;
  weight: number;
  comment?: string;
}): Promise<CdekOrderResult> {
  const body: Record<string, unknown> = {
    tariff_code: params.tariffCode,
    from_location: { code: params.fromCityCode },
    recipient: {
      name: params.recipientName,
      phones: [{ number: params.recipientPhone }],
    },
    packages: [
      {
        number: params.orderNumber,
        weight: params.weight,
        comment: params.comment ?? params.orderNumber,
        items: [],
      },
    ],
    comment: params.comment ?? params.orderNumber,
  };

  if (params.deliveryPoint) {
    body.delivery_point = params.deliveryPoint;
  } else if (params.toAddress) {
    body.to_location = { city: params.toCity, address: params.toAddress };
  }

  return cdekRequest<CdekOrderResult>("POST", "/orders", body);
}

export async function getCdekOrderInfo(uuid: string): Promise<{
  entity?: {
    uuid: string;
    cdek_number: string;
    status: { name: string; code: string };
  };
}> {
  return cdekRequest("GET", `/orders/${uuid}`);
}
