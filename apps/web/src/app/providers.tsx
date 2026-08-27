import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '../lib/query-client.js';
import { PwaUpdateNotice } from '../components/layout/PwaUpdateNotice.js';

export function Providers({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <PwaUpdateNotice />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
