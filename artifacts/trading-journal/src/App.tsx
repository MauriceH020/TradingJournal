import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { AppShell } from '@/components/layout/shell';

// Placeholder Pages
import Dashboard from '@/pages/dashboard';
import Journal from '@/pages/journal';
import TradeDetail from '@/pages/trade-detail';
import AddTrade from '@/pages/add-trade';
import Strategies from '@/pages/strategies';
import Accounts from '@/pages/accounts';
import Settings from '@/pages/settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/journal" component={Journal} />
          <Route path="/trades/new" component={AddTrade} />
          <Route path="/trades/:id" component={TradeDetail} />
          <Route path="/strategies" component={Strategies} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
