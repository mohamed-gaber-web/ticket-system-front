import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  Bell,
  Search,
  Settings,
  Moon,
  Sun,
  LogOut,
  User,
  Key
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/redux/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { fetchUnreadCount } from "@/redux/slices/notificationSlice";
import type { NotificationType } from "@/types/notification.types";

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, userType, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { unreadCount, items } = useAppSelector((state) => state.notifications);

  const excludedNotificationTypes: NotificationType[] = [];
  const visibleUnreadCount =
    items.filter((n) => !n.isRead && !excludedNotificationTypes.includes(n.notificationType)).length ||
    unreadCount;

  const userEmail = user?.email || '';
  const userRole = userType === 'customer' ? 'Customer' : userType === 'consultant' ? 'Consultant' : 'User';

  useEffect(() => {
    if (user?._id && userType) {
      dispatch(fetchUnreadCount({ userId: user._id, userType }));
    }
  }, [dispatch, user?._id, userType]);

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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-surface-container-lowest/80 backdrop-blur-xl">
      {/* Left Side - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative flex-1"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <Input
            type="search"
            placeholder="Search tickets, customers, consultants..."
            className="pl-10 pr-4 py-2 w-full"
          />
        </motion.div>
      </div>

      {/* Right Side - Actions & User Info */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="rounded-[1rem] text-on-surface-variant hover:text-on-surface"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </motion.div>

        {/* Notifications */}
        <div className="relative">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-[1rem] text-on-surface-variant hover:text-on-surface"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <Bell className="h-5 w-5" />
              {visibleUnreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-orange-500 text-[10px] font-bold text-white"
                >
                  {visibleUnreadCount}
                </motion.span>
              )}
            </Button>
          </motion.div>

          <NotificationDropdown isOpen={showNotifications} excludeTypes={excludedNotificationTypes} />
        </div>

        {/* Settings */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[1rem] text-on-surface-variant hover:text-on-surface"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Divider - using background shift instead of border */}
        <div className="h-8 w-px bg-surface-container-high mx-1"></div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high px-3 py-2 rounded-[1rem] transition-all duration-200"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary-gradient text-white font-semibold text-sm">
                  {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-surface-container-lowest"></span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-on-surface">{userEmail}</p>
              <p className="text-xs text-on-surface-variant">{userRole}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </motion.div>

          {/* Dropdown Menu - Glassmorphism */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-56 rounded-[1rem] glass shadow-ambient py-2 z-50"
            >
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-on-surface">{userEmail}</p>
                <p className="text-xs text-on-surface-variant capitalize">{userRole}</p>
              </div>

              <div className="py-1 mx-2">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface rounded-[0.5rem] hover:bg-surface-container-highest transition-colors"
                >
                  <User className="h-4 w-4 text-on-surface-variant" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={handleChangePasswordClick}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface rounded-[0.5rem] hover:bg-surface-container-highest transition-colors"
                >
                  <Key className="h-4 w-4 text-on-surface-variant" />
                  <span>Change Password</span>
                </button>
              </div>

              <div className="py-1 mx-2 mt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-error rounded-[0.5rem] hover:bg-error/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
