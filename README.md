# TripNepal

A full-stack mobile application for discovering and booking trekking guides, stays, and experiences across Nepal. Built with React Native (Expo) and Supabase.

## Features

### Tourist
- Browse destinations, trekking routes, and cultural sites across Nepal
- Discover and book certified local guides
- Explore lodges and stays
- AI-powered trip planning (via Groq)
- Real-time chat with guides
- Live USD → NPR currency converter
- Interactive map exploration
- Wishlist / saved destinations

### Guide
- Onboarding with KYC document verification and license upload
- Dashboard to manage incoming bookings
- Accept or decline booking requests
- Chat with tourists
- Profile management with service details

### Shared
- Email/password authentication with OTP verification
- Role selection at signup (tourist or guide)
- Push notifications (Firebase)
- Dark and light theme support

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo 54 |
| Routing | Expo Router (file-based) |
| Language | TypeScript |
| Styling | NativeWind (Tailwind CSS for RN) |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| AI | Groq SDK |
| Push Notifications | Firebase + Expo Notifications |
| Maps | React Native Maps |
| Icons | Lucide React Native |

## Project Structure

```
app/                     # Expo Router screens
  (auth)/                # Authentication flows
  (tourist)/             # Tourist tab screens
  (guide)/               # Guide tab screens
  booking/               # Booking detail and confirmation
  chat/                  # Real-time messaging
  destination/           # Destination detail pages
  guides/                # Guide listing and profiles
  kyc/                   # KYC verification flow
  license/               # Guide license verification
  stays/                 # Lodges and accommodation
  trip-plan/             # AI-generated trip plans

src/
  components/
    layout/              # ScreenHeader, BottomTabBar, SideDrawer, SafeScreen
    ui/                  # Button, Input, Card, Badge, Avatar, Chip, etc.
    destinations/        # DestinationCard
    guides/              # GuideCard
    stays/               # LodgeCard
    map/                 # ExploreMap (native + web variants)
  hooks/                 # useAuth, usePushNotifications
  stores/                # authStore (Zustand), themeStore
  lib/                   # supabase client, firebase, image-picker
  constants/             # theme tokens, colors
  types/                 # Supabase database types

supabase/
  functions/             # Deno edge functions
    ai-trip-planner/     # Groq-powered itinerary generation
    booking-create/      # Create booking requests
    booking-respond/     # Accept/decline bookings
    kyc-submit/          # Submit KYC documents
    kyc-review/          # Admin KYC review
    payment-initiate/    # eSewa / Khalti payment initiation
    payment-webhook-*/   # Payment gateway webhooks
    payout-process/      # Guide payout processing
    send-push/           # Firebase push notification dispatch
  migrations/            # Ordered SQL migration files
```

## Database

Supabase (PostgreSQL) with Row Level Security enabled on all tables. Key tables:

- `profiles` — user accounts with role (`tourist` | `guide` | `admin`)
- `guide_profiles` — extended guide info, verification status, services
- `destinations` — trekking spots, cultural sites, and attractions
- `bookings` — tourist-to-guide booking requests and status
- `stays` — lodge and accommodation listings
- `chat_threads` — one thread per tourist-guide pair
- `messages` — real-time chat messages with attachment support
- `kyc_submissions` — identity verification documents
- `license_verifications` — guide license document uploads
- `trip_plans` — AI-generated itineraries saved per user
- `push_tokens` — device tokens for push notification delivery

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo`)
- A Supabase project
- A Firebase project (for push notifications)
- A Groq API key (for AI trip planning)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file or set the following in your Expo config:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_EXCHANGE_RATE_API_KEY=   # optional, falls back to open.er-api.com
```

Set Supabase secrets for edge functions:

```bash
supabase secrets set GROQ_API_KEY=...
supabase secrets set FIREBASE_SERVER_KEY=...
```

### Database Setup

Apply migrations in order:

```bash
supabase db push
```

Or apply via the Supabase dashboard using the files in `supabase/migrations/`.

### Running

```bash
# Start Expo dev server
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Payment Gateways

Supports two Nepali payment providers:

- **eSewa** — webhook at `/payment-webhook-esewa`
- **Khalti** — webhook at `/payment-webhook-khalti`

Both are handled by Supabase Edge Functions that verify the payment and update booking status.

## User Roles

| Role | Access |
|---|---|
| `tourist` | Browse, book guides, chat, AI plan, save destinations |
| `guide` | KYC onboarding, manage bookings, chat with tourists |
| `admin` | Review KYC submissions, manage platform |

Guides must complete KYC and license verification before appearing in listings.
