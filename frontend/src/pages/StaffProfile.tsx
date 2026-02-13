import { useEffect, useState } from "react";
import { ArrowLeft, Mail, MapPin, Phone, Shield, User, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, APIClientError } from "@/lib/apiClient";

interface StaffProfileData {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: string;
  userCode: string;
  username: string;
  location: string;
  department: string;
  phoneNumber: string;
}

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) {
        setError("Missing user id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<StaffProfileData>(`/users/${id}`);
        const data = (response as { data?: StaffProfileData }).data ?? (response as StaffProfileData);
        setProfile(data || null);
      } catch (err) {
        if (err instanceof APIClientError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load user profile");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="outline" onClick={() => navigate("/staff")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-6 text-muted-foreground">Loading profile...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="outline" onClick={() => navigate("/staff")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive font-medium">Unable to load profile</p>
            <p className="text-muted-foreground mt-1">{error || "User not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Button type="button" variant="outline" onClick={() => navigate("/staff")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{profile.fullName}</CardTitle>
            <Badge variant={profile.isActive ? "default" : "secondary"}>
              {profile.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Email:</span>
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Role:</span>
            <span>{profile.role}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">User Code:</span>
            <span>{profile.userCode}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <UserRound className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Username:</span>
            <span>{profile.username}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Location:</span>
            <span>{profile.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Department:</span>
            <span>{profile.department}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Phone Number:</span>
            <span>{profile.phoneNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Created At:</span>
            <span>{new Date(profile.createdAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
