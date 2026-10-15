-- Carzen demo seed · part 11 of 11 · apply in order

-- wash_applications: 4 rows
insert into public.wash_applications (id, business_name, owner_name, phone, email, area_id, address, lat, lng, capacity, working_hours, services, documents, status, review_note, business_id, submitted_at, reviewed_at) values
  ('app_1', 'مغسلة النسيم', 'مصطفى عادل', '+201500000000', 'apply1@carzen.demo', 'nasr', 'شارع عباس العقاد، مدينة نصر، القاهرة', 30.0561, 31.3412, 4, '[{"open":"09:00","close":"23:00","closed":false},{"open":"09:00","close":"23:00","closed":false},{"open":"09:00","close":"23:00","closed":false},{"open":"09:00","close":"23:00","closed":false},{"open":"09:00","close":"23:00","closed":false},{"open":"09:00","close":"23:00","closed":false},{"open":"09:00","close":"23:00","closed":false}]'::jsonb, '[{"name":"غسيل خارجي","price":110,"durationMin":20},{"name":"غسيل داخلي وخارجي","price":190,"durationMin":40},{"name":"تلميع بالشمع","price":70,"durationMin":15}]'::jsonb, array['app_1/السجل التجاري.pdf', 'app_1/البطاقة الضريبية.pdf', 'app_1/عقد الإيجار.pdf']::text[], 'pending', null, null, '2026-10-12T08:00:00.000Z', null),
  ('app_2', 'كلين درايف', 'هبة طارق', '+201500000001', 'apply2@carzen.demo', 'nc', 'التسعين الشمالي، التجمع الخامس، القاهرة', 30.0255, 31.4654, 3, '[{"open":"10:00","close":"22:00","closed":false},{"open":"10:00","close":"22:00","closed":false},{"open":"10:00","close":"22:00","closed":false},{"open":"10:00","close":"22:00","closed":false},{"open":"10:00","close":"22:00","closed":false},{"open":"10:00","close":"22:00","closed":true},{"open":"10:00","close":"22:00","closed":false}]'::jsonb, '[{"name":"غسيل خارجي","price":130,"durationMin":20},{"name":"تنظيف عميق (بخار)","price":350,"durationMin":60}]'::jsonb, array['app_2/السجل التجاري.pdf', 'app_2/البطاقة الضريبية.pdf']::text[], 'pending', null, null, '2026-10-13T12:00:00.000Z', null),
  ('app_3', 'واش هاب', 'كريم سمير', '+201500000002', 'apply3@carzen.demo', 'zayed', 'محور ٢٦ يوليو، الشيخ زايد، الجيزة', 30.0412, 30.9881, 5, '[{"open":"08:00","close":"21:00","closed":false},{"open":"08:00","close":"21:00","closed":false},{"open":"08:00","close":"21:00","closed":false},{"open":"08:00","close":"21:00","closed":false},{"open":"08:00","close":"21:00","closed":false},{"open":"08:00","close":"21:00","closed":false},{"open":"08:00","close":"21:00","closed":false}]'::jsonb, '[{"name":"غسيل خارجي","price":95,"durationMin":20},{"name":"غسيل داخلي","price":95,"durationMin":25},{"name":"غسيل داخلي وخارجي","price":170,"durationMin":40}]'::jsonb, array['app_3/السجل التجاري.pdf']::text[], 'pending', null, null, '2026-10-14T06:00:00.000Z', null),
  ('app_4', 'سبيد شاين', 'طارق حمدي', '+201500000003', 'apply4@carzen.demo', 'maadi', 'شارع ٩، المعادي، القاهرة', 29.9598, 31.2577, 2, '[{"open":"09:00","close":"20:00","closed":false},{"open":"09:00","close":"20:00","closed":false},{"open":"09:00","close":"20:00","closed":false},{"open":"09:00","close":"20:00","closed":false},{"open":"09:00","close":"20:00","closed":false},{"open":"09:00","close":"20:00","closed":false},{"open":"09:00","close":"20:00","closed":false}]'::jsonb, '[{"name":"غسيل خارجي","price":100,"durationMin":25}]'::jsonb, array['app_4/السجل التجاري.pdf']::text[], 'needs_changes', 'يرجى رفع صورة البطاقة الضريبية وصور واضحة لمنطقة الغسيل.', null, '2026-10-06T10:00:00.000Z', '2026-10-08T07:00:00.000Z');

