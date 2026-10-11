CREATE OR REPLACE FUNCTION public_car_history(p_public_token text)
RETURNS json AS $BODY
DECLARE
  v_vehicle json;
  v_jobs json;
  v_settings json;
BEGIN
  SELECT json_build_object(
    'make', v.make,
    'model', v.model,
    'year', v.year,
    'number_plate', v.number_plate,
    'colour', v.colour,
    'fuel_type', v.fuel_type
  )
  INTO v_vehicle
  FROM vehicles v
  WHERE v.public_token = p_public_token;

  IF v_vehicle IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'job_date', j.job_date,
      'km_reading', j.km_reading,
      'complaint', j.complaint,
      'status', j.status,
      'parts', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'part_name', jp.part_name,
            'part_number', jp.part_number
          )
        ), '[]'::json)
        FROM job_parts jp WHERE jp.job_id = j.id
      ),
      'photos', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'photo_url', p.photo_url,
            'photo_type', p.photo_type
          )
        ), '[]'::json)
        FROM job_photos p WHERE p.job_id = j.id
      )
    )
    ORDER BY j.job_date DESC
  ), '[]'::json)
  INTO v_jobs
  FROM jobs j
  WHERE j.vehicle_id = (SELECT id FROM vehicles WHERE public_token = p_public_token);

  SELECT json_build_object(
    'workshop_name', s.workshop_name,
    'logo_url', s.logo_url,
    'phone', s.phone,
    'address', s.address
  )
  INTO v_settings
  FROM workshop_settings s
  LIMIT 1;

  RETURN json_build_object(
    'found', true,
    'vehicle', v_vehicle,
    'jobs', v_jobs,
    'next_service_date', (SELECT next_service_date FROM vehicles WHERE public_token = p_public_token),
    'next_service_km', (SELECT next_service_km FROM vehicles WHERE public_token = p_public_token),
    'workshop', COALESCE(v_settings, json_build_object('workshop_name', 'German Tech', 'phone', '', 'address', ''))
  );
END;
$BODY LANGUAGE plpgsql SECURITY DEFINER;
