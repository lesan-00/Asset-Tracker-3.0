import { Navigate } from "react-router-dom";

type StoredUser = {
  role?: "ADMIN";
};

export default function DashboardRouter() {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(raw) as StoredUser;
    if (user.role === "ADMIN") {
      return <Navigate to="/dashboard" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/login" replace />;
}
