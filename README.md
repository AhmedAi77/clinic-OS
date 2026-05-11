# MyClinic (Clink) — Clinic Management Platform

> A complete clinic management system for patients, doctors, receptionists, and admins.
> Written for junior developers — logic first, then tools.

---

## What Does This App Do?

Imagine a real clinic. Four types of people walk in:

| Person           | What they need                                                   |
| ---------------- | ---------------------------------------------------------------- |
| **Patient**      | Book an appointment, see their medical history and prescriptions |
| **Doctor**       | See today's queue, run consultations, write prescriptions        |
| **Receptionist** | Check patients in, add walk-in patients, collect payment         |
| **Admin**        | Add doctors, manage services, see revenue and stats              |

This app replaces paper, phone calls, and whiteboards with a web platform. All four roles log in to the same app but see completely different dashboards.

---

## The Core Logic (Read This First)

### 1. One user, one or more roles

Every person who signs up gets a **profile** in the database. They are then given a **role** (patient, doctor, receptionist, or admin). The app reads the role after login and sends the user to the right dashboard.

### 2. Appointments have a lifecycle

An appointment does not just exist — it moves through **states**:

```
Scheduled → Waiting → InConsultation → PendingPayment → Completed
                                                       ↘ Cancelled
```

- A patient books → status = `Scheduled`
- Receptionist checks them in → status = `Waiting`
- Doctor starts consultation → status = `InConsultation`
- Doctor finishes, services are added → status = `PendingPayment`
- Receptionist collects payment → status = `Completed`

Every role only handles the states that belong to them. That is the whole business logic.

### 3. Time slots

Doctors set their working hours and how long each slot is (e.g., 9am–5pm, 20 minutes each). The app calculates the available slots automatically and prevents double-booking by enforcing a unique constraint in the database: one appointment per doctor per time slot per day.

### 4. Real-time queue

The doctor's dashboard shows the live queue. When a receptionist checks a patient in, the doctor's screen updates **automatically** without refreshing. This works through Supabase Realtime (the database sends a message to the browser whenever a row changes).

### 5. Billing

When a doctor adds services to an appointment (e.g., "blood test", "X-ray"), the system records each service and its price at that moment. The receptionist then sees the total and marks it as paid.

### 6. Bilingual (Arabic + English)

All text in the app is stored in a translation file (`src/lib/i18n.tsx`). The user can switch between Arabic and English. When Arabic is selected, the entire layout flips to right-to-left (RTL).

---

## Folder Structure

```
clink/
├── src/                        ← All the application code lives here
│   ├── routes/                 ← One file = one page
│   │   ├── __root.tsx          ← Shared layout (header, providers) wrapping every page
│   │   ├── index.tsx           ← Landing page (what visitors see before logging in)
│   │   ├── login.tsx           ← Login form
│   │   ├── signup.tsx          ← Sign up form
│   │   ├── admin.tsx           ← Admin dashboard
│   │   ├── doctor.tsx          ← Doctor dashboard
│   │   ├── patient.tsx         ← Patient portal
│   │   └── reception.tsx       ← Reception dashboard
│   │
│   ├── components/             ← Reusable pieces used across multiple pages
│   │   ├── AppHeader.tsx       ← The navigation bar at the top
│   │   ├── RoleGuard.tsx       ← Blocks a page if you don't have the right role
│   │   ├── StatusBadge.tsx     ← Colored badge showing appointment status
│   │   └── ui/                 ← 44 low-level UI components (buttons, cards, dialogs…)
│   │
│   ├── lib/                    ← Business logic and utilities (not UI)
│   │   ├── auth.tsx            ← Tracks who is logged in and what their role is
│   │   ├── clinic.ts           ← Calculates time slots and bills
│   │   ├── i18n.tsx            ← Arabic/English translations
│   │   └── utils.ts            ← Small helpers (CSS class merging)
│   │
│   ├── integrations/supabase/  ← Everything that talks to the database
│   │   ├── client.ts           ← Creates the Supabase connection
│   │   └── types.ts            ← Auto-generated TypeScript types from the DB schema
│   │
│   ├── hooks/                  ← Custom React hooks (reusable stateful logic)
│   ├── router.tsx              ← Wires up the router with data-fetching context
│   ├── start.ts                ← App entry point (server + client)
│   └── styles.css              ← Global CSS + Tailwind base
│
├── supabase/
│   ├── config.toml             ← Supabase project settings
│   └── migrations/             ← SQL files that create/alter the database tables
│       ├── ...schema.sql       ← Creates all tables, enums, triggers
│       └── ...policies.sql     ← Security rules (who can read/write what)
│
├── .env                        ← Secret keys (never commit this to git)
├── .gitignore                  ← Files git should never track
├── package.json                ← Project metadata and scripts
├── tsconfig.json               ← TypeScript configuration
├── vite.config.ts              ← Build tool configuration
└── wrangler.jsonc              ← Cloudflare deployment configuration
```

---

## Technologies — Why Each One Was Chosen

### React

**What it is:** A JavaScript library for building UIs using components.
**Why:** The whole frontend is made of components — a `<Button>`, a `<Card>`, a `<DoctorQueue>`. React makes it easy to build, reuse, and update these pieces without reloading the page.

### TypeScript

**What it is:** JavaScript with types added on top.
**Why:** It tells you immediately when you pass the wrong data somewhere. For example, if an appointment needs a `doctor_id` (a string) and you accidentally pass a number, TypeScript catches it before you even run the code.

