import type { User } from "../../auth/AuthContext";
import UserMenu from "./UserMenu";

export default function Header({ user }: { user: User }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">School management</p>
        <h1>Welcome back</h1>
      </div>
      <UserMenu user={user} />
    </header>
  );
}
