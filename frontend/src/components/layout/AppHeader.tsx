import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const handleProfile = () => {
    if (import.meta.env.DEV) {
      console.log("[Header] Profile clicked");
    }
    navigate("/profile");
  };

  const handleSettings = () => {
    if (import.meta.env.DEV) {
      console.log("[Header] Settings clicked");
    }
    navigate("/settings");
  };

  const handleLogout = async () => {
    try {
      logout();

      toast({
        title: "Success",
        description: "Logged out successfully",
      });

      // Redirect to login
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const handleNotifications = () => {
    toast({
      title: "Notifications",
      description: "You have no new notifications at this time",
    });
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-end sticky top-0 z-30">
      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" onClick={handleNotifications}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium">{user?.fullName || "User"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover z-[60]">
            <DropdownMenuLabel>{user?.fullName}</DropdownMenuLabel>
            <p className="text-xs text-gray-500 px-2">{user?.email}</p>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleProfile} className="cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSettings} className="cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-destructive cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
