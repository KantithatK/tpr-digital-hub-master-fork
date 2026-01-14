import * as React from 'react';

export const LoadingContext = React.createContext(null);

// ✅ เพิ่มตัวนี้
export function useLoading() {
  const ctx = React.useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within <LoadingProvider>');
  }
  return ctx;
}
