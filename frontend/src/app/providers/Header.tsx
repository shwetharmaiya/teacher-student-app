import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header>
      <span>{user?.email}</span>

      <button onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
}