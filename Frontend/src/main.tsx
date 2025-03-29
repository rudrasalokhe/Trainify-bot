// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

// Replace with your Publishable Key from Clerk Dashboard
const PUBLISHABLE_KEY = 'pk_test_cmVsZXZhbnQtc2N1bHBpbi0zNS5jbGVyay5hY2NvdW50cy5kZXYk';

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);