import { query, queryOne, withTransaction } from "@/lib/db";

export type UserAddress = {
  id: string;
  city: string | null;
  address: string | null;
  pickupPointCode: string | null;
  comment: string | null;
  isDefault: boolean;
  createdAt: string;
};

type AddressRow = {
  id: string;
  city: string | null;
  address: string | null;
  pickup_point_code: string | null;
  comment: string | null;
  is_default: boolean;
  created_at: string;
};

function mapRow(row: AddressRow): UserAddress {
  return {
    id: row.id,
    city: row.city,
    address: row.address,
    pickupPointCode: row.pickup_point_code,
    comment: row.comment,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export async function getAddressesByUser(userId: string): Promise<UserAddress[]> {
  const rows = await query<AddressRow>(
    `select id, city, address, pickup_point_code, comment, is_default, created_at
     from user_addresses
     where user_id = $1
     order by is_default desc, created_at desc`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function createAddress(
  userId: string,
  input: { city?: string; address?: string; pickupPointCode?: string; comment?: string; isDefault?: boolean },
): Promise<UserAddress> {
  return withTransaction(async (client) => {
    if (input.isDefault) {
      await client.query(`update user_addresses set is_default = false where user_id = $1`, [userId]);
    }

    const inserted = await client.query<AddressRow>(
      `insert into user_addresses (user_id, city, address, pickup_point_code, comment, is_default)
       values ($1, $2, $3, $4, $5, $6)
       returning id, city, address, pickup_point_code, comment, is_default, created_at`,
      [
        userId,
        input.city ?? null,
        input.address ?? null,
        input.pickupPointCode ?? null,
        input.comment ?? null,
        Boolean(input.isDefault),
      ],
    );

    return mapRow(inserted.rows[0]);
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: { city?: string; address?: string; pickupPointCode?: string; comment?: string; isDefault?: boolean },
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  return withTransaction(async (client) => {
    const owned = await client.query(`select id from user_addresses where id = $1 and user_id = $2`, [
      addressId,
      userId,
    ]);

    if (owned.rowCount === 0) {
      return { ok: false, error: "not-found" as const };
    }

    if (input.isDefault) {
      await client.query(`update user_addresses set is_default = false where user_id = $1`, [userId]);
    }

    await client.query(
      `update user_addresses
       set city = coalesce($1, city),
           address = coalesce($2, address),
           pickup_point_code = coalesce($3, pickup_point_code),
           comment = coalesce($4, comment),
           is_default = coalesce($5, is_default)
       where id = $6`,
      [
        input.city ?? null,
        input.address ?? null,
        input.pickupPointCode ?? null,
        input.comment ?? null,
        input.isDefault ?? null,
        addressId,
      ],
    );

    return { ok: true as const };
  });
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  const deleted = await queryOne(
    `delete from user_addresses where id = $1 and user_id = $2 returning id`,
    [addressId, userId],
  );

  return deleted ? { ok: true } : { ok: false, error: "not-found" };
}
