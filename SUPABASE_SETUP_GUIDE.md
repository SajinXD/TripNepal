# Supabase New Project Setup Guide
### Complete step-by-step for Trip Nepal presentation

---

## PART 1 — Create New Supabase Project

1. Go to **https://supabase.com** → Sign in → **New Project**
2. Fill in:
   - **Name**: `trip-nepal`
   - **Database Password**: (save this securely!)
   - **Region**: `Southeast Asia (Singapore)` — closest to Nepal
   - **Pricing**: Free tier is enough for demo
3. Click **Create new project** — wait ~2 minutes

---

## PART 2 — Run the Database SQL

1. In your Supabase project → left sidebar → **SQL Editor**
2. Click **New query**
3. Open the file `SUPABASE_COMPLETE_DATABASE.sql` from VS Code
4. **Select All** (Ctrl+A) → **Copy** (Ctrl+C)
5. **Paste** into SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see: `Success. No rows returned`

> If you see errors about extensions not found, that's fine — `pg_trgm` and `uuid-ossp` come pre-installed on Supabase.

---

## PART 3 — Get Your API Keys

1. Left sidebar → **Project Settings** → **API**
2. Copy these two values:

```
Project URL:   https://xxxxxxxxxxxx.supabase.co
Anon/Public:   eyJhbGciOi...  (long JWT token)
```

3. Open `.env` file in VS Code and replace:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
ANTHROPIC_API_KEY=sk-ant-api03-8rC3-...  (keep your existing key)
```

---

## PART 4 — Connect VS Code to Supabase

### Option A — Supabase VS Code Extension (Recommended for demo)

1. In VS Code → Extensions (Ctrl+Shift+X)
2. Search `Supabase` → Install **"Supabase"** by Supabase
3. Click the Supabase icon in the left sidebar
4. Click **Sign in with browser** → authorize
5. Select your `trip-nepal` project
6. You can now browse tables, run queries, and see schema directly in VS Code!

### Option B — Supabase CLI (for advanced use)

Open terminal in VS Code (Ctrl+`) and run:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (get project-ref from Settings > General)
supabase link --project-ref YOUR_PROJECT_REF

# Auto-generate TypeScript types from your DB schema
supabase gen types typescript --linked > src/types/database.ts
```

---

## PART 5 — Set Up Storage Buckets

1. Left sidebar → **Storage** → **New bucket**

Create these 4 buckets:

| Bucket Name         | Public? | Purpose                     |
|---------------------|---------|-----------------------------|
| `avatars`           | ✅ Yes  | User profile photos         |
| `destination-images`| ✅ Yes  | Destination cover photos    |
| `kyc-documents`     | ❌ No   | Private KYC documents       |
| `chat-attachments`  | ❌ No   | Private chat images         |

For **avatars** and **destination-images**:
- After creating → click bucket → **Policies** → **New policy**
- Select `"Give users access to own folder only"` template

---

## PART 6 — Deploy the AI Edge Function

1. Make sure Supabase CLI is installed and project is linked (Part 4B)
2. In terminal:

```bash
# Set the Anthropic API key as a secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-8rC3-...

# Deploy the AI function
supabase functions deploy ai-trip-planner
```

3. Test it in Supabase Dashboard → **Edge Functions** → `ai-trip-planner` → **Test**

---

## PART 7 — Create Demo Users for Presentation

In Supabase → **Authentication** → **Users** → **Add user**

### Tourist Account
- Email: `tourist@demo.com`
- Password: `Demo1234!`
- User metadata (paste as JSON):
```json
{ "full_name": "Ram Bahadur Thapa", "role": "tourist" }
```

### Guide Account
- Email: `guide@demo.com`
- Password: `Demo1234!`
- User metadata:
```json
{ "full_name": "Pemba Sherpa", "role": "guide" }
```

After creating the guide, run this in SQL Editor to activate them:

```sql
-- Make the guide verified and online for demo
UPDATE public.guide_profiles
SET
  is_verified = TRUE,
  is_online   = TRUE,
  price_per_day = 3500,
  price_per_hour = 500,
  years_of_experience = 8,
  languages_spoken = '{english,nepali,hindi}',
  specializations  = '{trekking,adventure,cultural}',
  service_areas    = '{kaski,solukhumbu,kathmandu,mustang}',
  bio_long = 'Certified Nepal Tourism Board guide with 8 years experience. Specialist in Everest and Annapurna regions. Safety-first approach with deep knowledge of local culture and routes.',
  average_rating = 4.8,
  total_reviews = 24,
  total_trips_completed = 47
WHERE id = (SELECT id FROM auth.users WHERE email = 'guide@demo.com');
```

---

## PART 8 — Update .env with New Project Keys

```env
# .env (update these two lines)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY

# Keep these as-is
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8g7h9jk989ghj9
```

---

## PART 9 — Run the App

```bash
# In your project folder
npx expo start --offline

# Scan QR code with Expo Go app on your phone
# OR press:
#   a  →  Android emulator
#   i  →  iOS simulator
#   w  →  Web browser
```

---

## Quick Checklist Before Presentation

- [ ] New Supabase project created
- [ ] `SUPABASE_COMPLETE_DATABASE.sql` run successfully
- [ ] 4 storage buckets created
- [ ] `.env` updated with new project URL and anon key
- [ ] Demo tourist user created: `tourist@demo.com / Demo1234!`
- [ ] Demo guide user created: `guide@demo.com / Demo1234!`
- [ ] Guide activated (SQL UPDATE run)
- [ ] AI Edge Function deployed with ANTHROPIC_API_KEY secret
- [ ] App starts with `npx expo start --offline`
- [ ] Login works with demo accounts
- [ ] Discover screen shows Leaflet map
- [ ] AI trip planner generates itinerary

---

## Database Tables Summary

| Table | Purpose |
|-------|---------|
| `profiles` | All users (tourist + guide) |
| `guide_profiles` | Guide-specific: price, rating, location |
| `kyc_verifications` | Guide identity verification |
| `kyc_documents` | KYC document files (stored in Storage) |
| `destinations` | Nepal tourist places catalog (15 seeded) |
| `saved_destinations` | User favorites/bookmarks |
| `trip_plans` | AI-generated itineraries |
| `bookings` | Tourist books a guide |
| `reviews` | Ratings after completed trips |
| `chat_threads` | Messaging rooms (1 per booking) |
| `chat_messages` | Individual messages (realtime) |
| `transactions` | Payment records |
| `payouts` | Guide earnings payouts |
| `notifications` | Push notification log |
| `push_tokens` | Expo push tokens per device |
