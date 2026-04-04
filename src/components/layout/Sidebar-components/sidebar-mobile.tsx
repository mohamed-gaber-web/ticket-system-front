import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import logo from "@/assets/logo_extracted.png";
import { NavLink } from "react-router-dom";
import { useState } from "react";

interface NavLink {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  name: string;
  icon: React.ElementType;
  isGroup: true;
  children: NavLink[];
}

type NavigationItem = NavLink | NavGroup;

interface SidebarMobileProps {
  links: NavigationItem[];
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

export function SidebarMobile({ links, isMobileOpen, setIsMobileOpen }: SidebarMobileProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Modules"]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((name) => name !== groupName)
        : [...prev, groupName]
    );
  };

  const isGroup = (item: NavigationItem): item is NavGroup => {
    return 'isGroup' in item && item.isGroup === true;
  };

  return (
    <AnimatePresence>
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-40 md:hidden"
          role="presentation"
          onClick={() => setIsMobileOpen(false)}
        >
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="absolute left-0 top-0 w-80 h-full bg-surface-container-low p-6 shadow-ambient z-50 flex flex-col relative overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-[1rem] text-on-surface-variant hover:text-on-surface relative z-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Label */}
            <div className="relative mb-3">
              <p className="label-technical px-3">
                Main Menu
              </p>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 relative flex-1" aria-label="Main navigation">
              {links.map((item, index) => {
                if (isGroup(item)) {
                  const isExpanded = expandedGroups.includes(item.name);
                  return (
                    <div key={item.name}>
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(item.name)}
                        aria-expanded={isExpanded}
                        aria-label={`${item.name} section`}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-[1rem] text-sm font-medium transition-all duration-200 relative group text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer"
                      >
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="relative z-10"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                        </motion.div>

                        <span className="relative z-10 flex-1 text-left">
                          {item.name}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                          className="relative z-10"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      {/* Group Children */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden ml-6 mt-1 space-y-0.5"
                          >
                            {item.children.map((child, childIndex) => (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                onClick={() => setIsMobileOpen(false)}
                                className={({ isActive }) =>
                                  `flex items-center gap-3 px-4 py-2 rounded-[1rem] text-sm font-medium transition-all duration-200 relative group ${
                                    isActive
                                      ? "bg-primary-fixed text-on-primary-fixed font-semibold"
                                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                  }`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <motion.div
                                        layoutId="activeMobileTab"
                                        className="absolute inset-0 bg-primary-fixed rounded-[1rem]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                      />
                                    )}

                                    <motion.div
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ duration: 0.3, delay: childIndex * 0.05 }}
                                      className="relative z-10"
                                    >
                                      <child.icon className="h-4 w-4 shrink-0" />
                                    </motion.div>

                                    <span className="relative z-10 text-xs">{child.name}</span>

                                    {isActive && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-500 z-10"
                                      />
                                    )}
                                  </>
                                )}
                              </NavLink>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                } else {
                  // Regular nav link
                  const { name, path, icon: Icon } = item;
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-[1rem] text-sm font-medium transition-all duration-200 relative group ${
                          isActive
                            ? "bg-primary-fixed text-on-primary-fixed font-semibold"
                            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div
                              layoutId="activeMobileTab"
                              className="absolute inset-0 bg-primary-fixed rounded-[1rem]"
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
                              className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-500 z-10"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                }
              })}
            </nav>

            {/* Bottom Section */}
            <div className="relative mt-auto pt-6">
              <div className="p-4 rounded-[1rem] bg-primary-fixed">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-[1rem] bg-primary-gradient flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-on-primary-fixed mb-1">Need Help?</p>
                    <p className="text-xs text-on-surface-variant leading-tight">
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
