CREATE OR REPLACE FUNCTION process_payment(
  p_transaction_id UUID,
  p_amount        NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx             RECORD;
  v_new_amount_paid NUMERIC;
  v_new_remaining  NUMERIC;
  v_new_status     TEXT;
  v_updated        RECORD;
BEGIN
  -- Lock row first to prevent concurrent writes
  SELECT id, total_amount, amount_paid
  INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transaksi tidak ditemukan');
  END IF;

  v_new_amount_paid := COALESCE(v_tx.amount_paid, 0) + p_amount;
  v_new_remaining   := v_tx.total_amount - v_new_amount_paid;
  v_new_status      := CASE WHEN v_new_remaining <= 0 THEN 'paid' ELSE 'partial' END;

  UPDATE transactions
  SET
    amount_paid       = v_new_amount_paid,
    remaining_balance = GREATEST(v_new_remaining, 0),
    payment_status    = v_new_status
  WHERE id = p_transaction_id
  RETURNING id, amount_paid, remaining_balance, payment_status
  INTO v_updated;

  RETURN json_build_object(
    'success',           true,
    'amount_paid',       v_updated.amount_paid,
    'remaining_balance', v_updated.remaining_balance,
    'payment_status',    v_updated.payment_status
  );
END;
$$;
