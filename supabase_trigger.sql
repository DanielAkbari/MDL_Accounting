-- Script SQL untuk Supabase SQL Editor
-- Jalankan kode ini di dashboard Supabase -> SQL Editor -> New Query

-- 1. Buat fungsi untuk meng-generate nomor transaksi otomatis
CREATE OR REPLACE FUNCTION assign_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix text;
  max_seq integer := 0;
  next_seq_str text;
  prefix text;
BEGIN
  -- Jalankan logika hanya jika nomor transaksi kosong/null
  IF NEW.transactionnumber IS NULL OR NEW.transactionnumber = '' THEN
    
    -- Tentukan prefix berdasarkan jenis transaksi
    IF NEW.id LIKE 'JU-%' OR NEW.description LIKE '[Jurnal Umum]%' THEN
      prefix := 'JU';
    ELSIF NEW.type = 'Income' THEN
      prefix := 'BKM';
    ELSE
      prefix := 'BKK';
    END IF;

    -- Format prefix tanggal: "PREFIX.TAHUN.BULAN." (Contoh: "BKM.2026.06.")
    date_prefix := prefix || '.' || to_char(NEW.date::date, 'YYYY.MM') || '.';

    -- Ambil nomor urut tertinggi pada bulan dan prefix tersebut
    SELECT COALESCE(
      MAX(CAST(split_part(transactionnumber, '.', 4) AS integer)), 
      0
    ) INTO max_seq
    FROM transactions
    WHERE transactionnumber LIKE date_prefix || '%';

    -- Tambah 1 dan format dengan padding 5 digit (Contoh: 00001)
    next_seq_str := lpad((max_seq + 1)::text, 5, '0');

    -- Terapkan nomor transaksi yang dihasilkan ke baris baru
    NEW.transactionnumber := date_prefix || next_seq_str;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Buat trigger sebelum INSERT pada tabel transactions
DROP TRIGGER IF EXISTS trigger_assign_transaction_number ON transactions;
CREATE TRIGGER trigger_assign_transaction_number
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION assign_transaction_number();
