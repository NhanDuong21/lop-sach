import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false }, mutations: { retry: false } } });
export function Providers({ children }: PropsWithChildren): React.JSX.Element { return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>; }
