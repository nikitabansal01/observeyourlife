import { dark } from '@clerk/themes';

export function getClerkPublishableKey() {
  return import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
}

export const clerkAppearance = {
  theme: dark,
  variables: {
    colorBackground: '#0e0020',
    colorInputBackground: '#12001f',
    colorInput: '#12001f',
    colorInputForeground: '#fff5f8',
    colorPrimary: '#ff006e',
    colorPrimaryForeground: '#fff5f8',
    colorForeground: '#fff5f8',
    colorText: '#fff5f8',
    colorTextSecondary: '#c4a8d4',
    colorNeutral: '#fff5f8',
    borderRadius: '10px',
  },
  elements: {
    providerIcon__apple: { filter: 'invert(1)' },
    providerIcon__github: { filter: 'invert(1)' },
    providerIcon__okx_wallet: { filter: 'invert(1)' },
    providerIcon__vercel: { filter: 'invert(1)' },
  },
};
