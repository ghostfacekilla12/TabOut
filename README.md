# 🔥 TabOut — اوعى تنسى

**Never forget who paid what** | **اوعى تنسى مين دفع إيه**

A complete bill-splitting mobile app built with React Native (Expo) and Supabase, designed with Egyptian Arabic street slang support.

---

## 🚀 Features

- **Multi-language support**: English, Egyptian Arabic (street slang), and Formal Arabic
- **Proportional tax/service splitting**: Each person pays their fair share of tax/service based on their subtotal
- **Itemized splits**: Assign specific items to people, auto-calculate tax/service proportionally
- **Equal splits**: Split total equally with configurable service/tax/delivery fee toggles
- **Friends management**: Add friends by email or phone, track balances
- **Real-time updates**: Supabase realtime subscriptions for live split updates
- **Payment tracking**: Mark payments as cash, Vodafone Cash, InstaPay, bank transfer
- **Stats**: Monthly spending overview and leaderboard
- **Notifications**: Local reminders for pending payments

## 📱 Screens

| Screen | Description |
|--------|-------------|
| Login / Signup | Email-based authentication via Supabase |
| Home | Balance summary + recent splits |
| New Split | Create equal or itemized splits with toggleable charges |
| Split Detail | View breakdown, mark as paid, delete |
| Split Breakdown | Itemized view with proportional tax/service per person |
| Friends | List friends, search, add by email/phone |
| Friend Detail | Balance + split history with a specific friend |
| Stats | Monthly spend chart + totals |

## 🛠️ Tech Stack

- **React Native** with Expo (~52.0.0)
- **TypeScript** (strict mode)
- **Supabase** (auth + database + realtime + storage)
- **React Navigation** (native stack + bottom tabs)
- **i18next + react-i18next** (internationalization)
- **React Native Paper** (UI components)
- **Expo Notifications** (push/local notifications)

## 📂 Project Structure

```
src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   ├── HomeScreen.tsx
│   ├── NewSplitScreen.tsx
│   ├── SplitDetailScreen.tsx
│   ├── SplitBreakdownScreen.tsx
│   ├── FriendsScreen.tsx
│   ├── FriendDetailScreen.tsx
│   └── StatsScreen.tsx
├── components/
│   ├── SplitCard.tsx
│   ├── FriendCard.tsx
│   ├── BalanceDisplay.tsx
│   ├── TaxServiceToggle.tsx
│   └── LanguageSwitcher.tsx
├── services/
│   ├── supabase.ts
│   ├── AuthContext.tsx
│   ├── i18n.ts
│   └── notifications.ts
├── locales/
│   ├── en.json        (English)
│   ├── ar-EG.json     (Egyptian Arabic — street slang)
│   └── ar.json        (Formal Arabic)
├── types/
│   └── index.ts
├── utils/
│   ├── splitCalculator.ts
│   ├── currencyFormatter.ts
│   ├── dateFormatter.ts
│   └── theme.ts
└── navigation/
    └── AppNavigator.tsx
```

## ⚙️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/ghostfacekilla2/TabOut.git
cd TabOut
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the app

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 🗄️ Supabase Tables Required

```sql
-- profiles
create table profiles (
  id uuid references auth.users primary key,
  name text not null,
  email text,
  phone text,
  avatar_url text,
  language text default 'en',
  currency text default 'EGP',
  default_service_percentage numeric default 12,
  default_tax_percentage numeric default 14
);

-- splits
create table splits (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  subtotal numeric not null,
  total_amount numeric not null,
  currency text default 'EGP',
  has_service boolean default false,
  service_percentage numeric default 0,
  service_amount numeric default 0,
  has_tax boolean default false,
  tax_percentage numeric default 0,
  tax_amount numeric default 0,
  has_delivery_fee boolean default false,
  delivery_fee numeric default 0,
  split_type text default 'equal',
  service_tax_split_method text default 'proportional',
  created_by uuid references profiles(id),
  paid_by uuid references profiles(id),
  receipt_url text,
  settled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- split_participants
create table split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid references splits(id) on delete cascade,
  user_id uuid references profiles(id),
  item_subtotal numeric default 0,
  service_share numeric default 0,
  tax_share numeric default 0,
  delivery_share numeric default 0,
  total_amount numeric not null,
  amount_paid numeric default 0,
  status text default 'pending',
  payment_method text,
  paid_at timestamptz,
  notes text
);

-- items
create table items (
  id uuid primary key default gen_random_uuid(),
  split_id uuid references splits(id) on delete cascade,
  name text not null,
  price numeric not null,
  ordered_by uuid references profiles(id)
);

-- friendships
create table friendships (
  user_id uuid references profiles(id),
  friend_id uuid references profiles(id),
  primary key (user_id, friend_id)
);
```

## 🧮 Tax/Service Calculation Logic

The split calculator (`src/utils/splitCalculator.ts`) implements proportional tax/service splitting:

```
// Example: 3 people, restaurant bill
Subtotal: 330 EGP
Service (12%): 39.60 EGP  → (330 × 0.12)
Tax (14%): 46.20 EGP       → (330 × 0.14)
Total: 415.80 EGP

Person A (subtotal: 100):
  Service share: (100/330) × 39.60 = 12.00
  Tax share: (100/330) × 46.20 = 14.00
  Total: 126.00

Person B (subtotal: 75):
  Service share: (75/330) × 39.60 = 9.00
  Tax share: (75/330) × 46.20 = 10.50
  Total: 94.50
```

## 🌍 Egyptian Arabic Feature

The app supports Egyptian street slang (`ar-EG`) for a natural feel:

| English | Egyptian Arabic (slang) |
|---------|-------------------------|
| "You owe Ramadan" | "عليك لرمضان" |
| "Owes you" | "عليه ليك" |
| "Don't forget" | "اوعى تنسى" |
| "Just now" | "دلوقتي" |
| "Yesterday" | "امبارح" |
| "Loading..." | "لحظة..." |

## 🎨 Color Scheme

| Color | Hex | Usage |
|-------|-----|-------|
| Egyptian Gold | `#D4AF37` | Primary actions, highlights |
| Nile Blue | `#1B4D89` | Header, accent |
| Success Green | `#2ECC71` | Positive balances, paid status |
| Warning Red | `#E74C3C` | Negative balances, pending |

## 🔐 Security

- `.env` is gitignored — never committed
- Supabase Row Level Security (RLS) enforced on all tables
- Environment variables accessed via `EXPO_PUBLIC_` prefix
- Input validation on all forms

## 📸 Screenshots

*Coming soon*

---

**اوعى تنسى** — Built for the Egyptian market 🇪🇬