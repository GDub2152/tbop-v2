TBOP v2 - MOBILE-FIRST PUBLIC SITE + OFFICER DESK

WHAT THIS BUILD DOES
- Public: Home, Calendar, Conditions, Membership, Documents, News.
- Admin only: Documents, News, Calendar, Member records, Admin access list.
- No public registration and no member login.
- Designed for phones, tablets and desktops.
- Uses Supabase Auth + RLS and a public PDF Storage bucket.

DO I NEED A NEW PUBLISHABLE KEY?
No. If this site uses your existing Supabase project, use that project's existing Project URL and publishable/anon key. A new site does not require a new key.

SETUP ORDER
1. In Supabase SQL Editor, run supabase-setup-v2.sql.
2. In Supabase Authentication -> Users, create your first officer/admin user with EMAIL + PASSWORD.
3. Copy that user's UUID. At the bottom of supabase-setup-v2.sql, copy the FIRST ADMIN BOOTSTRAP insert, replace UUID-BELOW, and run it.
4. Open setup.html locally or from GitHub Pages. Paste Project URL + publishable/anon key. Test.
5. Copy the generated configuration into supabase-config.js and upload/commit that file.
6. Open admin.html and sign in using the exact EMAIL + PASSWORD from Supabase Authentication.

IMPORTANT SECURITY
- NEVER place a service_role key or Supabase secret key in this site.
- The public/publishable/anon key is intended for browser clients when RLS is properly configured.
- Member records are private; public users have no SELECT policy on the members table.

GITHUB PAGES
Upload the contents of this folder to a fresh repository or a test branch first. index.html must remain at the repository root.
