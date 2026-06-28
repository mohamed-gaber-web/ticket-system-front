import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  Bell,
  Search,
  // Settings,   // settings hidden
  // Moon,       // dark mode hidden
  // Sun,        // dark mode hidden
  LogOut,
  User,
  Key
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/redux/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useAppSelector } from "@/redux/hooks/hooks";
import type { NotificationType } from "@/types/notification.types";

export default function Header() {
  // const [isDark, setIsDark] = useState(false);           // dark mode hidden
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, userType, logout } = useAuth();
  const navigate = useNavigate();
  const { items } = useAppSelector((state) => state.notifications);

  const excludedNotificationTypes: NotificationType[] = [];
  // Count unread from the loaded notification list so the badge always matches
  // what the panel shows — and reads 0 when there are no notifications.
  const visibleUnreadCount = items.filter(
    (n) => !n.isRead && !excludedNotificationTypes.includes(n.notificationType)
  ).length;

  const userEmail = user?.email || '';
  const u = user as any;
  const avatarUrl = getAvatarUrl(u?.profilePicture);
  const userRole = userType === 'tele_sales'
    ? (u?.role === 'admin' ? 'Admin' : 'User')
    : userType === 'customer' ? 'Customer'
    : userType === 'consultant' ? 'Consultant'
    : 'User';

  // Notifications are loaded centrally by useNotificationSocket (it baselines
  // the list on every socket (re)connect, which covers mount/reload). The badge
  // below reads straight from the Redux store, so it stays in sync regardless.
  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowUserMenu(false);
  };

  const handleChangePasswordClick = () => {
    navigate('/change-password');
    setShowUserMenu(false);
  };

  // Close dropdowns on Escape or outside click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotifications(false);
      }
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showUserMenu && !target.closest('[aria-label="User menu"]') && !target.closest('[role="menu"]')) {
        setShowUserMenu(false);
      }
      if (showNotifications && !target.closest('[aria-expanded]') && !target.closest('[role="region"]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [showUserMenu, showNotifications]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-surface-container-lowest/80 backdrop-blur-xl">
      {/* Left Side - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search tickets, customers, consultants..."
            aria-label="Search tickets, customers, consultants"
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>
      </div>

      {/* Right Side - Actions & User Info */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle — hidden, re-enable with dark mode setup
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDark(!isDark)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-[1rem] text-on-surface-variant hover:text-on-surface"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button> */}

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-[1rem] text-on-surface-variant hover:text-on-surface"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label={`Notifications${visibleUnreadCount > 0 ? `, ${visibleUnreadCount} unread` : ''}`}
            aria-haspopup="true"
            aria-expanded={showNotifications}
          >
            <Bell className="h-5 w-5" />
            {visibleUnreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-orange-500 px-1 text-[10px] font-bold text-white"
                aria-hidden="true"
              >
                {visibleUnreadCount}
              </span>
            )}
          </Button>
          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            excludeTypes={excludedNotificationTypes}
          />
        </div>

        {/* Settings — hidden, re-enable when settings page is ready
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="rounded-[1rem] text-on-surface-variant hover:text-on-surface"
        >
          <Settings className="h-5 w-5" />
        </Button> */}

        {/* Divider */}
        <div className="h-8 w-px bg-surface-container-high mx-1" role="separator"></div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high px-3 py-2 rounded-[1rem] transition-all duration-200"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label="User menu"
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userEmail} className="object-cover" />}
                <AvatarFallback className="bg-primary-gradient text-white font-semibold text-sm">
                  {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-surface-container-lowest" aria-hidden="true"></span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-on-surface">{userEmail}</p>
              <p className="text-xs text-on-surface-variant">{userRole}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-[1rem] glass shadow-ambient py-2 z-50"
              role="menu"
              aria-label="User menu"
            >
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-on-surface">{userEmail}</p>
                <p className="text-xs text-on-surface-variant capitalize">{userRole}</p>
              </div>

              <div className="py-1 mx-2">
                <button
                  role="menuitem"
                  onClick={handleProfileClick}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface rounded-[0.5rem] hover:bg-surface-container-highest transition-colors"
                >
                  <User className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
                  <span>My Profile</span>
                </button>
                <button
                  role="menuitem"
                  onClick={handleChangePasswordClick}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface rounded-[0.5rem] hover:bg-surface-container-highest transition-colors"
                >
                  <Key className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
                  <span>Change Password</span>
                </button>
              </div>

              <div className="py-1 mx-2 mt-1">
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-error rounded-[0.5rem] hover:bg-error/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
