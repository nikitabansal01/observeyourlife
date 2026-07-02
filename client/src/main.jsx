import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import { clerkAppearance, getClerkPublishableKey } from './clerk.js';
import './index.css';

const publishableKey = getClerkPublishableKey();

if (!publishableKey) {
  console.warn(
    'Missing Clerk publishable key. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in client/.env.local (or via Vercel env vars).',
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      <App />
    </ClerkProvider>
  </StrictMode>,
);
