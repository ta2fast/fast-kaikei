-- ============================================================
-- F.A.S.T. 請求書管理 - DB マイグレーション
-- ============================================================

-- 1. invoices テーブル（請求書ヘッダー）
CREATE TABLE IF NOT EXISTS public.invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  issue_date    date NOT NULL,
  due_date      date NOT NULL,
  recipient_name text NOT NULL,
  title         text NOT NULL,
  total_amount  integer NOT NULL DEFAULT 0,
  tax_amount    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'issued', 'paid')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. invoice_items テーブル（請求明細）
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_description text NOT NULL,
  quantity         integer NOT NULL DEFAULT 1,
  unit             text NOT NULL DEFAULT '式',
  unit_price       integer NOT NULL DEFAULT 0,
  amount           integer NOT NULL DEFAULT 0
);

-- 3. updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. 請求書番号自動採番ファンクション
--    形式: FAST-YYYYMM-NNN (同月内の連番)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year integer, p_month integer)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_seq    integer;
BEGIN
  v_prefix := 'FAST-' || p_year::text || LPAD(p_month::text, 2, '0');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS integer)), 0) + 1
    INTO v_seq
    FROM public.invoices
   WHERE invoice_number LIKE v_prefix || '-%';
  RETURN v_prefix || '-' || LPAD(v_seq::text, 3, '0');
END;
$$;

-- 5. RLS (必要に応じて有効化してください)
-- ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
