import { useState, useRef, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  useGetTrade, 
  useCreateExecution,
  useDeleteExecution,
  useUpsertTradeReview,
  useGetTradeReview,
  getGetTradeQueryKey,
  getGetTradeReviewQueryKey
} from '@workspace/api-client-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Trash2, Save, Loader2, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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

export default function TradeDetail() {
  const [, params] = useRoute('/trades/:id');
  const [, setLocation] = useLocation();
  const tradeId = Number(params?.id);
  const queryClient = useQueryClient();

  const { data: trade, isLoading } = useGetTrade(tradeId, { query: { enabled: !!tradeId, queryKey: getGetTradeQueryKey(tradeId) } });
  const { data: review } = useGetTradeReview(tradeId, { query: { enabled: !!tradeId, queryKey: getGetTradeReviewQueryKey(tradeId) } });
  
  const createExecution = useCreateExecution();
  const deleteExecution = useDeleteExecution();
  const upsertReview = useUpsertTradeReview();

  const [execDialogOpen, setExecDialogOpen] = useState(false);
  const [newExec, setNewExec] = useState({
    side: 'buy',
    executedAt: new Date().toISOString().slice(0,16),
    price: '',
    quantity: '',
    quantityUnit: 'contracts',
    commission: '0',
    fees: '0',
  });

  // Review State
  const [reviewState, setReviewState] = useState({
    ruleAdherence: 0,
    tradeQuality: 0,
    reviewNotes: '',
    whatWentWell: '',
    whatWentWrong: '',
    lessonsLearned: ''
  });
  
  const initializedReview = useRef<number | null>(null);

  useEffect(() => {
    if (review && initializedReview.current !== tradeId) {
      initializedReview.current = tradeId;
      setReviewState({
        ruleAdherence: review.ruleAdherence || 0,
        tradeQuality: review.tradeQuality || 0,
        reviewNotes: review.reviewNotes || '',
        whatWentWell: review.whatWentWell || '',
        whatWentWrong: review.whatWentWrong || '',
        lessonsLearned: review.lessonsLearned || ''
      });
    }
  }, [review, tradeId]);

  if (isLoading || !trade) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currency = trade.settlementCurrency || 'USD';
  const calc = (trade.calculated || {}) as any;

  const handleAddExecution = () => {
    createExecution.mutate({
      tradeId,
      data: {
        side: newExec.side as any,
        executedAt: new Date(newExec.executedAt).toISOString(),
        price: Number(newExec.price),
        quantity: Number(newExec.quantity),
        quantityUnit: newExec.quantityUnit,
        commission: Number(newExec.commission) || 0,
        fees: Number(newExec.fees) || 0
      }
    }, {
      onSuccess: () => {
        toast.success("Execution added");
        setExecDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetTradeQueryKey(tradeId) });
      },
      onError: () => toast.error("Failed to add execution")
    });
  };

  const handleDeleteExec = (execId: number) => {
    if (!confirm("Delete execution?")) return;
    deleteExecution.mutate({ id: execId }, {
      onSuccess: () => {
        toast.success("Execution deleted");
        queryClient.invalidateQueries({ queryKey: getGetTradeQueryKey(tradeId) });
      },
      onError: () => toast.error("Failed to delete execution")
    });
  };

  const handleSaveReview = () => {
    upsertReview.mutate({
      tradeId,
      data: {
        ruleAdherence: reviewState.ruleAdherence || null,
        tradeQuality: reviewState.tradeQuality || null,
        reviewNotes: reviewState.reviewNotes || null,
        whatWentWell: reviewState.whatWentWell || null,
        whatWentWrong: reviewState.whatWentWrong || null,
        lessonsLearned: reviewState.lessonsLearned || null
      }
    }, {
      onSuccess: () => {
        toast.success("Review saved");
        queryClient.invalidateQueries({ queryKey: getGetTradeReviewQueryKey(tradeId) });
      },
      onError: () => toast.error("Failed to save review")
    });
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(star => (
          <Star 
            key={star} 
            className={`w-6 h-6 cursor-pointer transition-colors ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => onChange(star)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/journal')}><ChevronLeft className="w-5 h-5" /></Button>
        <h2 className="text-3xl font-bold tracking-tight">{trade.instrumentSymbol}</h2>
        <Badge variant="outline" className={trade.direction === 'long' ? 'text-primary border-primary/30' : 'text-destructive border-destructive/30'}>
          {trade.direction.toUpperCase()}
        </Badge>
        <Badge variant="secondary" className={
          trade.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
          trade.status === 'partially_closed' ? 'bg-orange-500/20 text-orange-400' :
          'bg-muted text-muted-foreground'
        }>
          {trade.status.replace('_', ' ').toUpperCase()}
        </Badge>
        <div className="ml-auto text-sm text-muted-foreground font-mono">
          {calc.openedAt && format(new Date(calc.openedAt), 'MMM dd, yyyy HH:mm')} 
          {calc.closedAt && ` - ${format(new Date(calc.closedAt), 'MMM dd, yyyy HH:mm')}`}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-card col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-mono font-bold ${(calc.realizedNetPnl || 0) > 0 ? 'text-primary' : (calc.realizedNetPnl || 0) < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(calc.realizedNetPnl, currency)}
            </div>
            <div className="mt-2 flex gap-4 text-sm font-mono text-muted-foreground">
              <div>Gross: {formatCurrency(calc.realizedGrossPnl, currency)}</div>
              <div>R-Multi: {formatNumber(calc.actualR)}R</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Account</CardTitle></CardHeader>
          <CardContent><div className="font-medium">{trade.accountName}</div></CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Strategy</CardTitle></CardHeader>
          <CardContent>
            <div className="font-medium">{trade.strategyName || '-'}</div>
            <div className="text-xs text-muted-foreground">{trade.setupName || '-'}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Costs</CardTitle></CardHeader>
          <CardContent className="font-mono text-sm">
            <div>Comms: {formatCurrency(calc.totalCommissions, currency)}</div>
            <div>Fees: {formatCurrency(calc.totalFees, currency)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Executions</CardTitle>
            <Dialog open={execDialogOpen} onOpenChange={setExecDialogOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1"/> Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Execution</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Side</Label>
                      <Select value={newExec.side} onValueChange={(v) => setNewExec({...newExec, side: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="sell">Sell</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date/Time</Label>
                      <Input type="datetime-local" value={newExec.executedAt} onChange={e => setNewExec({...newExec, executedAt: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Price</Label><Input type="number" step="any" value={newExec.price} onChange={e => setNewExec({...newExec, price: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" step="any" value={newExec.quantity} onChange={e => setNewExec({...newExec, quantity: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Commission</Label><Input type="number" step="any" value={newExec.commission} onChange={e => setNewExec({...newExec, commission: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Fees</Label><Input type="number" step="any" value={newExec.fees} onChange={e => setNewExec({...newExec, fees: e.target.value})} /></div>
                  </div>
                  <Button onClick={handleAddExecution} disabled={createExecution.isPending}>Submit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {trade.executions?.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">No executions logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Side</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trade.executions?.map((ex: any) => (
                      <tr key={ex.id}>
                        <td className="py-2">{format(new Date(ex.executedAt), 'MM/dd HH:mm')}</td>
                        <td className={`py-2 font-medium ${ex.side === 'buy' ? 'text-blue-400' : 'text-orange-400'}`}>{ex.side.toUpperCase()}</td>
                        <td className="py-2 text-right font-mono">{formatNumber(ex.price, 4)}</td>
                        <td className="py-2 text-right font-mono">{ex.quantity}</td>
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExec(ex.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader><CardTitle>Plan vs Actual</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-muted-foreground">Metric</div>
              <div className="font-medium">Planned</div>
              <div className="font-medium">Actual</div>
              
              <div className="text-muted-foreground border-t border-border pt-2">Position</div>
              <div className="font-mono border-t border-border pt-2">{trade.plannedPositionSize || '-'}</div>
              <div className="font-mono border-t border-border pt-2">{calc.openPositionSize || '-'}</div>

              <div className="text-muted-foreground border-t border-border pt-2">Entry Price</div>
              <div className="font-mono border-t border-border pt-2">{trade.plannedEntry || '-'}</div>
              <div className="font-mono border-t border-border pt-2">{formatNumber(calc.avgEntry, 4) || '-'}</div>

              <div className="text-muted-foreground border-t border-border pt-2">Exit Price</div>
              <div className="font-mono border-t border-border pt-2">{trade.profitTarget || '-'}</div>
              <div className="font-mono border-t border-border pt-2">{formatNumber(calc.avgExit, 4) || '-'}</div>

              <div className="text-muted-foreground border-t border-border pt-2">Risk</div>
              <div className="font-mono border-t border-border pt-2">{trade.plannedRisk ? formatCurrency(trade.plannedRisk, currency) : '-'}</div>
              <div className="font-mono border-t border-border pt-2">-</div>
            </div>
            
            <div className="pt-4 space-y-2">
              <div className="text-sm font-medium">Tags & Confluences</div>
              <div className="flex flex-wrap gap-2">
                {trade.tags?.map((t: any) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
                {trade.confluences?.map((c: any) => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Trade Review</CardTitle>
          <Button size="sm" onClick={handleSaveReview} disabled={upsertReview.isPending}>
            {upsertReview.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Review
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-12">
            <StarRating label="Rule Adherence" value={reviewState.ruleAdherence} onChange={(v) => setReviewState(prev => ({...prev, ruleAdherence: v}))} />
            <StarRating label="Trade Quality" value={reviewState.tradeQuality} onChange={(v) => setReviewState(prev => ({...prev, tradeQuality: v}))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>What went well?</Label>
              <Textarea 
                value={reviewState.whatWentWell} 
                onChange={e => setReviewState(prev => ({...prev, whatWentWell: e.target.value}))} 
                className="bg-background"
                placeholder="Ex: Patient execution, good sizing..." 
              />
            </div>
            <div className="space-y-2">
              <Label>What went wrong?</Label>
              <Textarea 
                value={reviewState.whatWentWrong} 
                onChange={e => setReviewState(prev => ({...prev, whatWentWrong: e.target.value}))} 
                className="bg-background"
                placeholder="Ex: Moved stop too early, FOMO entry..." 
              />
            </div>
            <div className="space-y-2">
              <Label>Lessons Learned</Label>
              <Textarea 
                value={reviewState.lessonsLearned} 
                onChange={e => setReviewState(prev => ({...prev, lessonsLearned: e.target.value}))} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea 
                value={reviewState.reviewNotes} 
                onChange={e => setReviewState(prev => ({...prev, reviewNotes: e.target.value}))} 
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
