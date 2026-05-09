import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronDown, Sparkles } from "lucide-react";
import logo from "@/assets/logo_extracted.png";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";

interface NavLinkItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  name: string;
  icon: React.ElementType;
  isGroup: true;
  children: NavLinkItem[];
}

type NavigationItem = NavLinkItem | NavGroup;

interface SidebarMobileProps {
  links: NavigationItem[];
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

function isGroup(item: NavigationItem): item is NavGroup {
  return "isGroup" in item && item.isGroup === true;
}

export function SidebarMobile({ links, isMobileOpen, setIsMobileOpen }: SidebarMobileProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const location = useLocation();

  const isChildActive = (path: string) => {
    if (!path.includes('?')) return location.pathname === path;
    const [pathname, search] = path.split('?');
    return location.pathname === pathname && location.search === `?${search}`;
  };

  const toggleGroup = (name: string) =>
    setExpandedGroups((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const close = () => setIsMobileOpen(false);

  return (
    <AnimatePresence>
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-40 md:hidden"
          role="presentation"
          onClick={close}
        >
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute left-0 top-0 w-72 h-full bg-surface-container-low border-r border-outline-variant/20 z-50 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-outline-variant/15">
              <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                aria-label="Close navigation menu"
                className="rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* ── Nav label ── */}
            <div className="px-4 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <span className="label-technical text-on-surface-variant/50 shrink-0">
                  Main Menu
                </span>
                <div className="flex-1 h-px bg-outline-variant/25" />
              </div>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 px-2 space-y-0.5 pb-4" aria-label="Main navigation">
              {links.map((item, index) => {
                if (isGroup(item)) {
                  const expanded = expandedGroups.includes(item.name);
                  return (
                    <div key={item.name}>
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(item.name)}
                        aria-expanded={expanded}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.04 }}
                          className="shrink-0"
                        >
                          <item.icon className="h-5 w-5" />
                        </motion.div>
                        <span className="flex-1 text-left">{item.name}</span>
                        <motion.div
                          animate={{ rotate: expanded ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                          className="shrink-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      {/* Group children */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-3 pl-3 border-l border-outline-variant/25 mt-0.5 space-y-0.5 pb-1">
                              {item.children.map((child, ci) => {
                                const active = isChildActive(child.path);
                                return (
                                  <NavLink
                                    key={child.path}
                                    to={child.path}
                                    onClick={close}
                                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 overflow-hidden ${
                                      active
                                        ? "text-brand-500 font-semibold"
                                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                    }`}
                                  >
                                    <>
                                      {active && (
                                        <motion.div
                                          layoutId="activeMobileChildBg"
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
                    onClick={close}
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
                            layoutId="activeMobileTopBg"
                            className="absolute inset-0 bg-brand-500/[0.08] rounded-xl"
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                          />
                        )}
                        {isActive && (
                          <div className="absolute left-0 inset-y-1.5 w-[3px] bg-brand-500 rounded-r-full z-20" />
                        )}

                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.04 }}
                          className="relative z-10 shrink-0"
                        >
                          <Icon className="h-5 w-5" />
                        </motion.div>

                        <span className="relative z-10">{name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* ── Bottom "Need Help?" ── */}
            <div className="px-3 pb-5 pt-3 border-t border-outline-variant/15">
              <div
                className="p-4 rounded-2xl overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, #003A8F 0%, #001F4D 100%)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white mb-0.5">Need Help?</p>
                    <p className="text-xs text-white/60 leading-snug">
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