-- admin_notifications: 6 rows
insert into public.admin_notifications (id, type, title, body, href, read, created_at) values
  ('nt_1', 'application', '{"ar":"طلب انضمام جديد","en":"New wash application"}'::jsonb, '{"ar":"واش هاب – الشيخ زايد قدمت طلب انضمام.","en":"Wash Hub – Sheikh Zayed submitted an application."}'::jsonb, '/applications/app_3', false, '2026-10-14T06:00:00.000Z'),
  ('nt_2', 'complaint', '{"ar":"شكوى جديدة","en":"New complaint"}'::jsonb, '{"ar":"شكوى جودة على بولش الهرم – الشيخ زايد.","en":"Quality complaint at Pyramid Polish – Sheikh Zayed."}'::jsonb, '/complaints/cp_1', false, '2026-10-14T10:00:00.000Z'),
  ('nt_3', 'critical_review', '{"ar":"تقييم حرج (نجمة واحدة)","en":"Critical review (1 star)"}'::jsonb, '{"ar":"تقييم بنجمة واحدة أبلغت عنه المغسلة.","en":"A 1-star review reported by the wash."}'::jsonb, '/reviews', false, '2026-10-13T15:00:00.000Z'),
  ('nt_4', 'payment_issue', '{"ar":"فرق في التحصيل","en":"Collection discrepancy"}'::jsonb, '{"ar":"مبلغ محصل لا يطابق إجمالي الطلب في كارزن ووش.","en":"Collected amount does not match order total at Carzen Wash."}'::jsonb, '/finance/transactions?filter=discrepancy', false, '2026-10-13T09:00:00.000Z'),
  ('nt_5', 'unusual_activity', '{"ar":"عجز في وردية","en":"Shift cash shortage"}'::jsonb, '{"ar":"عجز ١٥٠ ج.م في وردية حسن طارق – مدينة نصر.","en":"150 EGP shortage on Hassan Tarek''s shift – Nasr City."}'::jsonb, '/washes/biz_carzen', true, '2026-10-14T14:15:00.000Z'),
  ('nt_6', 'system', '{"ar":"اكتمال النسخ الاحتياطي","en":"Backup completed"}'::jsonb, '{"ar":"تم أخذ نسخة احتياطية كاملة لقاعدة البيانات.","en":"A full database backup completed."}'::jsonb, '/settings', true, '2026-10-12T00:00:00.000Z');

