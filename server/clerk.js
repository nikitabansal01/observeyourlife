// Clerk's Express middleware reads CLERK_PUBLISHABLE_KEY on the server.
// Vercel's Clerk integration often only sets NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
if (!process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    || '';
}

export function isClerkEnabled() {
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
}
