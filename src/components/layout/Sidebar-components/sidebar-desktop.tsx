import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

interface SidebarDesktopProps {
  links: { name: string; path: string; icon: React.ElementType }[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function SidebarDesktop({ links, isOpen, setIsOpen }: SidebarDesktopProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.aside
        key="desktop-sidebar"
        initial={{ width: 80 }}
        animate={{ width: isOpen ? 280 : 80 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="hidden md:flex flex-col flex-shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700/50 h-screen p-4 overflow-hidden shadow-2xl relative z-10"
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 pointer-events-none"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between mb-8">
          <motion.div
            key={isOpen ? "logo-visible" : "logo-hidden"}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : -10 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-2 ${!isOpen && "hidden"}`}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white whitespace-nowrap">TicketHub</h1>
              <p className="text-[10px] text-gray-400 whitespace-nowrap">Support System</p>
            </div>
          </motion.div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="shrink-0 hover:bg-white/10 rounded-xl text-white relative z-10"
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5 transition-transform duration-300" />
            ) : (
              <Menu className="h-5 w-5 transition-transform duration-300" />
            )}
          </Button>
        </div>

        {/* Navigation Label */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative mb-3"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
              Main Menu
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="space-y-2 relative flex-1">
          {links.map(({ name, path, icon: Icon }, index) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="relative z-10"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </motion.div>

                  {isOpen && (
                    <motion.span
                      key={name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="relative z-10 whitespace-nowrap"
                    >
                      {name}
                    </motion.span>
                  )}

                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white z-10"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative mt-auto pt-4 border-t border-gray-700/50"
          >
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
