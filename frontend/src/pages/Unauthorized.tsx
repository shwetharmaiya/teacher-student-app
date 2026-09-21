import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { roleHome } from "../auth/RoleHomeRedirect";

export default function Unauthorized() {
  const { user } = useAuth();
  return (
    <main className="login-page"><section className="login-card">
      <h1>Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
      <Link className="button" to={user ? roleHome(user.role) : "/login"}>Go to my dashboard</Link>
    </section></main>
  );
}
