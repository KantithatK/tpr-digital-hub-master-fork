import * as React from 'react';

export const NotifyContext = React.createContext(null);

export function useNotify() {
  const ctx = React.useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used within NotifyProvider');
  return ctx;
}
