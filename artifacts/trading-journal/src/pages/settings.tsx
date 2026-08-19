import { useState, useEffect } from 'react';
import { 
  useGetSettings, 
  useUpdateSettings, 
  useListTags,
  useCreateTag,
  useDeleteTag,
  useListAccounts
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: tags, isLoading: tagsLoading } = useListTags();
  const { data: accounts, isLoading: accountsLoading } = useListAccounts();

  const updateSettings = useUpdateSettings();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [formState, setFormState] = useState({
    timezone: 'UTC',
    defaultAccountId: '0',
    dashboardDefaultDateRange: '30d' as any
  });

  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (settings) {
      setFormState({
        timezone: settings.timezone || 'UTC',
        defaultAccountId: settings.defaultAccountId?.toString() || '0',
        dashboardDefaultDateRange: settings.dashboardDefaultDateRange || '30d'
      });
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings.mutate({
      data: {
        timezone: formState.timezone,
        defaultAccountId: formState.defaultAccountId !== '0' ? Number(formState.defaultAccountId) : null,
        dashboardDefaultDateRange: formState.dashboardDefaultDateRange,
      }
    }, {
      onSuccess: () => {
        toast.success("Settings saved");
        queryClient.invalidateQueries({ queryKey: ['getSettings'] });
      },
      onError: () => toast.error("Failed to save settings")
    });
  };

  const handleCreateTag = () => {
    if (!newTagName) return;
    createTag.mutate({ data: { name: newTagName } }, {
      onSuccess: () => {
        toast.success("Tag created");
        setNewTagName('');
        queryClient.invalidateQueries({ queryKey: ['listTags'] });
      },
      onError: () => toast.error("Failed to create tag")
    });
  };

  if (settingsLoading || tagsLoading || accountsLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure your journal preferences.</p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Default values for new trades and dashboard views.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <Select value={formState.timezone} onValueChange={v => setFormState({...formState, timezone: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (US)</SelectItem>
                  <SelectItem value="America/Denver">Central Time (US)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Account</Label>
              <Select value={formState.defaultAccountId} onValueChange={v => setFormState({...formState, defaultAccountId: v})}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {accounts?.map(acc => <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Dashboard Range</Label>
              <Select value={formState.dashboardDefaultDateRange} onValueChange={v => setFormState({...formState, dashboardDefaultDateRange: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Tags Management</CardTitle>
          <CardDescription>Tags are used to organize trades across different strategies and accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 max-w-sm">
            <Input 
              placeholder="New tag name..." 
              value={newTagName} 
              onChange={e => setNewTagName(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
            />
            <Button onClick={handleCreateTag} disabled={!newTagName || createTag.isPending}><Plus className="w-4 h-4" /></Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags?.map(tag => (
              <Badge key={tag.id} variant="secondary" className="px-3 py-1.5 text-sm gap-2">
                {tag.name}
                <Trash2 
                  className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-destructive transition-colors" 
                  onClick={() => {
                    if(confirm("Delete tag?")) {
                      deleteTag.mutate({ id: tag.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listTags'] })
                      })
                    }
                  }}
                />
              </Badge>
            ))}
            {(!tags || tags.length === 0) && <div className="text-muted-foreground text-sm">No tags created yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
