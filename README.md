# RemAuto CRM

Production-ready automotive CRM built with Next.js, TypeScript, Tailwind CSS, Supabase, and shadcn/ui.

## Stack

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Auth + PostgreSQL)
- **shadcn/ui** components

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy the environment template and add your project credentials:

```bash
cp .env.example .env.local
```

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database

This app connects to your **existing** Supabase tables — no schema recreation required:

| App route | Supabase table |
|---|---|
| Dashboard | `cars`, `document_tasks`, `detailing_orders`, `finance_transactions` |
| Cars | `cars` |
| Clients | `clients` |
| Documents | `document_tasks` |
| Detailing | `detailing_orders` |
| Finance | `finance_transactions` |
| Reports | All of the above |

### 3. Start the dev server

Ensure `.env.local` is configured and an auth user exists in Supabase Dashboard.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Premium dark UI (black, dark gray, white, red `#dc2626` accents)
- Supabase email/password authentication
- Protected routes via middleware
- Responsive sidebar + top navigation
- Dashboard with live Supabase metrics:
  - Total cars
  - Cars in stock
  - Cars sold
  - Open document tasks
  - Active detailing orders
  - Total monthly profit
- Module pages: Cars, Documents, Detailing, Clients, Finance, Reports, Settings
- Global loading and error screens

## Project Structure

```
app/
  (dashboard)/          # Protected CRM routes
  login/                # Auth page
  auth/callback/        # Supabase OAuth callback
components/
  auth/                 # Login form
  dashboard/            # Dashboard widgets
  layout/               # Sidebar, top nav, user menu
  shared/               # Loading/error screens
  ui/                   # shadcn/ui primitives
lib/
  supabase.ts           # Supabase client exports
  supabase/             # Browser, server, middleware clients
  queries/              # Server-side data fetching
  types/                # Database types
middleware.ts           # Auth session + route protection
supabase/migrations/    # SQL schema
```
