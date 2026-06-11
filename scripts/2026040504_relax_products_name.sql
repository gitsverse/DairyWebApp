-- Relax product name constraint so the app can add custom products (not only milk/ghee).
-- Safe to re-run: drops old/new constraint names then applies one CHECK.
-- Run on a fresh database OR after backup. Drops existing app tables if present.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_format;

ALTER TABLE products ADD CONSTRAINT products_name_format CHECK (
  char_length(trim(name)) >= 1
  AND char_length(trim(name)) <= 64
  AND name = lower(trim(name))






);