-- vendor_notifications: 6 rows
insert into public.vendor_notifications (id, business_id, branch_id, type, title, body, href, read, created_at) values
  ('vn_1', 'biz_carzen', 'br_nasr', 'new_booking', '{"ar":"حجز جديد من التطبيق","en":"حجز جديد من التطبيق"}'::jsonb, '{"ar":"حجز غسيل داخلي وخارجي اليوم ٥:٣٠ م — بانتظار التأكيد.","en":"حجز غسيل داخلي وخارجي اليوم ٥:٣٠ م — بانتظار التأكيد."}'::jsonb, '/orders/ord_pend_1', false, '2026-10-15T12:12:00.000Z'),
  ('vn_2', 'biz_carzen', 'br_nasr', 'cash_difference', '{"ar":"عجز ١٥٠ ج.م في وردية","en":"عجز ١٥٠ ج.م في وردية"}'::jsonb, '{"ar":"وردية حسن طارق أمس — بانتظار مراجعتك.","en":"وردية حسن طارق أمس — بانتظار مراجعتك."}'::jsonb, '/shifts?filter=difference', false, '2026-10-14T14:15:00.000Z'),
  ('vn_3', 'biz_carzen', 'br_nasr', 'review', '{"ar":"تقييم جديد ٥ نجوم","en":"تقييم جديد ٥ نجوم"}'::jsonb, '{"ar":"أحمد حسن: «الداخلية رجعت جديدة».","en":"أحمد حسن: «الداخلية رجعت جديدة»."}'::jsonb, '/reviews', true, '2026-10-14T16:00:00.000Z'),
  ('vn_4', 'biz_carzen', null, 'payout', '{"ar":"تم تحويل مستحقاتك","en":"تم تحويل مستحقاتك"}'::jsonb, '{"ar":"حولت كارزن ٤٬٢٠٠ ج.م — المرجع TRX-88421.","en":"حولت كارزن ٤٬٢٠٠ ج.م — المرجع TRX-88421."}'::jsonb, '/finance', true, '2026-10-01T09:00:00.000Z'),
  ('vn_5', 'biz_carzen', null, 'daily_summary', '{"ar":"ملخص أمس","en":"ملخص أمس"}'::jsonb, '{"ar":"٤١ طلب · ٦٬٩٨٠ ج.م · أكثر خدمة: غسيل خارجي · مشكلة واحدة.","en":"٤١ طلب · ٦٬٩٨٠ ج.م · أكثر خدمة: غسيل خارجي · مشكلة واحدة."}'::jsonb, '/reports', true, '2026-10-15T05:00:00.000Z'),
  ('vn_6', 'biz_carzen', 'br_helio', 'branch_issue', '{"ar":"فترة محجوبة غدًا","en":"فترة محجوبة غدًا"}'::jsonb, '{"ar":"تم حجب ١٢:٠٠–١:٠٠ م في مصر الجديدة للصيانة.","en":"تم حجب ١٢:٠٠–١:٠٠ م في مصر الجديدة للصيانة."}'::jsonb, '/schedule', true, '2026-10-14T08:00:00.000Z');

-- customer_favorites: 2 rows
insert into public.customer_favorites (customer_id, branch_id) values
  ('cu_ahmed', 'br_nasr'),
  ('cu_003', 'br_nasr');

-- customer_notifications: 2 rows
insert into public.customer_notifications (id, customer_id, type, title, body, href, order_id, read, created_at) values
  ('cn_ahmed_review', 'cu_ahmed', 'review_reminder', '{"ar":"قيّم زيارتك الأخيرة","en":"Rate your last visit"}'::jsonb, '{"ar":"غسيل داخلي وخارجي في كارزن ووش – مدينة نصر.","en":"Interior + Exterior at Carzen Wash – Nasr City."}'::jsonb, '/bookings/ord_ahmed_0', 'ord_ahmed_0', false, '2026-10-14T15:00:00.000Z'),
  ('cn_ahmed_offer', 'cu_ahmed', 'offer', '{"ar":"خصم على الغسيل الخارجي","en":"Exterior wash offer"}'::jsonb, '{"ar":"١٥٪ هذا الأسبوع على الغسيل الخارجي.","en":"15% off exterior washes this week."}'::jsonb, '/offers', null, false, '2026-10-15T06:00:00.000Z');

-- vendor_notifications: 1 rows
insert into public.vendor_notifications (id, business_id, branch_id, staff_id, type, title, body, href, read, created_at) values
  ('vn_samir_shift', 'biz_carzen', 'br_nasr', 'st_samir', 'shift', '{"ar":"وردية اليوم","en":"Today''s shift"}'::jsonb, '{"ar":"وردية ٩:٠٠ ص إلى ٥:٠٠ م.","en":"Shift 9:00 AM to 5:00 PM."}'::jsonb, '/home', false, '2026-10-15T05:00:00.000Z');

-- branch_photos: 4 rows
insert into public.branch_photos (id, branch_id, storage_path, position) values
  ('bph_br_nasr_0', 'br_nasr', 'br_nasr/0.webp', 0),
  ('bph_br_nasr_1', 'br_nasr', 'br_nasr/1.webp', 1),
  ('bph_br_nasr_2', 'br_nasr', 'br_nasr/2.webp', 2),
  ('bph_br_nasr_3', 'br_nasr', 'br_nasr/3.webp', 3);

