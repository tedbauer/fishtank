# ChoreTracker 🐟

A shared household chore tracker with a virtual aquarium pet. Keep your home tidy together — your fish thrives when chores get done.

## Features

- **Shared Households** — Create a household and invite your partner/roommates with a 6-character invite code or share link
- **Smart Chore Scheduling** — Daily, every 2 days, weekly, biweekly, monthly, quarterly, and biannual frequencies
- **Virtual Aquarium** — A minimal line-art fish tank that reflects your household's chore health. The fish swims slowly, hearts float up, a shrimp crawls along the bottom, and plants sway with parallax depth
- **Happiness System** — Fish mood changes based on completion patterns (Thriving → Happy → Vibing → Meh → Blue → Needs Love)
- **Streak Tracking** — Consecutive days with no overdue chores. Don't break the streak!
- **Push Notifications (PWA)** — Real push notifications on iOS/Android when installed as a Home Screen app. Configurable: daily summary, overdue alerts, streak warnings
- **Heatmap Calendar** — Day/week/month tile view showing completion patterns over time
- **Reward Animations** — Completing chores triggers aquarium animations (fish food, bubbles, plants, treasure)
- **Chore Descriptions** — Optional descriptions for each chore
- **Inline Editing** — Edit chore names, descriptions, and frequencies directly in the manage view
- **Google OAuth** — Secure login via Google

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/) (Postgres + Google OAuth)
- **Hosting**: [Vercel](https://vercel.com/)
- **Push**: Web Push API + VAPID keys + Service Worker
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A [Vercel](https://vercel.com/) account (for deployment)

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/tedbauer/choretracker2.git
   cd choretracker2
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` file:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
   VAPID_PRIVATE_KEY=your-vapid-private-key
   CRON_SECRET=your-cron-secret
   ```

3. **Set up Supabase**

   Run the database migrations in the Supabase SQL Editor. You'll need tables for:
   - `households` (id, name, invite_code)
   - `profiles` (id, display_name, avatar_url, household_id, color)
   - `chores` (id, name, freq, household_id, owner_id, description)
   - `completions` (id, chore_id, user_id, completed_date)
   - `push_subscriptions` (id, user_id, household_id, subscription, endpoint, preferences)

   Configure Google OAuth in Supabase Dashboard → Authentication → Providers.

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Deployment

Push to `main` — Vercel auto-deploys. Make sure all environment variables are set in Vercel Dashboard → Settings → Environment Variables.

The `vercel.json` configures a daily cron job that sends push notifications for due/overdue chores.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── notify/route.js    # Cron endpoint for push notifications
│   │   └── subscribe/route.js # Save push subscriptions
│   ├── auth/callback/route.js # OAuth callback
│   ├── login/page.js          # Login page
│   ├── layout.js              # Root layout + SW registration
│   └── page.js                # Main app page
├── components/
│   ├── ChoreApp.js            # Main app (aquarium, chores, manage)
│   ├── HeatmapView.js         # Calendar heatmap
│   └── HouseholdSetup.js      # Create/join household flow
├── lib/
│   └── supabase.js            # Supabase client
public/
├── sw.js                      # Service worker for push
├── manifest.json              # PWA manifest
├── icon-192.png               # PWA icon
└── icon-512.png               # PWA icon
```

## License

[MIT](./LICENSE)
