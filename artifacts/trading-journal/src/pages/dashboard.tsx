import { useState, useMemo } from 'react';
import { 
  useGetDashboardStats, 
  useGetDashboardEquityCurve,
  useGetDashboardPnlByDay,
  useGetDashboardPnlByStrategy,
  useGetDashboardMonthlyPnl,
  useGetDashboardRecentTrades,
  useGetDashboardWinLoss,
  useListAccounts
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell
} from 'recharts';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = {
  primary: 'hsl(var(--primary))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
  card: 'hsl(var(--card))',
  border: 'hsl(var(--border))'
};

function formatCurrency(val: number | null | undefined, currency: string = 'USD') {
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

function formatPercent(val: number | null | undefined) {
  if (val == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [accountId, setAccountId] = useState<string>('all');

  // Compute dateFrom
  const dateFrom = useMemo(() => {
    const today = new Date();
    switch (dateRange) {
      case '30d': return format(subDays(today, 30), 'yyyy-MM-dd');
      case 'month': return format(startOfMonth(today), 'yyyy-MM-dd');
      case 'year': return format(startOfYear(today), 'yyyy-MM-dd');
      case 'all': return undefined;
      default: return undefined;
    }
  }, [dateRange]);

  const params = {
    dateFrom,
    accountId: accountId !== 'all' ? Number(accountId) : undefined,
  };

  const { data: accounts } = useListAccounts();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(params);
  const { data: equityCurveGroups, isLoading: equityLoading } = useGetDashboardEquityCurve(params);
  const { data: pnlByDayGroups, isLoading: pnlByDayLoading } = useGetDashboardPnlByDay(params);
  const { data: pnlByStrategy, isLoading: pnlByStrategyLoading } = useGetDashboardPnlByStrategy(params);
  const { data: monthlyPnlGroups, isLoading: monthlyPnlLoading } = useGetDashboardMonthlyPnl(params);
  const { data: recentTrades, isLoading: recentTradesLoading } = useGetDashboardRecentTrades(params);
  const { data: winLoss, isLoading: winLossLoading } = useGetDashboardWinLoss(params);

  // API returns currency-grouped arrays
  const statsByCurrency = useMemo(() => (Array.isArray(stats) ? stats : []), [stats]);
  
  // Use first currency group for charts, or merge all points sorted by date
  const equityPoints = useMemo(() => {
    if (!equityCurveGroups?.length) return [];
    // For single currency or "USD" group first, show first group
    const usdGroup = equityCurveGroups.find((g: any) => g.currency === 'USD') || equityCurveGroups[0];
    return (usdGroup?.points || []).map((p: any) => ({
      date: format(new Date(p.date), 'MM/dd'),
      equity: p.cumulativePnl,
    }));
  }, [equityCurveGroups]);

  const pnlByDay = useMemo(() => {
    if (!pnlByDayGroups?.length) return [];
    const usdGroup = pnlByDayGroups.find((g: any) => g.currency === 'USD') || pnlByDayGroups[0];
    return (usdGroup?.days || []).map((d: any) => ({ day: d.dayName.slice(0, 3), pnl: d.netPnl }));
  }, [pnlByDayGroups]);

  const monthlyPnl = useMemo(() => {
    if (!monthlyPnlGroups?.length) return [];
    const usdGroup = monthlyPnlGroups.find((g: any) => g.currency === 'USD') || monthlyPnlGroups[0];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (usdGroup?.months || []).map((m: any) => ({ month: monthNames[m.month - 1], pnl: m.netPnl }));
  }, [monthlyPnlGroups]);

  const StatBox = ({ title, value, type = 'neutral', currency }: { title: string, value: string | number, type?: 'positive' | 'negative' | 'neutral', currency?: string }) => (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-mono font-bold ${
          type === 'positive' ? 'text-primary' : type === 'negative' ? 'text-destructive' : 'text-foreground'
        }`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Good afternoon. Here's your trading summary.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts?.map(acc => (
                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name} ({acc.baseCurrency})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        statsByCurrency.map((statSet: any, idx: number) => {
          const currency = statSet.currency || 'USD';
          const isPos = (v: number) => v > 0;
          const isNeg = (v: number) => v < 0;
          
          return (
            <div key={idx} className="space-y-4">
              {statsByCurrency.length > 1 && (
                <h3 className="text-xl font-bold font-mono text-primary mt-6 mb-2">{currency} Portfolio</h3>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatBox title="Net P&L" value={formatCurrency(statSet.netPnl, currency)} type={isPos(statSet.netPnl) ? 'positive' : isNeg(statSet.netPnl) ? 'negative' : 'neutral'} />
                <StatBox title="Trade Count" value={statSet.tradeCount || 0} />
                <StatBox title="Win Rate" value={formatPercent(statSet.winRate)} />
                <StatBox title="Profit Factor" value={formatNumber(statSet.profitFactor)} />
                <StatBox title="Avg Winner" value={formatCurrency(statSet.avgWinner, currency)} type="positive" />
                <StatBox title="Avg Loser" value={formatCurrency(statSet.avgLoser, currency)} type="negative" />
                <StatBox title="Avg R" value={formatNumber(statSet.avgR)} type={isPos(statSet.avgR) ? 'positive' : isNeg(statSet.avgR) ? 'negative' : 'neutral'} />
                <StatBox title="Expectancy" value={formatCurrency(statSet.expectancy, currency)} type={isPos(statSet.expectancy) ? 'positive' : isNeg(statSet.expectancy) ? 'negative' : 'neutral'} />
              </div>
            </div>
          )
        })
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            {equityLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                    itemStyle={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <Line type="stepAfter" dataKey="equity" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>P&L by Day</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            {pnlByDayLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                    cursor={{ fill: 'hsl(var(--accent))' }}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {pnlByDay.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLORS.primary : COLORS.destructive} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>Monthly P&L</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px]">
            {monthlyPnlLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                    cursor={{ fill: 'hsl(var(--accent))' }}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {monthlyPnl.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLORS.primary : COLORS.destructive} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTradesLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-accent/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-md">Date</th>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Dir</th>
                      <th className="px-4 py-3 text-right">Net P&L</th>
                      <th className="px-4 py-3 text-right rounded-tr-md">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentTrades || []).slice(0, 7).map((trade: any) => (
                      <tr key={trade.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">{trade.closedAt ? format(new Date(trade.closedAt), 'MMM dd, HH:mm') : (trade.openedAt ? format(new Date(trade.openedAt), 'MMM dd, HH:mm') : '-')}</td>
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/trades/${trade.id}`} className="hover:underline">{trade.instrumentSymbol || 'Unknown'}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={trade.direction === 'long' ? 'text-primary border-primary/30' : 'text-destructive border-destructive/30'}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${trade.netPnl > 0 ? 'text-primary' : trade.netPnl < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(trade.netPnl, trade.settlementCurrency)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          -
                        </td>
                      </tr>
                    ))}
                    {(!recentTrades || recentTrades.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No recent trades found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
