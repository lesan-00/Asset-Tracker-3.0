import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, Mail, MapPin, Phone, ShieldCheck, UserCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { APIClientError } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { UserProfile, usersApi } from "@/lib/usersApi";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = id ? await usersApi.getUser(id) : await usersApi.getMe();
      if (!data) {
        setError("Profile not found");
        setProfile(null);
        return;
      }
      setProfile(data);
    } catch (err) {
      setError(
        err instanceof APIClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load profile"
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [id]);

  const initials = useMemo(() => getInitials(profile?.fullName || profile?.name), [profile]);
  const headerRole = profile?.role || (currentUser?.role ?? "STAFF");
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-";
  const lastLogin = profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never";

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">View account identity and access details.</p>
          </div>
          <Badge variant="secondary">{headerRole}</Badge>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {error || "Unable to load profile"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">View account identity and access details.</p>
        </div>
        <Badge variant="secondary">{profile.role}</Badge>
      </div>

      <Card className="overflow-hidden border-slate-700/60 bg-slate-900 text-slate-100 shadow-xl">
        <div className="relative h-16 w-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800">
          <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(255,255,255,0.08)_10px,rgba(255,255,255,0.08)_20px)]" />
        </div>

        <CardContent className="-mt-8 space-y-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-slate-700 shadow-md">
                <AvatarFallback className="bg-slate-800 text-lg font-semibold text-slate-100">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {safeValue(profile.role)} • {safeValue(profile.department)}
                </p>
                <h2 className="text-2xl font-semibold leading-tight">
                  {safeValue(profile.fullName || profile.name)}
                </h2>
                <p className="text-sm text-slate-300">{safeValue(profile.email)}</p>
              </div>
            </div>
            <StatusBadge status={profile.status} />
          </div>

          <Separator className="bg-slate-700/70" />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoItem
              label="Employee Name"
              value={safeValue(profile.employeeName || profile.fullName || profile.name)}
              icon={<UserCircle2 className="h-4 w-4" />}
            />
            <InfoItem
              label="EPF No"
              value={safeValue(profile.epfNo)}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <InfoItem
              label="Department"
              value={safeValue(profile.department)}
              icon={<Building2 className="h-4 w-4" />}
            />
            <InfoItem
              label="Location"
              value={safeValue(profile.location)}
              icon={<MapPin className="h-4 w-4" />}
            />
            <InfoItem
              label="Member Since"
              value={memberSince}
              icon={<UserCircle2 className="h-4 w-4" />}
            />
            <InfoItem
              label="Last Login"
              value={lastLogin}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <InfoItem label="Phone" value={safeValue(profile.phoneNumber || profile.phone)} icon={<Phone className="h-4 w-4" />} />
            <InfoItem label="Email" value={safeValue(profile.email)} icon={<Mail className="h-4 w-4" />} />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Access Groups</p>
            <div className="flex flex-wrap gap-2">
              {(profile.accessGroups?.length ? profile.accessGroups : ["Unassigned"]).map((group, index) => (
                <AccessTag key={`${group}-${index}`} label={group} primary={index === 0} />
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-start justify-between gap-2 border-t border-slate-700/70 bg-slate-950/50 px-6 py-4 text-xs text-slate-400 md:flex-row md:items-center">
          <span>User ID: {profile.id}</span>
          <span className="uppercase tracking-[0.2em] text-slate-300">
            {safeValue(profile.accessLevel)}
          </span>
        </CardFooter>
      </Card>

    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Card className="overflow-hidden">
        <Skeleton className="h-16 w-full rounded-none" />
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: "ACTIVE" | "DISABLED" | string }) {
  const active = status === "ACTIVE";
  return (
    <Badge
      className={cn(
        "flex w-fit items-center gap-2 px-3 py-1 text-xs uppercase tracking-wide",
        active
          ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25"
          : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/25"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", active ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
      {active ? "Active" : "Disabled"}
    </Badge>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-3 transition-colors hover:border-slate-500">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function AccessTag({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-3 py-1 text-xs",
        primary ? "bg-indigo-500/20 text-indigo-200" : "bg-slate-700/70 text-slate-200"
      )}
    >
      {label}
    </Badge>
  );
}

function getInitials(name?: string) {
  if (!name?.trim()) return "--";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function safeValue(value?: string) {
  return value?.trim() ? value : "-";
}