### TanStack Router

**What it is:** A routing library — it maps URLs to page components.
**Why:** Each file in `src/routes/` automatically becomes a URL. `/src/routes/doctor.tsx` → the `/doctor` page. You don't write routing config by hand.

### TanStack Query

**What it is:** A data-fetching library.
**Why:** It handles loading states, error states, caching, and re-fetching. Without it, you'd write the same `loading / error / data` logic on every page manually.

### Supabase

**What it is:** A hosted database (PostgreSQL) + authentication + real-time subscriptions, accessible via a JavaScript client.
**Why:** It replaces the need to build a backend API from scratch. Instead of writing Node.js server code, you query the database directly from the browser using the Supabase client. Auth (login/signup) is built in. Real-time updates are built in.

### Tailwind CSS

**What it is:** A CSS framework where you write styles as class names directly in HTML/JSX.
**Why:** Instead of writing a separate `.css` file, you style elements inline: `className="text-red-500 font-bold p-4"`. Fast to write, no naming conventions needed.

### Radix UI + shadcn/ui (the `ui/` folder)

**What it is:** Pre-built, accessible UI components (Dialog, Select, Tabs, etc.).
**Why:** Building a modal dialog correctly (keyboard navigation, focus trapping, screen readers) is surprisingly hard. These components handle all that. shadcn/ui copies the source code into your project — you own it and can customize it freely.

### Vite

**What it is:** The build tool that compiles, bundles, and serves the app.
**Why:** Extremely fast. In development mode, changes appear in the browser instantly (Hot Module Replacement). In production, it bundles everything into optimized files.

### Zod + React Hook Form

**What it is:** Form validation libraries.
**Why:** Zod defines the shape and rules for data (e.g., "email must be a valid email, password must be at least 8 characters"). React Hook Form connects those rules to form inputs and shows errors automatically.

---

## Database Tables

```
profiles          — Basic info for every user (name, phone)
user_roles        — What role(s) a user has (patient, doctor, etc.)
doctors           — Doctor-specific info (specialization, fee, working hours)
services          — Medical services the clinic offers (name, price)
appointments      — The core table — every booked slot
appointment_services — Which services were added to each appointment (for billing)
prescriptions     — Medications written by the doctor for an appointment
```

**Key relationship:**

```
auth.users (Supabase built-in)
    └── profiles (1-to-1)
    └── user_roles (1-to-many: a user can have multiple roles)
    └── doctors (1-to-1, only if they are a doctor)

appointments
    ├── belongs to a patient (via patient_id)
    ├── belongs to a doctor (via doctor_id)
    ├── has many appointment_services (billing line items)
    └── has one prescription (optional)
```

---

## Security — Row Level Security (RLS)

Supabase lets you write rules directly in the database that control who can read or write each row. These are called **Row Level Security policies**.

Example rule: "A patient can only see their own appointments."

This means even if someone hacks the frontend JavaScript, they still cannot read another patient's data — the database itself refuses the request.

The `has_role()` function checks if the current logged-in user has a specific role before allowing access.

---

## How to Run the Project

### Prerequisites

- Node.js 18+ or Bun installed
- A Supabase project (credentials are already in `.env`)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open your browser
# http://localhost:5173
```

### Other Commands

```bash
npm run build      # Build for production
npm run preview    # Preview the production build locally
npm run lint       # Check for code errors
npm run format     # Auto-format the code
```

---

## The `.env` File

This file holds secret keys to connect to Supabase. It is listed in `.gitignore` so it is never uploaded to GitHub — your keys stay private.

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
```

Never share these keys publicly. The `VITE_` prefix means Vite will expose these variables to the browser (they are meant to be public-facing anon keys, not admin keys).

---

## The `.gitignore` File

Git tracks every file change. But some files should never be tracked:

| Ignored         | Why                                                                           |
| --------------- | ----------------------------------------------------------------------------- |
| `node_modules/` | Thousands of dependency files — anyone can re-install them with `npm install` |
| `dist/`         | Build output — generated from source, no need to commit                       |
| `.env`          | Secret keys — should never be public                                          |
| `.wrangler/`    | Cloudflare local cache                                                        |
| `.DS_Store`     | macOS system files, not part of the project                                   |

---

## How a New User Signs Up (Full Flow Example)

1. User fills out the signup form (`/signup`)
2. Supabase creates a record in `auth.users`
3. A **database trigger** automatically runs and creates a matching row in `profiles`
4. Another trigger gives them the `patient` role in `user_roles`
5. The app reads their role, sees `patient`, and redirects them to the patient dashboard
6. If they are later assigned a `doctor` role by an admin, next login they go to the doctor dashboard instead

---

## Project Summary

| Layer         | Technology                  | Purpose                                |
| ------------- | --------------------------- | -------------------------------------- |
| UI Components | React + Radix UI + Tailwind | Build and style the interface          |
| Routing       | TanStack Router             | Map URLs to pages                      |
| Data Fetching | TanStack Query + Supabase   | Load and cache database data           |
| Database      | Supabase (PostgreSQL)       | Store all clinic data securely         |
| Auth          | Supabase Auth               | Login, signup, session management      |
| Real-time     | Supabase Realtime           | Live queue updates for doctors         |
| Forms         | React Hook Form + Zod       | Validate user input                    |
| i18n          | Custom context              | Arabic / English switching             |
| Build         | Vite                        | Fast dev server and production bundler |
| Deploy        | Cloudflare Workers          | Host the production app                |
