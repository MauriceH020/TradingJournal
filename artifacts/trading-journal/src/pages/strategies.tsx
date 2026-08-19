import { useState } from 'react';
import { 
  useListStrategies, 
  useCreateStrategy, 
  useDeleteStrategy,
  useListSetups,
  useCreateSetup,
  useDeleteSetup,
  useListConfluenceCategories,
  useCreateConfluenceCategory,
  useDeleteConfluenceCategory,
  useCreateConfluence,
  useDeleteConfluence
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Strategies() {
  const queryClient = useQueryClient();

  const { data: strategies, isLoading: stratLoading } = useListStrategies();
  const { data: setups, isLoading: setupLoading } = useListSetups();
  const { data: categories, isLoading: catLoading } = useListConfluenceCategories();

  const createStrategy = useCreateStrategy();
  const deleteStrategy = useDeleteStrategy();
  const createSetup = useCreateSetup();
  const deleteSetup = useDeleteSetup();
  const createCategory = useCreateConfluenceCategory();
  const deleteCategory = useDeleteConfluenceCategory();
  const createConfluence = useCreateConfluence();
  const deleteConfluence = useDeleteConfluence();

  const [stratDialog, setStratDialog] = useState(false);
  const [newStratName, setNewStratName] = useState('');
  const [newStratDesc, setNewStratDesc] = useState('');

  const [setupDialog, setSetupDialog] = useState<number | null>(null);
  const [newSetupName, setNewSetupName] = useState('');
  const [newSetupDesc, setNewSetupDesc] = useState('');

  const [catDialog, setCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [confDialog, setConfDialog] = useState<number | null>(null);
  const [newConfName, setNewConfName] = useState('');

  const handleCreateStrat = () => {
    createStrategy.mutate({ data: { name: newStratName, description: newStratDesc } }, {
      onSuccess: () => {
        toast.success("Strategy created");
        setStratDialog(false);
        setNewStratName(''); setNewStratDesc('');
        queryClient.invalidateQueries({ queryKey: ['listStrategies'] });
      },
      onError: () => toast.error("Failed to create strategy")
    });
  };

  const handleCreateSetup = (strategyId: number) => {
    createSetup.mutate({ data: { strategyId, name: newSetupName, description: newSetupDesc } }, {
      onSuccess: () => {
        toast.success("Setup created");
        setSetupDialog(null);
        setNewSetupName(''); setNewSetupDesc('');
        queryClient.invalidateQueries({ queryKey: ['listSetups'] });
      },
      onError: () => toast.error("Failed to create setup")
    });
  };

  const handleCreateCategory = () => {
    createCategory.mutate({ data: { name: newCatName } }, {
      onSuccess: () => {
        toast.success("Category created");
        setCatDialog(false);
        setNewCatName('');
        queryClient.invalidateQueries({ queryKey: ['listConfluenceCategories'] });
      },
      onError: () => toast.error("Failed to create category")
    });
  };

  const handleCreateConfluence = (categoryId: number) => {
    createConfluence.mutate({ data: { categoryId, name: newConfName } }, {
      onSuccess: () => {
        toast.success("Confluence created");
        setConfDialog(null);
        setNewConfName('');
        queryClient.invalidateQueries({ queryKey: ['listConfluenceCategories'] });
      },
      onError: () => toast.error("Failed to create confluence")
    });
  };

  if (stratLoading || setupLoading || catLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Strategies & Setups</h2>
        <p className="text-muted-foreground">Define your trading playbooks.</p>
      </div>

      <div className="flex justify-end">
        <Dialog open={stratDialog} onOpenChange={setStratDialog}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Strategy</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Strategy</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Name</Label><Input value={newStratName} onChange={e => setNewStratName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={newStratDesc} onChange={e => setNewStratDesc(e.target.value)} /></div>
              <Button onClick={handleCreateStrat} disabled={!newStratName || createStrategy.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {strategies?.map(strat => {
          const stratSetups = setups?.filter(s => s.strategyId === strat.id) || [];
          return (
            <Card key={strat.id} className="bg-card">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{strat.name}</CardTitle>
                  <CardDescription className="mt-1">{strat.description}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (confirm('Delete strategy?')) {
                    deleteStrategy.mutate({ id: strat.id }, {
                      onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ['listStrategies'] }); }
                    });
                  }
                }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium border-b border-border pb-2">
                    <span>Setups ({stratSetups.length})</span>
                    <Dialog open={setupDialog === strat.id} onOpenChange={(open) => setSetupDialog(open ? strat.id : null)}>
                      <DialogTrigger asChild><Button variant="ghost" size="sm"><Plus className="w-4 h-4 mr-1"/> Add Setup</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>New Setup for {strat.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2"><Label>Name</Label><Input value={newSetupName} onChange={e => setNewSetupName(e.target.value)} /></div>
                          <div className="space-y-2"><Label>Description</Label><Input value={newSetupDesc} onChange={e => setNewSetupDesc(e.target.value)} /></div>
                          <Button onClick={() => handleCreateSetup(strat.id)} disabled={!newSetupName || createSetup.isPending}>Create</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {stratSetups.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No setups defined.</div>
                  ) : (
                    <ul className="space-y-2">
                      {stratSetups.map(setup => (
                        <li key={setup.id} className="flex justify-between items-center bg-background p-3 rounded-md border border-border">
                          <div>
                            <div className="font-medium text-sm">{setup.name}</div>
                            {setup.description && <div className="text-xs text-muted-foreground">{setup.description}</div>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            if (confirm('Delete setup?')) {
                              deleteSetup.mutate({ id: setup.id }, {
                                onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ['listSetups'] }); }
                              });
                            }
                          }}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="pt-8 border-t border-border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Confluences</h2>
            <p className="text-muted-foreground text-sm">Categorized tags for trade planning.</p>
          </div>
          <Dialog open={catDialog} onOpenChange={setCatDialog}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 mr-2" /> New Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Confluence Category</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name</Label><Input value={newCatName} onChange={e => setNewCatName(e.target.value)} /></div>
                <Button onClick={handleCreateCategory} disabled={!newCatName || createCategory.isPending}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {categories?.map((cat: any) => (
            <Card key={cat.id} className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">{cat.name}</CardTitle>
                <div className="flex gap-1">
                  <Dialog open={confDialog === cat.id} onOpenChange={(open) => setConfDialog(open ? cat.id : null)}>
                    <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="w-4 h-4" /></Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add to {cat.name}</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={newConfName} onChange={e => setNewConfName(e.target.value)} /></div>
                        <Button onClick={() => handleCreateConfluence(cat.id)} disabled={!newConfName || createConfluence.isPending}>Create</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                    if (confirm('Delete category?')) {
                      deleteCategory.mutate({ id: cat.id }, {
                        onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ['listConfluenceCategories'] }); }
                      });
                    }
                  }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cat.confluences?.map((conf: any) => (
                    <div key={conf.id} className="flex items-center bg-accent/50 border border-border rounded-full px-3 py-1 text-sm">
                      <span>{conf.name}</span>
                      <button className="ml-2 text-muted-foreground hover:text-destructive transition-colors" onClick={() => {
                        if (confirm('Delete?')) {
                          deleteConfluence.mutate({ id: conf.id }, {
                            onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['listConfluenceCategories'] }); }
                          });
                        }
                      }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {(!cat.confluences || cat.confluences.length === 0) && (
                    <span className="text-sm text-muted-foreground">No confluences added.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
