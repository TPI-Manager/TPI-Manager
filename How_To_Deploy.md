### Step 1: Supabase Setup (Database & Storage)

Since we are strictly using code to talk to the database, you need to manually create the tables first.

1. **Create Project**: Log in to [Supabase](https://supabase.com), create a new project, and wait for it to initialize.
2. **Run SQL Schema**:
    * Go to the **SQL Editor** (Sidebar icon with terminal lines).
    * Paste the following SQL code and click **Run**. This creates all your tables with the correct columns.

```sql
-- 1. Users Table
create table users (
  id text primary key,
  password text not null,
  "fullName" text,
  role text default 'student',
  department text,
  semester text,
  shift text,
  "studentId" text,
  "employeeId" text,
  "adminId" text,
  "createdAt" timestamptz default now()
);

-- 2. Announcements
create table announcements (
  id uuid default gen_random_uuid() primary key,
  title text,
  body text,
  "createdBy" text,
  "creatorId" text,
  "createdAt" timestamptz default now()
);

-- 3. Chat
create table chat (
  id uuid default gen_random_uuid() primary key,
  text text,
  "senderId" text,
  "senderName" text,
  department text,
  semester text,
  shift text,
  room text,
  images text[], 
  "seenBy" text[],
  "createdAt" timestamptz default now()
);

-- 4. Ask (Q&A)
create table ask (
  id uuid default gen_random_uuid() primary key,
  text text,
  department text,
  "senderId" text,
  "senderName" text,
  images text[],
  answers jsonb default '[]',
  "createdAt" timestamptz default now()
);

-- 5. Events & Schedules
create table events (
  id uuid default gen_random_uuid() primary key,
  title text,
  body text,
  department text,
  semester text,
  shift text,
  "creatorId" text,
  status text,
  "createdAt" timestamptz default now()
);

create table schedules (
  id uuid default gen_random_uuid() primary key,
  title text,
  "startTime" text,
  "endTime" text,
  days text[],
  department text,
  semester text,
  shift text,
  "creatorId" text,
  status text,
  "createdAt" timestamptz default now()
);
```

1. **Create Storage Bucket**:
    * Go to **Storage** (Sidebar icon).
    * Click **New Bucket**.
    * Name it: `uploads`.
    * **Toggle "Public bucket" -> ON**. (Crucial for images to load).
    * Click **Save**.

2. **Get Credentials**:
    * Go to **Settings (Gear Icon)** -> **API**.
    * Copy the **Project URL**.
    * Copy the **service_role** key (Secret). **Do NOT use the anon key.**

---

### Step 2: Vercel Deployment

1. **Push to GitHub**: Commit your code and push it to a new repository.
2. **Import to Vercel**:
    * Go to Vercel Dashboard -> Add New -> Project.
    * Import your repo.
3. **Project Settings**:
    * **Framework Preset**: Vite.
    * **Build Command**: `npm run build` (This runs your custom script in root `package.json`).
    * **Output Directory**: `dist`.
4. **Environment Variables**:
    * Add the following variables:

| Variable Name | Value |
| :--- | :--- |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase **service_role** key |
| `ADMIN_INIT_PASS` | `admin123` (Temporary password for the first admin login) |
| `NODE_VERSION` | `24.x` |

1. **Deploy**: Click **Deploy**.

---

### Step 3: Final Verification

1. **Admin Login**:
    * Open your new Vercel URL.
    * Login with ID: `admin`, Password: `admin123`.
    * Go to **My Profile** -> **Update Credentials** to change your password immediately.
2. **Test Images**:
    * Go to Chat.
    * Upload an image.
    * If it appears, Supabase Storage is working correctly.
3. **Test Realtime**:
    * Open the app in two different browser windows (one Admin, one Incognito Student).
    * Send a message from Admin.
    * It should appear instantly on the Student screen without refreshing.
