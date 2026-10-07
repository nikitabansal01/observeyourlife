import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { Analytics } from '@vercel/analytics/react';
import App from './App.jsx';
import { clerkAppearance, getClerkPublishableKey, isClerkConfigured } from './clerk.js';
import './index.css';

const publishableKey = getClerkPublishableKey();

if (!isClerkConfigured) {
  console.warn(
    'Missing Clerk publishable key. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in client/.env.local (or via Vercel env vars). Running without sign-in.',
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
    <Analytics />
  </StrictMode>,
);
