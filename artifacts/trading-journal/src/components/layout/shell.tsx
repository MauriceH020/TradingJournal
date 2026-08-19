import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  BarChart2, 
  BookOpen, 
  PlusCircle, 
  TrendingUp, 
  Users, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarFooter,
} from '@/components/ui/sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart2 },
    { name: 'Journal', href: '/journal', icon: BookOpen },
    { name: 'Add Trade', href: '/trades/new', icon: PlusCircle },
    { name: 'Strategies', href: '/strategies', icon: TrendingUp },
    { name: 'Accounts', href: '/accounts', icon: Users },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground dark">
        <Sidebar className="border-r border-border bg-sidebar" variant="sidebar">
          <SidebarHeader className="h-16 flex items-center justify-center border-b border-border">
            <div className="flex items-center gap-2 font-bold tracking-tight px-4 w-full text-lg">
              <span className="text-primary font-mono text-xl">/</span>
              <span>Trdlft</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4 px-2 flex-1">
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location === item.href || 
                  (item.href !== '/' && location.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        "font-medium h-10 my-0.5 relative rounded-md transition-colors",
                        isActive 
                          ? "bg-accent text-accent-foreground after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-1/2 after:w-1 after:bg-primary after:rounded-r-full"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3 px-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="p-2 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === '/settings'}
                  className={cn(
                    "font-medium h-10 my-0.5",
                    location === '/settings'
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Link href="/settings" className="flex items-center gap-3 px-3">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-x-hidden w-full flex flex-col">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
