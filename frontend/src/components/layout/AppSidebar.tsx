import { 
  LayoutDashboard, 
  Laptop,
  Boxes,
  Users, 
  ArrowLeftRight, 
  AlertTriangle,
  FileText,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/constants/app';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/assets', icon: Boxes },
  { title: 'Staff', url: '/staff', icon: Users },
  { title: 'Assignments', url: '/assignments', icon: ArrowLeftRight },
  { title: 'Issues', url: '/issues', icon: AlertTriangle },
  { title: 'Reports', url: '/reports', icon: FileText },
] as const;

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const visibleNavItems = navItems;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Laptop className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">{APP_NAME}</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center mx-auto">
            <Laptop className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {visibleNavItems.map((item) => {
          const isActive =
            location.pathname === item.url ||
            (item.url === "/dashboard" && location.pathname.startsWith("/dashboard/"));
          return (
            <RouterNavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"
              )} />
              {!collapsed && (
                <span className="font-medium text-sm">{item.title}</span>
              )}
            </RouterNavLink>
          );
        })}
      </nav>

      {/* Settings & Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <RouterNavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group mb-2",
            location.pathname === '/settings'
              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0 text-sidebar-muted group-hover:text-sidebar-foreground" />
          {!collapsed && <span className="font-medium text-sm">Settings</span>}
        </RouterNavLink>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            !collapsed && "justify-start px-3"
          )}
        >
          <ChevronLeft className={cn(
            "w-5 h-5 transition-transform duration-200",
            collapsed && "rotate-180"
          )} />
          {!collapsed && <span className="ml-3 font-medium text-sm">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
