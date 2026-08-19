import { useState } from 'react';
import { 
  useListTrades,
  useListAccounts,
  useListInstruments,
  useListStrategies
} from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, Search, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type SortKey = 'createdAt' | 'openedAt' | 'instrument' | 'direction' | 'size' | 'avgEntry' | 'avgExit' | 'netPnl' | 'riskAmount' | 'riskPercentage' | 'actualR' | 'status';
type SortDirection = 'asc' | 'desc';

function SortHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  currentSortDirection: SortDirection;
  onSort: (sortKey: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSortKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}
      aria-sort={isActive ? (currentSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-foreground ${align === 'right' ? 'justify-end' : ''} ${isActive ? 'text-foreground' : ''}`}
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function formatCurrency(val: number | null | undefined, currency = 'USD') {
  if (val == null) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
  } catch (e) {
    return `${val < 0 ? '-' : ''}${currency} ${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function formatNumber(val: number | null | undefined, decimals = 2) {
  if (val == null) return '-';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
}

export default function Journal() {
  const [, setLocation] = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    accountId: 'all',
    instrumentId: 'all',
    direction: 'all',
    status: 'all',
    outcome: 'all',
    strategyId: 'all'
  });
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const limit = 20;

  const { data: accounts } = useListAccounts();
  const { data: instruments } = useListInstruments();
  const { data: strategies } = useListStrategies();

  const queryParams = {
    limit,
    offset: (page - 1) * limit,
    ...(filters.accountId !== 'all' && { accountId: Number(filters.accountId) }),
    ...(filters.instrumentId !== 'all' && { instrumentId: Number(filters.instrumentId) }),
    ...(filters.direction !== 'all' && { direction: filters.direction as any }),
    ...(filters.status !== 'all' && { status: filters.status as any }),
    ...(filters.outcome !== 'all' && { outcome: filters.outcome as any }),
    ...(filters.strategyId !== 'all' && { strategyId: Number(filters.strategyId) }),
    sortBy: sortKey,
    sortDir: sortDirection,
  };

  const { data: tradesPage, isLoading } = useListTrades(queryParams);
  const trades = (tradesPage as any)?.trades || [];
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(nextSortKey);
      setSortDirection('desc');
    }
    setPage(1);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Journal</h2>
          <p className="text-muted-foreground">Review and analyze your trades.</p>
        </div>
        <Button onClick={() => setLocation('/trades/new')} className="font-bold">
          Add Trade
        </Button>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="w-full space-y-2">
        <div className="flex items-center justify-between border border-border p-3 rounded-md bg-card">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filters {Object.values(filters).filter(v => v !== 'all').length > 0 && `(${Object.values(filters).filter(v => v !== 'all').length} active)`}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-4">
          <Card className="bg-card">
            <CardContent className="p-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Account</label>
                <Select value={filters.accountId} onValueChange={(v) => handleFilterChange('accountId', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Instrument</label>
                <Select value={filters.instrumentId} onValueChange={(v) => handleFilterChange('instrumentId', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {instruments?.map(inst => <SelectItem key={inst.id} value={inst.id.toString()}>{inst.symbol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Direction</label>
                <Select value={filters.direction} onValueChange={(v) => handleFilterChange('direction', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="partially_closed">Partially Closed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                <Select value={filters.outcome} onValueChange={(v) => handleFilterChange('outcome', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="breakeven">Breakeven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Strategy</label>
                <Select value={filters.strategyId} onValueChange={(v) => handleFilterChange('strategyId', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {strategies?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Card className="bg-card shadow-sm border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-accent/30 border-b border-border">
              <tr>
                <SortHeader label="Date Added" sortKey="createdAt" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Date Opened" sortKey="openedAt" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Symbol" sortKey="instrument" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Dir" sortKey="direction" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Position Size" sortKey="size" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="Avg Entry" sortKey="avgEntry" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="Avg Exit" sortKey="avgExit" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="Net P&L" sortKey="netPnl" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="Risk" sortKey="riskAmount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="Risk %" sortKey="riskPercentage" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="R" sortKey="actualR" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortHeader label="Status" sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={13} className="px-4 py-4"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">
                    No trades found matching filters.
                  </td>
                </tr>
              ) : (
                trades.map((trade: any) => {
                  const netPnl = trade.calculated?.realizedNetPnl;
                  const isPos = netPnl > 0;
                  const isNeg = netPnl < 0;
                  const currency = trade.settlementCurrency || 'USD';
                  
                  return (
                    <tr 
                      key={trade.id} 
                      className="hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/trades/${trade.id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{trade.createdAt ? format(new Date(trade.createdAt), 'MMM dd, HH:mm') : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{trade.calculated?.openedAt ? format(new Date(trade.calculated.openedAt), 'MMM dd, HH:mm') : '-'}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{trade.instrumentSymbol}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={trade.direction === 'long' ? 'text-primary border-primary/30' : 'text-destructive border-destructive/30'}>
                          {trade.direction.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(trade.calculated?.positionValue, currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNumber(trade.calculated?.avgEntry, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNumber(trade.calculated?.avgExit, 4)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isPos ? 'text-primary' : isNeg ? 'text-destructive' : ''}`}>
                        {formatCurrency(netPnl, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(trade.calculated?.riskAmount, currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{trade.calculated?.riskPercentage != null ? `${formatNumber(trade.calculated.riskPercentage)}%` : '-'}</td>
                      <td className={`px-4 py-3 text-right font-mono ${(trade.calculated?.actualR ?? 0) > 0 ? 'text-primary' : (trade.calculated?.actualR ?? 0) < 0 ? 'text-destructive' : ''}`}>
                        {trade.calculated?.actualR != null ? `${formatNumber(trade.calculated.actualR)}R` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={
                          trade.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                          trade.status === 'partially_closed' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-muted text-muted-foreground'
                        }>
                          {trade.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setLocation(`/trades/${trade.id}`); }}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {trades.length} trades
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={trades.length < limit} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
