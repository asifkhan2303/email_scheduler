import { User } from "../types/email";

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
      <div className="text-xl font-semibold tracking-tight">ONB</div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>

        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-9 w-9 rounded-full"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <button
          onClick={onLogout}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
