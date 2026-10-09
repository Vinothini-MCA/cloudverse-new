# CloudVerse / EGSPEC deployment

## What was fixed

- Admin member photos, gallery photos and site logo are uploaded to Supabase Storage instead of browser localStorage/IndexedDB.
- Events, community members, contact details and slider metadata are stored in Supabase Postgres so every visitor sees the same data.
- Contact form submissions are stored in `contact_submissions`.
- Registration/login/profile data are stored in `app_users`; passwords are stored as hashes, not plaintext.
- Admin credentials are controlled by Vercel environment variables instead of hard-coded frontend credentials.
- Admin sessions use an HttpOnly signed cookie.
- Gemini API key remains server-side.
- Chatbot API now handles Gemini conversation history more safely, retries transient failures, and defaults to `gemini-2.5-flash`.
- Chatbot panel is anchored to the right side and no longer participates in page layout/overlaps normal content.
- No uploaded image is kept as a large base64 value in localStorage.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase_schema.sql`.
3. In Supabase Project Settings -> API, copy the project URL and the **service_role** key.
4. The `site-images` bucket is created by the SQL and is public so uploaded images can be displayed to visitors.
5. Keep the service_role key secret. It must only be used by the Vercel server.

## Vercel environment variables

Add these under Project Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` = `site-images`
- `SESSION_SECRET` = a long random string (at least 32 characters)
- `ADMIN_USERNAME` = your chosen admin username
- `ADMIN_PASSWORD` = your strong admin password
- `GEMINI_API_KEY`
- `GEMINI_MODEL` = `gemini-2.5-flash`

Do not upload the old `server/.env`. It contained an API key. If that key was real, rotate/revoke it in the Gemini/Google console before deploying.

## Deploy

From this project folder:

```bash
npm install
npm start
```

For Vercel, import this repository/project. `vercel.json` routes `/api/*` to the serverless API and serves `index.html`.

After adding/changing environment variables, redeploy.

## Local development

Create a root `.env` from `server/.env.example`, then:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Important

The first production load uses the built-in default content when a state row does not exist. Once an admin saves a section, that section becomes shared production data in Supabase.

The browser's localStorage is now used only for a small cached user profile/session display and chatbot history. It is not used as the database for admin content or uploaded images.