-- demo manager PIN 1234 (employee app discount override)
update public.staff set pin_hash = extensions.crypt('1234', extensions.gen_salt('bf')) where role in ('owner', 'manager') and business_id = 'biz_carzen';

-- audit_logs: 47 rows
insert into public.audit_logs (id, actor_type, actor_id, actor_name, action, entity, entity_id, branch_id, old_value, new_value, reason, at) values
  ('aud_s1', 'admin', 'au_sara', 'Sara Nabil', 'suspend_wash', 'businesses', 'biz_dune', null, 'active', 'suspended', 'شكاوى جودة متكررة', '2026-10-09T11:00:00.000Z'),
  ('aud_s2', 'admin', 'au_mona', 'Mona Adel', 'hide_review', 'reviews', 'rv_auto_10', null, 'visible', 'hidden', 'محتوى دعائي (سبام)', '2026-10-10T08:00:00.000Z'),
  ('aud_s3', 'admin', 'au_omar', 'Omar Fathy', 'reject_application', 'applications', 'app_gate', null, 'pending', 'rejected', 'مستندات غير مكتملة', '2026-09-25T07:00:00.000Z'),
  ('aud_s4', 'admin', 'au_omar', 'Omar Fathy', 'request_changes_application', 'applications', 'app_4', null, 'pending', 'needs_changes', 'يرجى رفع صورة البطاقة الضريبية.', '2026-10-08T07:00:00.000Z'),
  ('aud_s5', 'admin', 'au_nour', 'Nour Salem', 'mark_payout_paid', 'payouts', 'po_1', null, 'due', 'paid', 'Reference: TRX-88421', '2026-10-01T09:00:00.000Z'),
  ('aud_s6', 'admin', 'au_mona', 'Mona Adel', 'suspend_customer', 'customers', 'cu_040', null, 'active', 'suspended', 'محاولات حجز وهمية متكررة', '2026-10-11T13:00:00.000Z'),
  ('aud_s7', 'admin', 'au_sara', 'Sara Nabil', 'update_commission_settings', 'businesses', 'biz_golden', null, '7', '9', 'اتفاقية خدمات مميزة', '2026-09-15T09:00:00.000Z'),
  ('aud_seed_0', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_0', null, null, 'completed', null, '2026-10-01T08:00:00.000Z'),
  ('aud_seed_1', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_1', null, null, 'completed', null, '2026-09-28T08:00:00.000Z'),
  ('aud_seed_2', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_2', null, null, 'completed', null, '2026-09-26T08:00:00.000Z'),
  ('aud_seed_3', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_3', null, null, 'completed', null, '2026-09-24T08:00:00.000Z'),
  ('aud_seed_4', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_4', null, null, 'completed', null, '2026-09-22T08:00:00.000Z'),
  ('aud_seed_5', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_5', null, null, 'completed', null, '2026-09-20T08:00:00.000Z'),
  ('aud_seed_6', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_6', null, null, 'completed', null, '2026-09-18T08:00:00.000Z'),
  ('aud_seed_7', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_ahmed_ns', null, null, 'no_show', null, '2026-09-15T13:00:00.000Z'),
  ('aud_seed_8', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_0', null, null, 'completed', null, '2026-10-13T09:00:00.000Z'),
  ('aud_seed_9', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_1', null, null, 'completed', null, '2026-10-12T09:00:00.000Z'),
  ('aud_seed_10', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_2', null, null, 'completed', null, '2026-10-11T09:00:00.000Z'),
  ('aud_seed_11', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_3', null, null, 'completed', null, '2026-10-10T09:00:00.000Z'),
  ('aud_seed_12', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_4', null, null, 'completed', null, '2026-10-09T09:00:00.000Z'),
  ('aud_seed_13', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_5', null, null, 'completed', null, '2026-10-08T09:00:00.000Z'),
  ('aud_seed_14', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_6', null, null, 'completed', null, '2026-10-07T09:00:00.000Z'),
  ('aud_seed_15', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_7', null, null, 'completed', null, '2026-10-06T09:00:00.000Z'),
  ('aud_seed_16', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_8', null, null, 'completed', null, '2026-10-05T09:00:00.000Z'),
  ('aud_seed_17', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_9', null, null, 'completed', null, '2026-10-04T09:00:00.000Z'),
  ('aud_seed_18', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_10', null, null, 'completed', null, '2026-10-03T09:00:00.000Z'),
  ('aud_seed_19', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_11', null, null, 'completed', null, '2026-10-02T09:00:00.000Z'),
  ('aud_seed_20', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_12', null, null, 'completed', null, '2026-10-01T09:00:00.000Z'),
  ('aud_seed_21', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_host_13', null, null, 'completed', null, '2026-09-30T09:00:00.000Z'),
  ('aud_seed_22', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_0', null, null, 'completed', null, '2026-10-15T06:00:00.000Z'),
  ('aud_seed_23', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_1', null, null, 'completed', null, '2026-10-15T06:15:00.000Z'),
  ('aud_seed_24', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_2', null, null, 'completed', null, '2026-10-15T06:30:00.000Z'),
  ('aud_seed_25', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_3', null, null, 'completed', null, '2026-10-15T07:00:00.000Z'),
  ('aud_seed_26', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_4', null, null, 'completed', null, '2026-10-15T07:15:00.000Z'),
  ('aud_seed_27', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_5', null, null, 'completed', null, '2026-10-15T07:30:00.000Z'),
  ('aud_seed_28', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_6', null, null, 'completed', null, '2026-10-15T08:00:00.000Z'),
  ('aud_seed_29', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_7', null, null, 'completed', null, '2026-10-15T08:15:00.000Z'),
  ('aud_seed_30', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_8', null, null, 'completed', null, '2026-10-15T08:30:00.000Z'),
  ('aud_seed_31', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_9', null, null, 'completed', null, '2026-10-15T09:00:00.000Z'),
  ('aud_seed_32', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_10', null, null, 'completed', null, '2026-10-15T09:15:00.000Z'),
  ('aud_seed_33', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_11', null, null, 'completed', null, '2026-10-15T09:30:00.000Z'),
  ('aud_seed_34', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_12', null, null, 'completed', null, '2026-10-15T10:00:00.000Z'),
  ('aud_seed_35', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_13', null, null, 'completed', null, '2026-10-15T10:15:00.000Z'),
  ('aud_seed_36', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_14', null, null, 'completed', null, '2026-10-15T10:30:00.000Z'),
  ('aud_seed_37', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_15', null, null, 'completed', null, '2026-10-15T11:00:00.000Z'),
  ('aud_seed_38', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_16', null, null, 'completed', null, '2026-10-15T11:15:00.000Z'),
  ('aud_seed_39', 'system', 'seed', 'النظام', 'order.created', 'orders', 'ord_today_17', null, null, 'completed', null, '2026-10-15T11:30:00.000Z');

-- sequences continue after the seeded numbers
select setval('public.order_number_app_seq', 10001, false);
select setval('public.order_number_walk_in_seq', 20044, true);
select setval('public.order_number_phone_seq', 30022, true);
select setval('public.complaint_ticket_seq', 1039, true);

-- Shift all dates so the seed's "today" becomes the day this file is applied.
do $$
declare
  shift_days integer := current_date - date '2026-10-15';
  t record;
begin
  if shift_days = 0 then return; end if;
  alter table public.audit_logs disable trigger audit_logs_no_update_delete;
  -- One UPDATE per table moving all its date columns together, so range checks
  -- (ends_at > starts_at, period_end >= period_start) hold at every step.
  for t in
    select table_name,
           string_agg(format(case when data_type = 'date' then '%1$I = %1$I + %2$s'
                                  else '%1$I = %1$I + make_interval(days => %2$s)' end,
                             column_name, shift_days), ', ') as assignments
      from information_schema.columns
     where table_schema = 'public'
       and is_generated = 'NEVER'
       and data_type in ('timestamp with time zone', 'date')
     group by table_name
  loop
    execute format('update public.%I set %s', t.table_name, t.assignments);
  end loop;
  alter table public.audit_logs enable trigger audit_logs_no_update_delete;
end;
$$;
