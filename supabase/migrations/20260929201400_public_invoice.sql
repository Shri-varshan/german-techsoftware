CREATE OR REPLACE FUNCTION public_invoice(p_token text)
RETURNS json AS $$
DECLARE
  v_invoice record;
  v_parts json;
  v_labour json;
  v_settings json;
BEGIN
  -- Fetch the invoice and related info
  SELECT 
    i.id,
    i.invoice_number,
    i.subtotal,
    i.discount,
    i.gst_total,
    i.grand_total,
    i.payment_status,
    i.payment_mode,
    i.created_at,
    j.id as job_id,
    j.km_reading,
    v.make,
    v.model,
    v.number_plate,
    c.name as customer_name,
    c.phone as customer_phone,
    c.address as customer_address
  INTO v_invoice
  FROM invoices i
  JOIN jobs j ON i.job_id = j.id
  JOIN vehicles v ON j.vehicle_id = v.id
  JOIN customers c ON v.customer_id = c.id
  WHERE i.signed_link_token = p_token;

  IF v_invoice IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  -- Fetch parts
  SELECT COALESCE(json_agg(
    json_build_object(
      'part_name', jp.part_name,
      'part_number', jp.part_number,
      'quantity', jp.quantity,
      'unit_price', jp.unit_price,
      'gst_percent', jp.gst_percent
    )
  ), '[]'::json)
  INTO v_parts
  FROM job_parts jp
  WHERE jp.job_id = v_invoice.job_id;

  -- Fetch labour
  SELECT COALESCE(json_agg(
    json_build_object(
      'description', jl.description,
      'hours', jl.hours,
      'rate', jl.rate,
      'fixed_amount', jl.fixed_amount
    )
  ), '[]'::json)
  INTO v_labour
  FROM job_labour jl
  WHERE jl.job_id = v_invoice.job_id;

  -- Fetch settings
  SELECT json_build_object(
    'workshop_name', s.workshop_name,
    'logo_url', s.logo_url,
    'phone', s.phone,
    'address', s.address,
    'gstin', s.gstin
  )
  INTO v_settings
  FROM workshop_settings s
  LIMIT 1;

  RETURN json_build_object(
    'found', true,
    'invoice', json_build_object(
      'invoice_number', v_invoice.invoice_number,
      'subtotal', v_invoice.subtotal,
      'discount', v_invoice.discount,
      'gst_total', v_invoice.gst_total,
      'grand_total', v_invoice.grand_total,
      'payment_status', v_invoice.payment_status,
      'payment_mode', v_invoice.payment_mode,
      'created_at', v_invoice.created_at
    ),
    'vehicle', json_build_object(
      'make', v_invoice.make,
      'model', v_invoice.model,
      'number_plate', v_invoice.number_plate,
      'km_reading', v_invoice.km_reading
    ),
    'customer', json_build_object(
      'name', v_invoice.customer_name,
      'phone', v_invoice.customer_phone,
      'address', v_invoice.customer_address
    ),
    'parts', v_parts,
    'labour', v_labour,
    'workshop', COALESCE(v_settings, json_build_object('workshop_name', 'German Tech', 'phone', '', 'address', '', 'gstin', ''))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public_invoice(text) TO anon, authenticated;
