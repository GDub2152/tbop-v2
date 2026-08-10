THE BLOWTORCH OF PARMA - TBOP v3

This version is locked to the current Supabase schema:

NEWS
id, title, body, published, created_at, updated_at, published_at

EVENTS
id, title, description, starts_at, location, visibility, recurrence,
created_by, created_at, event_date

IMPORTANT: TBOP v3 does NOT use an event_time column. The admin form combines
Date + Time and stores the time in starts_at.

DOCUMENTS
title, category, description, file_url, storage_path, published, created_at

ADMIN LOGIN
The existing site_admins table and is_site_admin() function are retained.
Do not recreate your Auth users. Keep the Supabase project that is already working.

DEPLOYMENT
1. Back up your current GitHub repository.
2. Upload the TBOP v3 files.
3. KEEP your currently working supabase-config.js values. If the included
   supabase-config.js contains placeholders, replace it with your working file.
4. Do NOT run database-v3.sql unless the new site reports a missing table/column.
   It is a compatibility/alignment script, not a requirement if everything loads.
5. Hard refresh the browser (Ctrl+Shift+R).
6. Test in this order: Officer Login -> News -> Calendar -> Documents.

CALENDAR TEST
Add a date and optional time. v3 writes:
  event_date = YYYY-MM-DD
  starts_at  = timestamp with time zone (or NULL if no time)

No member portal is included. Public visitors never need an account.
