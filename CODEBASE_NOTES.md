# Ridder Codebase Notes

Quick reference for the dev — avoids re-reading files from scratch.

---

## Stack

- **Next.js 16** App Router, TypeScript, Tailwind CSS
- **next-intl** — i18n (RU/KK/EN), files: `app/messages/{ru,kk,en}.json`
- **Auth.js** — JWT sessions, `session.user.isAdmin` available without DB
- **Prisma** + PostgreSQL (port 5432)
- **MinIO** S3-compatible storage (port 9000 API, 9001 console, bucket "ridder")
- **Dev server**: port 3001

---

## Key File Paths

| What | Path |
|---|---|
| DB queries | `src/lib/queries.ts` |
| S3 client | `src/lib/s3.ts` |
| Session helpers | `src/lib/session.ts` |
| Currency format | `src/lib/currency.ts` |
| i18n navigation | `src/i18n/navigation.ts` |
| Icons sprite | `src/components/IconSprite.tsx` |
| Global CSS + tokens | `src/app/globals.css` |
| Prisma schema | `prisma/schema.prisma` |
| Prisma client | `src/lib/prisma.ts` |

---

## CSS Design Tokens (globals.css)

```
--surface        bg of cards/page
--surface-2      hover/alt bg
--border         border color
--ink            primary text
--ink-soft       secondary text
--ink-faint      muted text
--ember          #E2531F  (primary orange accent)
--ember-strong   #C23F14
--ember-tint     #FBE4D7
--spruce         green (success)
--radius-s: 6px / --radius-m: 12px / --radius-l: 20px
```

Font classes: `font-display` (display), `font-body` (body)

---

## SVG Icon Names (sprite)

`mountain, drop, leaf, ski, route, pin, clock, arrow, user, check`

Usage: `<Icon name="i-mountain" className="h-4 w-4" />`

---

## Auth Pattern

```ts
// Server action / route handler
import { requireAdminId } from "@/lib/session";
const userId = await requireAdminId(); // throws redirect if not admin

// Server component
import { auth } from "@/auth";
const session = await auth();
session?.user?.isAdmin
```

---

## Server Action Pattern

```ts
"use server";
export async function myAction(prev: State, fd: FormData): Promise<State> {
  const userId = await requireAdminId();
  // ... validate, db, revalidatePath, return state
}
```

Client side: `useActionState(myAction, initialState)`

---

## i18n Usage

```ts
// Server component
const t = await getTranslations("Namespace");

// Client component
const t = useTranslations("Namespace");
```

---

## Route Structure

```
/                          — home (events list redirects here)
/events                    — public events list
/events/[slug]/[year]      — event detail page
/events/[slug]/[year]/register — registration flow
/admin                     — admin dashboard (isAdmin gate)
/admin/events/new          — wizard step 1 (create event)
/admin/events/[id]?wizard=2 — wizard step 2 (distances)
/admin/events/[id]?wizard=3 — wizard step 3 (merch)
/admin/events/[id]/registrations — view registrations
/admin/registrations/[slug]/[year]/export — CSV download
/admin/users               — user management
/admin/races               — race management
/legal/{privacy,offer,refund,payment}
```

---

## Prisma Key Models

- **Race** — `name, slug, courseIntro, icon, color, equipment(Json), landmarks(Json)`
- **Event** — `raceId, year, dateISO, location, status, registrationDeadline, cancellationDeadline, medicalCancellationDeadline, transferPrice?, resultsUrl?, coverImageUrl?, volunteerChatUrl?`
- **Distance** — `eventId, name, km, price, capacity, minAge, maxAge, discipline?`
- **Registration** — `userId, eventId, distanceId, status(PAID/RESERVED/CANCELLED), bibNumber?`
- **User** — `email, firstName, lastName, city, isAdmin, emailVerified?`
- **MerchItem** — `eventId, name, price, imageUrl?`

---

## S3 Key Naming

```ts
s3Keys.avatar(userId, ext)      // avatars/{userId}.{ext}
s3Keys.cover(eventId, ext)      // covers/{eventId}.{ext}
s3Keys.regulation(eventId)      // regulations/{eventId}.pdf
```

Env vars: `S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, NEXT_PUBLIC_S3_PUBLIC_URL`

---

## Admin Bootstrap

```bash
npx tsx prisma/seed-admin.ts  # first admin via CLI
```

---

## Notion IDs

- Task tracker data source: `collection://a4e31a47-4bcb-4e1d-84d1-933c03821fc6`
- Notion update tool format: `page_id + command: "update_properties" + properties: {"Статус": "Done"}`

---

## Important Decisions

- **No placeholders on form inputs** — leave empty, especially race create form
- **Race icon = SVG sprite name** (not emoji), default: `"mountain"`
- **Transfer field is optional** — shown via checkbox in EventForm
- **Event wizard**: step 1 → /admin/events/[id]?wizard=2 → wizard=3 → /admin
- **Only step 3 "Готово" redirects to /admin**, not step 1 or 2
- **Tabs on event detail** are client-side (DetailTabs.tsx), page stays server component
- **Cloudflare Turnstile** test keys: sitekey `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`
