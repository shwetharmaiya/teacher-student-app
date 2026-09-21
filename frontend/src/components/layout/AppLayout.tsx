import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="app-shell">
      <Sidebar role={user.role} />
      <div className="app-content">
        <Header user={user} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
