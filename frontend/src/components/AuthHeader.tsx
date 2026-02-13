import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STAFF";
}

export default function AuthHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}") as User;

  const handleLogout = async () => {
    try {
      await apiCall("/auth/logout", {
        method: "POST",
      });

      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");

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

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Asset Buddy</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <p className="font-semibold">{user.fullName}</p>
          <p className="text-gray-600 text-xs">{user.role}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
