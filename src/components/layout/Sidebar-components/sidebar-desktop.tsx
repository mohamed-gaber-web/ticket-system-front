import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronDown } from "lucide-react";
import logo from "@/assets/logo_extracted.png";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface NavLinkItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface NavSubGroup {
  name: string;
  icon: React.ElementType;
  isSubGroup: true;
  children: NavLinkItem[];
}

interface NavGroup {
  name: string;
  icon: React.ElementType;
  isGroup: true;
  children: (NavLinkItem | NavSubGroup)[];
}

interface NavSection {
  isSection: true;
  name: string;
}

type NavigationItem = NavLinkItem | NavGroup | NavSection;

interface SidebarDesktopProps {
  links: NavigationItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

function isGroup(item: NavigationItem): item is NavGroup {
  return "isGroup" in item && item.isGroup === true;
}

function isSubGroup(item: NavLinkItem | NavSubGroup): item is NavSubGroup {
  return "isSubGroup" in item && item.isSubGroup === true;
}

function isSection(item: NavigationItem): item is NavSection {
  return "isSection" in item && item.isSection === true;
}

export function SidebarDesktop({ links, isOpen, setIsOpen }: SidebarDesktopProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const location = useLocation();

  const isChildActive = (path: string) => {
    const [pathname, search = ''] = path.split('?');
    if (location.pathname !== pathname) return false;
    const linkParams = new URLSearchParams(search);
    const currentParams = new URLSearchParams(location.search);
    if (!search) {
      return location.pathname === pathname;
    }
    for (const [key, value] of linkParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }
    return true;
  };

  const toggleGroup = (name: string) =>
    setExpandedGroups((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  return (
    <AnimatePresence mode="popLayout">
      <motion.aside
        key="desktop-sidebar"
        initial={{ width: 80 }}
        animate={{ width: isOpen ? 256 : 72 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="hidden md:flex flex-col flex-shrink-0 bg-surface-container-low h-screen border-r border-outline-variant/20 relative z-10"
        style={{ overflowY: "auto", overflowX: "hidden" }}
      >
        {/* ── Logo / toggle header ── */}
        <div
          className={`flex items-center border-b border-outline-variant/15 px-3 py-4 ${
            isOpen ? "justify-between" : "justify-center"
          }`}
        >
          <AnimatePresence mode="popLayout">
            {isOpen && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <img src={logo} alt="Logo" className="h-8 w-auto object-contain shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="shrink-0 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* ── Nav label ── */}
        <div className="px-3 pt-5 pb-2">
          <AnimatePresence mode="popLayout">
            {isOpen ? (
              <motion.div
                key="label-open"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <span className="label-technical text-on-surface-variant/50 shrink-0">
                  Main Menu
                </span>
                <div className="flex-1 h-px bg-outline-variant/25" />
              </motion.div>
            ) : (
              <motion.div
                key="label-closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <div className="h-px w-6 bg-outline-variant/30" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2 space-y-0.5 pb-4" aria-label="Main navigation">
          {links.map((item, index) => {
            if (isSection(item)) {
              return (
                <div key={`section-${item.name}`} className="px-1 pt-4 pb-1">
                  <AnimatePresence mode="popLayout">
                    {isOpen ? (
                      <motion.div
                        key="section-open"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40 shrink-0">
                          {item.name}
                        </span>
                        <div className="flex-1 h-px bg-outline-variant/20" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="section-closed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-center"
                      >
                        <div className="h-px w-6 bg-outline-variant/30" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            if (isGroup(item)) {
              const expanded = expandedGroups.includes(item.name);
              return (
                <div key={item.name}>
                  {/* Group header */}
                  <button
                    onClick={() => isOpen && toggleGroup(item.name)}
                    aria-expanded={expanded}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="shrink-0"
                    >
                      <item.icon className="h-5 w-5" />
                    </motion.div>

                    <AnimatePresence mode="popLayout">
                      {isOpen && (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 text-left whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {isOpen && (
                      <motion.div
                        animate={{ rotate: expanded ? 0 : -90 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                    )}
                  </button>

                  {/* Group children */}
                  <AnimatePresence>
                    {expanded && isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-3 pl-3 border-l border-outline-variant/25 mt-0.5 space-y-0.5 pb-1">
                          {item.children.map((child, ci) => {
                            if (isSubGroup(child)) {
                              const subExpanded = expandedGroups.includes(`${item.name}__${child.name}`);
                              return (
                                <div key={child.name}>
                                  <button
                                    onClick={() => isOpen && toggleGroup(`${item.name}__${child.name}`)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                  >
                                    <child.icon className="h-4 w-4 shrink-0" />
                                    {isOpen && <span className="flex-1 text-left whitespace-nowrap">{child.name}</span>}
                                    {isOpen && (
                                      <motion.div animate={{ rotate: subExpanded ? 0 : -90 }} transition={{ duration: 0.2 }} className="shrink-0">
                                        <ChevronDown className="h-3 w-3" />
                                      </motion.div>
                                    )}
                                  </button>
                                  <AnimatePresence>
                                    {subExpanded && isOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="ml-3 pl-3 border-l border-outline-variant/20 mt-0.5 space-y-0.5 pb-1">
                                          {child.children.map((leaf) => {
                                            const active = isChildActive(leaf.path);
                                            return (
                                              <NavLink
                                                key={leaf.path}
                                                to={leaf.path}
                                                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 overflow-hidden ${active ? "text-brand-500 font-semibold" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
                                              >
                                                {active && <motion.div layoutId={`activeLeafBg-${leaf.path}`} className="absolute inset-0 bg-brand-500/[0.08] rounded-xl" transition={{ type: "spring", stiffness: 320, damping: 30 }} />}
                                                {active && <div className="absolute left-0 inset-y-1.5 w-[3px] bg-brand-500 rounded-r-full z-20" />}
                                                <leaf.icon className="relative z-10 h-4 w-4 shrink-0" />
                                                <span className="relative z-10 whitespace-nowrap">{leaf.name}</span>
                                              </NavLink>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            }

                            const active = isChildActive(child.path);
                            return (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                title={!isOpen ? child.name : undefined}
                                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 overflow-hidden ${
                                  active
                                    ? "text-brand-500 font-semibold"
                                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                }`}
                              >
                                <>
                                  {active && (
                                    <motion.div
                                      layoutId="activeChildBg"
                                      className="absolute inset-0 bg-brand-500/[0.08] rounded-xl"
                                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                                    />
                                  )}
                                  {active && (
                                    <div className="absolute left-0 inset-y-1.5 w-[3px] bg-brand-500 rounded-r-full z-20" />
                                  )}
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: ci * 0.04 }}
                                    className="relative z-10 shrink-0"
                                  >
                                    <child.icon className="h-4 w-4" />
                                  </motion.div>
                                  <span className="relative z-10 whitespace-nowrap">
                                    {child.name}
                                  </span>
                                </>
                              </NavLink>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            /* ── Regular nav item ── */
            const { name, path, icon: Icon } = item;
            return (
              <NavLink
                key={path}
                to={path}
                title={!isOpen ? name : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 overflow-hidden ${
                    isActive
                      ? "text-brand-500 font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeTopBg"
                        className="absolute inset-0 bg-brand-500/[0.08] rounded-xl"
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      />
                    )}
                    {isActive && isOpen && (
                      <div className="absolute left-0 inset-y-1.5 w-[3px] bg-brand-500 rounded-r-full z-20" />
                    )}

                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className={`relative z-10 shrink-0 transition-colors duration-150 ${
                        isActive ? "text-brand-500" : ""
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>

                    <AnimatePresence mode="popLayout">
                      {isOpen && (
                        <motion.span
                          key={name}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.2 }}
                          className="relative z-10 whitespace-nowrap"
                        >
                          {name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Bottom status ── */}
        <div className="border-t border-outline-variant/15 px-3 py-3">
          <AnimatePresence mode="popLayout">
            {isOpen ? (
              <motion.div
                key="status-open"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-1"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs text-on-surface-variant/60 font-medium">
                  System Online
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="status-closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
