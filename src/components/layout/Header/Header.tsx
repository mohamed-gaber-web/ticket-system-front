import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useState } from "react";
import { useAuth } from "@/redux/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, userType, logout } = useAuth();
  const navigate = useNavigate();

  const notifications = 3;

  // Get user display info
  const userEmail = user?.email || '';
  const userRole = userType === 'customer' ? 'Customer' : userType === 'consultant' ? 'Consultant' : 'User';

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
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      {/* Left Side - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative flex-1"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search tickets, customers, teams..."
            className="pl-10 pr-4 py-2 w-full bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200 rounded-xl"
          />
        </motion.div>
      </div>

      {/* Right Side - Actions & User Info */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Theme Toggle */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="relative rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-orange-500" />
            ) : (
              <Moon className="h-5 w-5 text-blue-600" />
            )}
          </Button>
        </motion.div>

        {/* Notifications */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {notifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-500 text-[10px] font-bold text-white shadow-lg"
              >
                {notifications}
              </motion.span>
            )}
          </Button>
        </motion.div>

        {/* Settings */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </Button>
        </motion.div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200"></div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 px-3 py-2 rounded-xl transition-all duration-200"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="relative">
              <Avatar className="h-9 w-9 ring-2 ring-blue-500/20">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-800">{userEmail}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </motion.div>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-gray-200 py-2 z-50"
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{userEmail}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>

              <div className="py-2">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={handleChangePasswordClick}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors"
                >
                  <Key className="h-4 w-4" />
                  <span>Change Password</span>
                </button>
              </div>

              <div className="border-t border-gray-100 py-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
