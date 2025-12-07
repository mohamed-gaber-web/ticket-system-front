import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

interface SidebarMobileProps {
  links: { name: string; path: string; icon: React.ElementType }[];
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

export function SidebarMobile({ links, isMobileOpen, setIsMobileOpen }: SidebarMobileProps) {
  return (
    <AnimatePresence>
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        >
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="absolute left-0 top-0 w-80 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6 shadow-2xl z-50 flex flex-col relative overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 pointer-events-none"></div>

            {/* Header */}
            <div className="relative flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">TicketHub</h1>
                  <p className="text-xs text-gray-400">Support System</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="hover:bg-white/10 rounded-xl text-white relative z-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Label */}
            <div className="relative mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                Main Menu
              </p>
            </div>

            {/* Navigation */}
            <nav className="space-y-2 relative flex-1">
              {links.map(({ name, path, icon: Icon }, index) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group ${
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
                          layoutId="activeMobileTab"
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

                      <span className="relative z-10">{name}</span>

                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white z-10"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Bottom Section */}
            <div className="relative mt-auto pt-4 border-t border-gray-700/50">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white mb-1">Need Help?</p>
                    <p className="text-xs text-gray-400 leading-tight">
                      Contact support for assistance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
