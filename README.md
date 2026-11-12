# Vulcatic

A photo/text sharing app you can give to people as an **APK file**, without the Play Store.
It also runs as a website.

- **Frontend:** React Native + [Expo](https://expo.dev) (Expo Router, TypeScript)
- **Backend + database:** [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage)
- **Build/share:** EAS Build → `.apk` → share the link (e.g. GitHub Releases)

## Features

- Sign up / sign in with email + password (with a username), show/hide password, forgot password
- Feed of everyone's posts (photo + caption), pull to refresh, loads more as you scroll
- Share a post with a photo from the **camera** or **gallery**. It appears in the feed instantly
  while it uploads, with **Try again** if the upload fails
- Like / unlike posts, or **double-tap** a photo to like it
- Profile page with your posts, delete your own posts, sign out
- Friendly empty / error / no-internet screens with the Vulcatic gecko
- Light and dark mode in the Vulcatic colors (orange `#D84300`, gecko green, charcoal)

## Project layout

```
app/                    screens (Expo Router: the file name is the route)
  _layout.tsx           login gate: signed out → sign-in, signed in → tabs
  (auth)/sign-in.tsx    sign in / sign up / forgot password
  reset-password.tsx    choose a new password (opened from the reset email)
  (tabs)/index.tsx      feed
  (tabs)/new.tsx        new post
  (tabs)/profile.tsx    profile
components/             PostCard, PostList, Button, TextField, EmptyState, SkeletonCard…
lib/                    supabase client, auth, posts, pending uploads, theme, errors
supabase/migrations/    database tables, security rules, storage bucket
eas.json                build profiles (preview = APK)
```

## 1. Set up the database (Supabase)

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste everything from
   `supabase/migrations/0001_init.sql`, and click **Run**.
   This creates the `profiles`, `posts` and `likes` tables, the security rules,
   and the `post-images` storage bucket.
3. *(Optional, for easy testing)* **Authentication → Sign In / Providers → Email**:
   turn off **Confirm email** so new accounts can sign in right away.
4. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** (or legacy **anon**) key.
5. **For "Forgot password?"**: go to **Authentication → URL Configuration → Redirect URLs** and add:
   - `vulcatic://**` (the installed APK)
   - `exp://**` (testing in Expo Go)

## 2. Run it on your computer / phone

```bash
npm install
cp .env.example .env      # then paste your URL and anon key into .env
npx expo start
```

- Press **w** to open it in the browser.
- Or install **Expo Go** on your Android phone and scan the QR code.

## 3. Build the APK to share

```bash
npm install -g eas-cli
eas login                 # free Expo account
eas init                  # links this project to your Expo account (first time only)
```

Give the build your Supabase keys (the `.env` file is not uploaded):

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://xxxx.supabase.co --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key --visibility plaintext
```

Then build:

```bash
npm run build:apk         # = eas build -p android --profile preview
```

When it finishes (about 10–15 min) you get a download link for the `.apk`.

## 4. Share it

- Upload the `.apk` to **GitHub → Releases → Draft a new release** and send people the link.
- On their Android phone they open the file, allow **"Install unknown apps"** once, and install.
- iPhone users can't install APKs. They can use the web version: run `npx expo export -p web`
  and host the `dist/` folder for free on Netlify, Vercel or GitHub Pages.

For a new version: bump `"version"` in `app.json`, build again, and upload the new APK.

## Security notes

- The **anon key** is meant to be public. Data is protected by the Row Level Security
  rules in the SQL file (people can only create/delete their own posts and likes).
- Never put the **service_role** key in the app or in this repo.
