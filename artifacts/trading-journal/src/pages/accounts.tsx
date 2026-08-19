import { useState } from 'react';
import { 
  useListAccounts, 
  useCreateAccount, 
  useUpdateAccount,
  useDeleteAccount,
  useListInstruments,
  useCreateInstrument,
  useDeleteInstrument
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Wallet, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function formatCurrency(val: number | null | undefined, currency = 'USD') {
  if (val == null) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
  } catch (e) {
    return `${val < 0 ? '-' : ''}${currency} ${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export default function Accounts() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading: accountsLoading } = useListAccounts();
  const { data: instruments, isLoading: instLoading } = useListInstruments();

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const createInstrument = useCreateInstrument();
  const deleteInstrument = useDeleteInstrument();

  const [accDialog, setAccDialog] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', broker: '', baseCurrency: 'USD', startingBalance: '' });

  const [editAccDialog, setEditAccDialog] = useState(false);
  const [editAcc, setEditAcc] = useState<{ id: number; name: string; broker: string; baseCurrency: string; currentBalance: string } | null>(null);

  const [instDialog, setInstDialog] = useState(false);
  const [newInst, setNewInst] = useState({ symbol: '', name: '', assetClass: 'Forex', settlementCurrency: 'USD', quantityUnit: 'Lots' });

  const handleUpdateAccount = () => {
    if (!editAcc) return;
    updateAccount.mutate({
      id: editAcc.id,
      data: {
        name: editAcc.name,
        broker: editAcc.broker,
        baseCurrency: editAcc.baseCurrency,
        currentBalance: editAcc.currentBalance ? Number(editAcc.currentBalance) : undefined,
      }
    }, {
      onSuccess: () => {
        toast.success("Account updated");
        setEditAccDialog(false);
        setEditAcc(null);
        queryClient.invalidateQueries({ queryKey: ['listAccounts'] });
      },
      onError: () => toast.error("Failed to update account")
    });
  };

  const handleCreateAccount = () => {
    createAccount.mutate({ 
      data: { 
        name: newAcc.name, 
        broker: newAcc.broker, 
        baseCurrency: newAcc.baseCurrency,
        startingBalance: newAcc.startingBalance ? Number(newAcc.startingBalance) : undefined
      } 
    }, {
      onSuccess: () => {
        toast.success("Account created");
        setAccDialog(false);
        setNewAcc({ name: '', broker: '', baseCurrency: 'USD', startingBalance: '' });
        queryClient.invalidateQueries({ queryKey: ['listAccounts'] });
      },
      onError: () => toast.error("Failed to create account")
    });
  };

  const handleCreateInstrument = () => {
    createInstrument.mutate({ data: newInst }, {
      onSuccess: () => {
        toast.success("Instrument created");
        setInstDialog(false);
        setNewInst({ symbol: '', name: '', assetClass: 'Forex', settlementCurrency: 'USD', quantityUnit: 'Lots' });
        queryClient.invalidateQueries({ queryKey: ['listInstruments'] });
      },
      onError: () => toast.error("Failed to create instrument")
    });
  };

  if (accountsLoading || instLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Accounts & Instruments</h2>
        <p className="text-muted-foreground">Manage your broker accounts and tradable assets.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Accounts</h3>
          <Dialog open={accDialog} onOpenChange={setAccDialog}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Broker</Label><Input value={newAcc.broker} onChange={e => setNewAcc({...newAcc, broker: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Base Currency *</Label><Input value={newAcc.baseCurrency} onChange={e => setNewAcc({...newAcc, baseCurrency: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Starting Balance</Label><Input type="number" step="any" value={newAcc.startingBalance} onChange={e => setNewAcc({...newAcc, startingBalance: e.target.value})} /></div>
                </div>
                <Button onClick={handleCreateAccount} disabled={!newAcc.name || !newAcc.baseCurrency || createAccount.isPending}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Account Dialog */}
        <Dialog open={editAccDialog} onOpenChange={setEditAccDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
            {editAcc && (
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={editAcc.name} onChange={e => setEditAcc({...editAcc, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Broker</Label><Input value={editAcc.broker} onChange={e => setEditAcc({...editAcc, broker: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Base Currency</Label><Input value={editAcc.baseCurrency} onChange={e => setEditAcc({...editAcc, baseCurrency: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Current Balance</Label><Input type="number" step="any" value={editAcc.currentBalance} onChange={e => setEditAcc({...editAcc, currentBalance: e.target.value})} /></div>
                </div>
                <Button onClick={handleUpdateAccount} disabled={!editAcc.name || updateAccount.isPending}>
                  {updateAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 md:grid-cols-2">
          {accounts?.map(acc => (
            <Card key={acc.id} className="bg-card">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-md text-primary"><Wallet className="w-5 h-5" /></div>
                  <div>
                    <CardTitle className="text-lg">{acc.name}</CardTitle>
                    <CardDescription>{acc.broker || 'No broker specified'}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditAcc({ id: acc.id, name: acc.name, broker: acc.broker || '', baseCurrency: acc.baseCurrency, currentBalance: (acc.currentBalance ?? acc.startingBalance ?? '').toString() });
                    setEditAccDialog(true);
                  }}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm('Delete account? This may fail if it has trades.')) {
                      deleteAccount.mutate({ id: acc.id }, {
                        onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ['listAccounts'] }); },
                        onError: () => toast.error("Cannot delete account with existing trades")
                      });
                    }
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div>
                    <div className="text-muted-foreground">Currency</div>
                    <div className="font-medium font-mono">{acc.baseCurrency}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Balance</div>
                    <div className="font-medium font-mono text-primary">{formatCurrency(acc.currentBalance || acc.startingBalance, acc.baseCurrency)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-8 border-t border-border">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Instruments</h3>
          <Dialog open={instDialog} onOpenChange={setInstDialog}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 mr-2" /> New Instrument</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Instrument</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Symbol *</Label><Input value={newInst.symbol} onChange={e => setNewInst({...newInst, symbol: e.target.value})} placeholder="XAUUSD" /></div>
                  <div className="space-y-2"><Label>Name *</Label><Input value={newInst.name} onChange={e => setNewInst({...newInst, name: e.target.value})} placeholder="Gold / US Dollar" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Asset Class *</Label><Input value={newInst.assetClass} onChange={e => setNewInst({...newInst, assetClass: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Currency *</Label><Input value={newInst.settlementCurrency} onChange={e => setNewInst({...newInst, settlementCurrency: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Quantity Unit *</Label><Input value={newInst.quantityUnit} onChange={e => setNewInst({...newInst, quantityUnit: e.target.value})} /></div>
                </div>
                <Button onClick={handleCreateInstrument} disabled={!newInst.symbol || !newInst.name || createInstrument.isPending}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card">
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-accent/30 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {instruments?.map(inst => (
                  <tr key={inst.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{inst.symbol}</td>
                    <td className="px-4 py-3">{inst.name}</td>
                    <td className="px-4 py-3">{inst.assetClass}</td>
                    <td className="px-4 py-3 font-mono">{inst.settlementCurrency}</td>
                    <td className="px-4 py-3">{inst.quantityUnit}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                        if (confirm('Delete instrument?')) {
                          deleteInstrument.mutate({ id: inst.id }, {
                            onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ['listInstruments'] }); }
                          });
                        }
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
