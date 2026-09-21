import { useNavigate } from "react-router-dom";
import { useAuth, type User } from "../../auth/AuthContext";

export default function UserMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="user-menu">
      <div>
        <strong>{user.email}</strong>
        <span>{user.role}</span>
      </div>
      <button className="button button-secondary" onClick={handleLogout} type="button">
        Logout
      </button>
    </div>
  );
}
