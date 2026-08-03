-- Run on production DB to add CDEK tracking fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cdek_uuid    TEXT,
  ADD COLUMN IF NOT EXISTS cdek_waybill TEXT,
  ADD COLUMN IF NOT EXISTS cdek_status  TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_cdek_uuid ON orders(cdek_uuid) WHERE cdek_uuid IS NOT NULL;
