import { Bell, User } from 'lucide-react';
import { useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from "@/lib/apiClient";
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
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState<Array<{
    id: string;
    title?: string;
    recipientUserId?: string;
    type?: string;
    isRead?: boolean;
    message: string;
    createdAt: string;
  }>>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const refreshUnreadCount = async () => {
    try {
      const resp = await apiClient.get<{ unreadCount: number }>("/notifications/unread-count");
      const data = (resp as any)?.data;
      setNotifCount(typeof data?.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      setNotifCount(0);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = async () => {
      await refreshUnreadCount();
      if (cancelled) return;
    };

    void loadUnreadCount();
    if (user?.role === "ADMIN") {
      void loadNotificationsList();
    }
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.role]);

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

  const loadNotificationsList = async () => {
    setNotifLoading(true);
    try {
      const resp = await apiClient.get<Array<{
        id: string;
        title?: string;
        recipientUserId?: string;
        type?: string;
        isRead?: boolean;
        message: string;
        createdAt: string;
      }>>(
        "/notifications"
      );
      const data = Array.isArray((resp as any)?.data) ? (resp as any).data : [];
      const currentUserId = user?.id;
      // Client-side guard backup: do not render notifications explicitly targeted to another user.
      const filtered = data.filter((item: any) => {
        if (item.recipientUserId && currentUserId && item.recipientUserId !== currentUserId) return false;
        if (user?.role !== "ADMIN" && item.type === "ISSUE_REPORTED") return false;
        return true;
      });
      setNotifItems(filtered);
    } catch {
      setNotifItems([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch("/notifications/read-all", {});
      await Promise.all([loadNotificationsList(), refreshUnreadCount()]);
    } catch {
      // ignore, keep dropdown usable
    }
  };

  const handleNotificationSelect = async (itemId: string) => {
    const id = Number(itemId);
    if (Number.isInteger(id) && id > 0) {
      try {
        await apiClient.patch(`/notifications/${id}/read`, {});
      } catch {
        // ignore navigation still works
      }
    }
    await refreshUnreadCount();
    navigate("/assignments");
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-end sticky top-0 z-30">
      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => { if (open) void loadNotificationsList(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                  <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-destructive-foreground text-center">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover z-[60]">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            {!notifLoading && notifItems.some((item) => !item.isRead) && (
              <DropdownMenuItem onSelect={markAllAsRead} className="text-xs">
                Mark all as read
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {notifLoading && (
              <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
            )}
            {!notifLoading && notifItems.length === 0 && (
              <DropdownMenuItem disabled>You have no new notifications at this time</DropdownMenuItem>
            )}
            {!notifLoading && notifItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="cursor-pointer whitespace-normal"
                onSelect={() => { void handleNotificationSelect(item.id); }}
              >
                <div className="flex flex-col">
                  <span className={`text-sm ${item.isRead ? "text-muted-foreground" : "font-medium"}`}>
                    {item.title || "Notification"}
                  </span>
                  <span className={`text-xs ${item.isRead ? "text-muted-foreground" : "text-foreground/90"}`}>
                    {item.message}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
