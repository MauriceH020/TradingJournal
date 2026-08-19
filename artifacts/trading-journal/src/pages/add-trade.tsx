import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { 
  useCreateTrade, 
  useListAccounts, 
  useListInstruments,
  useListStrategies,
  useListSetups,
  useListConfluenceCategories,
  useListTags,
  TradeInputDirection
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const tradeSchema = z.object({
  accountId: z.coerce.number().min(1, "Account is required"),
  instrumentId: z.coerce.number().min(1, "Instrument is required"),
  direction: z.enum(['long', 'short']),
  strategyId: z.coerce.number().optional(),
  setupId: z.coerce.number().optional(),
  plannedEntry: z.coerce.number().optional(),
  initialStopLoss: z.coerce.number().optional(),
  profitTarget: z.coerce.number().optional(),
  plannedPositionSize: z.coerce.number().optional(),
  plannedRisk: z.coerce.number().optional(),
  plannedRiskPercentage: z.coerce.number().optional(),
  tradeLevelCostAdjustment: z.coerce.number().optional(),
  notes: z.string().optional(),
  confluenceIds: z.array(z.number()).default([]),
  tagIds: z.array(z.number()).default([]),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

export default function AddTrade() {
  const [, setLocation] = useLocation();
  const { data: accounts, isLoading: accountsLoading } = useListAccounts();
  const { data: instruments, isLoading: instrumentsLoading } = useListInstruments();
  const { data: strategies } = useListStrategies();
  const { data: setups } = useListSetups();
  const { data: categories } = useListConfluenceCategories();
  const { data: tags } = useListTags();
  
  const createTrade = useCreateTrade();

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      direction: 'long',
      confluenceIds: [],
      tagIds: []
    }
  });

  const onSubmit = (data: TradeFormValues) => {
    // Clean up empty optional fields
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined && v !== null && v !== "" && (typeof v !== 'number' || !isNaN(v)))
    );

    createTrade.mutate({ data: payload as any }, {
      onSuccess: (trade) => {
        toast.success('Trade created successfully');
        setLocation(`/trades/${trade.id}`);
      },
      onError: (err) => {
        toast.error('Failed to create trade');
        console.error(err);
      }
    });
  };

  const selectedStrategyId = form.watch('strategyId');
  const filteredSetups = setups?.filter(s => s.strategyId === Number(selectedStrategyId)) || [];

  const handleConfluenceToggle = (id: number, checked: boolean) => {
    const current = form.getValues('confluenceIds');
    if (checked) {
      form.setValue('confluenceIds', [...current, id]);
    } else {
      form.setValue('confluenceIds', current.filter(cid => cid !== id));
    }
  };

  const handleTagToggle = (id: number, checked: boolean) => {
    const current = form.getValues('tagIds');
    if (checked) {
      form.setValue('tagIds', [...current, id]);
    } else {
      form.setValue('tagIds', current.filter(tid => tid !== id));
    }
  };

  if (accountsLoading || instrumentsLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Add Trade</h2>
        <p className="text-muted-foreground">Log a new trade or plan.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="instrumentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrument *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select instrument" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {instruments?.map(inst => <SelectItem key={inst.id} value={inst.id.toString()}>{inst.symbol}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="direction" render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Direction" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="strategyId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue('setupId', undefined); }} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {strategies?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="setupId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Setup</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() || ''} disabled={!selectedStrategyId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {filteredSetups.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Trade Plan (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="plannedEntry" render={({ field }) => (
                <FormItem><FormLabel>Planned Entry Price</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="initialStopLoss" render={({ field }) => (
                <FormItem><FormLabel>Initial Stop Loss</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="profitTarget" render={({ field }) => (
                <FormItem><FormLabel>Profit Target</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="plannedPositionSize" render={({ field }) => (
                <FormItem><FormLabel>Position Size</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="plannedRisk" render={({ field }) => (
                <FormItem><FormLabel>Risk ($)</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="plannedRiskPercentage" render={({ field }) => (
                <FormItem><FormLabel>Risk (%)</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Tags & Confluences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium leading-none">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags?.map(tag => {
                    const isSelected = form.watch('tagIds').includes(tag.id);
                    return (
                      <Badge 
                        key={tag.id} 
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${isSelected ? '' : 'hover:border-primary/50'}`}
                        onClick={() => handleTagToggle(tag.id, !isSelected)}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {categories?.map(cat => (
                <div key={cat.id} className="space-y-3">
                  <p className="text-sm font-medium leading-none text-muted-foreground">{cat.name}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {cat.confluences?.map((conf: any) => (
                      <div key={conf.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`conf-${conf.id}`} 
                          checked={form.watch('confluenceIds').includes(conf.id)}
                          onCheckedChange={(c) => handleConfluenceToggle(conf.id, c === true)}
                        />
                        <label htmlFor={`conf-${conf.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {conf.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="tradeLevelCostAdjustment" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Adjustment (Funding/Swaps)</FormLabel>
                  <FormControl><Input type="number" step="any" {...field} className="max-w-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation('/journal')}>Cancel</Button>
            <Button type="submit" disabled={createTrade.isPending}>
              {createTrade.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Trade
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
