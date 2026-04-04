import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronDown } from "lucide-react";
import logo from "@/assets/logo_extracted.png";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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

interface SidebarDesktopProps {
  links: NavigationItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function SidebarDesktop({ links, isOpen, setIsOpen }: SidebarDesktopProps) {
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
    <AnimatePresence mode="popLayout">
      <motion.aside
        key="desktop-sidebar"
        initial={{ width: 80 }}
        animate={{ width: isOpen ? 280 : 80 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="hidden md:flex flex-col flex-shrink-0 bg-surface-container-low h-screen p-4 relative z-10"
        style={{ overflowY: 'auto', overflowX: 'hidden' }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between mb-8">
          <motion.div
            key={isOpen ? "logo-visible" : "logo-hidden"}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : -10 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 ${!isOpen && "hidden"}`}
          >
            <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
          </motion.div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isOpen}
            className="shrink-0 rounded-[1rem] text-on-surface-variant hover:text-on-surface relative z-10"
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
            <p className="label-technical px-3">
              Main Menu
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="space-y-1 relative flex-1" aria-label="Main navigation">
          {links.map((item, index) => {
            if (isGroup(item)) {
              const isExpanded = expandedGroups.includes(item.name);
              return (
                <div key={item.name}>
                  {/* Group Header */}
                  <button
                    onClick={() => isOpen && toggleGroup(item.name)}
                    aria-expanded={isExpanded}
                    aria-label={`${item.name} section`}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-[1rem] text-sm font-medium transition-all duration-200 relative group text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="relative z-10"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </motion.div>

                    {isOpen && (
                      <>
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.25 }}
                          className="relative z-10 whitespace-nowrap flex-1 text-left"
                        >
                          {item.name}
                        </motion.span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                          className="relative z-10"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </>
                    )}
                  </button>

                  {/* Group Children */}
                  <AnimatePresence>
                    {isExpanded && isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden ml-4 mt-1 space-y-0.5"
                      >
                        {item.children.map((child, childIndex) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-2 rounded-[1rem] text-sm font-medium transition-all duration-200 relative group ${
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
                                    layoutId="activeTab"
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

                                <motion.span
                                  key={child.name}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.25 }}
                                  className="relative z-10 whitespace-nowrap text-xs"
                                >
                                  {child.name}
                                </motion.span>

                                {isActive && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-500 z-10"
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
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-[1rem] text-sm font-medium transition-all duration-200 relative group ${
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
                          layoutId="activeTab"
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-500 z-10"
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
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative mt-auto pt-4"
          >
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
