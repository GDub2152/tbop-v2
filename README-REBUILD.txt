THE BLOWTORCH OF PARMA - STABLE REBUILD

This build keeps the working Supabase project configuration and current Officer Desk behavior.

NEW CALENDAR
- Full month view with Previous / Today / Next controls
- Events are read from the existing public.events table
- Uses event_date and starts_at (no new event columns required)
- Local Parma/Cleveland forecast weather is fetched directly from Open-Meteo
- Weather appears only inside the available forecast horizon
- Tap/click a day for event + weather details
- Upcoming Events list remains below the calendar
- Mobile layout is condensed for phone use

NO DATABASE MIGRATION IS REQUIRED FOR THIS CALENDAR UPDATE.

IMPORTANT
Keep supabase-config.js with this site. It contains the working browser-side project URL and publishable key.
