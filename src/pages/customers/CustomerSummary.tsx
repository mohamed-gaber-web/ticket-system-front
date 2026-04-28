import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Users,
  Search,
  X,
  Loader2,
  BarChart2,
  AlertTriangle,
  Ticket as TicketIcon,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Building2,
  User,
} from "lucide-react";
import type { Customer } from "@/types/customer.types";
import type { Ticket } from "@/types/ticket";
import { getCustomers, getCustomerById } from "@/api/customerApi";
import { getTickets } from "@/api/ticketApi";

/* ─────────────────────────────────────────────────────────────
   Spring presets & animation variants
───────────────────────────────────────────────────────────── */
const SP = { type: "spring" as const, stiffness: 260, damping: 22 };
const SP_FAST = { type: "spring" as const, stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SP, delay: i * 0.065 },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...SP, stiffness: 200, damping: 20, delay: 0.25 + i * 0.1 },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { ...SP_FAST, delay: i * 0.055 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065 } },
};

/* ─────────────────────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────────────────────── */
function AnimatedNumber({ to }: { to: number }) {
  const raw = useMotionValue(0);
  const sprung = useSpring(raw, { stiffness: 75, damping: 18, restDelta: 0.5 });
  const display = useTransform(sprung, (v) => String(Math.round(v)));

  useEffect(() => {
    raw.set(to);
  }, [to, raw]);

  return <motion.span>{display}</motion.span>;
}

/* ─────────────────────────────────────────────────────────────
   Stat card
───────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  numberColor: string;
  iconBg: string;
  iconColor: string;
  bar: string;
  loading: boolean;
  idx: number;
}

function StatCard({ label, value, icon: Icon, numberColor, iconBg, iconColor, bar, loading, idx }: StatCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      custom={idx}
      whileHover={{ y: -5, transition: SP_FAST }}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-xl border border-outline-variant/10 overflow-hidden cursor-default transition-shadow duration-300"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] ${bar}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="label-technical mt-0.5">{label}</p>
        <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <div className="h-10 w-20 bg-surface-container-high animate-pulse rounded-lg" />
      ) : (
        <p className={`text-4xl font-extrabold tabular-nums leading-none tracking-tight ${numberColor}`}>
          <AnimatedNumber to={value} />
        </p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section block
───────────────────────────────────────────────────────────── */
function SectionBlock({ bar, header, children }: {
  bar: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm overflow-hidden">
      <div className={`h-[3px] ${bar}`} />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10 bg-surface-container-low/60">
        {header}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Config maps
───────────────────────────────────────────────────────────── */
const PRIORITY_CFG = {
  low:      { label: "Low",      bar: "bg-emerald-400", text: "text-emerald-600" },
  medium:   { label: "Medium",   bar: "bg-amber-400",   text: "text-amber-600"   },
  high:     { label: "High",     bar: "bg-orange-500",  text: "text-orange-600"  },
  critical: { label: "Critical", bar: "bg-red-500",     text: "text-red-600"     },
} as const;

const STATUS_PILL: Record<string, { label: string; pill: string }> = {
  new:              { label: "New",         pill: "bg-yellow-500/12 text-yellow-700"  },
  assigned:         { label: "Assigned",    pill: "bg-orange-500/12 text-orange-600"  },
  in_progress:      { label: "In Progress", pill: "bg-blue-500/12 text-blue-600"      },
  customer_pending: { label: "Pending",     pill: "bg-violet-500/12 text-violet-700"  },
  resolved:         { label: "Resolved",    pill: "bg-emerald-500/12 text-emerald-700"},
  tested:           { label: "Tested",      pill: "bg-teal-500/12 text-teal-700"      },
  delivered:        { label: "Delivered",   pill: "bg-cyan-500/12 text-cyan-700"      },
  closed:           { label: "Closed",      pill: "bg-slate-400/20 text-slate-600"    },
};

const PRIORITY_PILL: Record<string, { label: string; pill: string }> = {
  low:      { label: "Low",      pill: "bg-emerald-500/12 text-emerald-700" },
  medium:   { label: "Medium",   pill: "bg-amber-500/12 text-amber-700"     },
  high:     { label: "High",     pill: "bg-orange-500/12 text-orange-700"   },
  critical: { label: "Critical", pill: "bg-red-500/12 text-red-700"         },
};

type SearchMode = 'customer' | 'company';

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */
export default function CustomerSummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* ── Mode ── */
  const [searchMode, setSearchMode] = useState<SearchMode>('customer');

  /* ── Customer mode state ── */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ── Company mode state ── */
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<string[]>([]);
  const [companySearching, setCompanySearching] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  /* ── Shared state ── */
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 20;

  const comboRef = useRef<HTMLDivElement>(null);
  const companyComboRef = useRef<HTMLDivElement>(null);

  const hasSelection = searchMode === 'customer' ? !!selectedCustomer : !!selectedCompany;

  // Preselect customer from URL
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = searchParams.get("customerId");
    if (!id) return;
    getCustomerById(id)
      .then((res) => setSelectedCustomer(res.data))
      .catch(() => {});
  }, []);

  /* ── Customer search (debounced) ── */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    setDropdownOpen(true);
    const timer = setTimeout(() => {
      getCustomers({ search: query.trim(), limit: 20 })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Company search (debounced) ── */
  useEffect(() => {
    if (!companyQuery.trim()) {
      setCompanyResults([]);
      setCompanyDropdownOpen(false);
      return;
    }
    setCompanySearching(true);
    setCompanyDropdownOpen(true);
    const timer = setTimeout(() => {
      getCustomers({ search: companyQuery.trim(), limit: 50 })
        .then((res) => {
          // Deduplicate company names
          const seen = new Set<string>();
          const names: string[] = [];
          for (const c of res.data) {
            if (c.companyName && !seen.has(c.companyName)) {
              seen.add(c.companyName);
              names.push(c.companyName);
            }
          }
          setCompanyResults(names);
        })
        .catch(() => setCompanyResults([]))
        .finally(() => setCompanySearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [companyQuery]);

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (companyComboRef.current && !companyComboRef.current.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Fetch tickets for selected customer ── */
  useEffect(() => {
    if (searchMode !== 'customer' || !selectedCustomer) return;
    let cancelled = false;
    setTicketsLoading(true);
    const fetchAll = async () => {
      let page = 1;
      const all: Ticket[] = [];
      while (true) {
        const res = await getTickets({ customer: selectedCustomer._id, limit: 200, page });
        all.push(...res.data);
        if (all.length >= res.total || res.data.length === 0) break;
        page++;
      }
      return all;
    };
    fetchAll()
      .then((all) => { if (!cancelled) setTickets(all); })
      .catch(() => { if (!cancelled) setTickets([]); })
      .finally(() => { if (!cancelled) setTicketsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCustomer?._id, searchMode]);

  /* ── Fetch tickets for selected company ── */
  useEffect(() => {
    if (searchMode !== 'company' || !selectedCompany) return;
    let cancelled = false;
    setTicketsLoading(true);
    const fetchAll = async () => {
      let page = 1;
      const all: Ticket[] = [];
      while (true) {
        const res = await getTickets({ companyName: selectedCompany, limit: 200, page });
        all.push(...res.data);
        if (all.length >= res.total || res.data.length === 0) break;
        page++;
      }
      return all;
    };
    fetchAll()
      .then((all) => { if (!cancelled) setTickets(all); })
      .catch(() => { if (!cancelled) setTickets([]); })
      .finally(() => { if (!cancelled) setTicketsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCompany, searchMode]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const counts = { newCount: 0, inProgressCount: 0, resolvedCount: 0, closedCount: 0, slaBreached: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const t of tickets) {
      if (t.status === "new")         counts.newCount++;
      if (t.status === "in_progress") counts.inProgressCount++;
      if (t.status === "resolved")    counts.resolvedCount++;
      if (t.status === "closed")      counts.closedCount++;
      if (t.isSlaBreached)            counts.slaBreached++;
      if (t.priority in byPriority)   byPriority[t.priority as keyof typeof byPriority]++;
    }
    const sorted = [...tickets].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return { total: tickets.length, ...counts, byPriority, sortedTickets: sorted };
  }, [tickets]);

  /* ── Filtered + paginated ticket list ── */
  const filteredTickets = useMemo(() => {
    let list = stats.sortedTickets;
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (ticketSearch.trim()) {
      const q = ticketSearch.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stats.sortedTickets, statusFilter, ticketSearch]);

  const totalPages = Math.ceil(filteredTickets.length / TABLE_PAGE_SIZE);
  const pagedTickets = filteredTickets.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

  /* ── Handlers ── */
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setQuery("");
    setDropdownOpen(false);
    setResults([]);
    setTablePage(1);
    setStatusFilter("all");
    setTicketSearch("");
    setTickets([]);
  };

  const handleSelectCompany = (name: string) => {
    setSelectedCompany(name);
    setCompanyQuery("");
    setCompanyDropdownOpen(false);
    setCompanyResults([]);
    setTablePage(1);
    setStatusFilter("all");
    setTicketSearch("");
    setTickets([]);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setSelectedCompany(null);
    setTickets([]);
    setQuery("");
    setCompanyQuery("");
    setTablePage(1);
    setStatusFilter("all");
    setTicketSearch("");
  };

  const handleModeSwitch = (mode: SearchMode) => {
    if (mode === searchMode) return;
    setSearchMode(mode);
    setSelectedCustomer(null);
    setSelectedCompany(null);
    setTickets([]);
    setQuery("");
    setCompanyQuery("");
    setTablePage(1);
    setStatusFilter("all");
    setTicketSearch("");
  };

  const statCards: (StatCardProps & { key: string })[] = [
    { key: "total",       label: "Total Tickets", value: stats.total,           icon: TicketIcon,     numberColor: "text-brand-500",   iconBg: "bg-brand-100",        iconColor: "text-brand-500",   bar: "bg-brand-500",    loading: ticketsLoading, idx: 0 },
    { key: "new",         label: "New",            value: stats.newCount,        icon: BarChart2,      numberColor: "text-yellow-600",  iconBg: "bg-yellow-500/10",    iconColor: "text-yellow-500",  bar: "bg-yellow-400",   loading: ticketsLoading, idx: 1 },
    { key: "in_progress", label: "In Progress",    value: stats.inProgressCount, icon: Activity,       numberColor: "text-blue-600",    iconBg: "bg-blue-500/10",      iconColor: "text-blue-500",    bar: "bg-blue-500",     loading: ticketsLoading, idx: 2 },
    { key: "resolved",    label: "Resolved",       value: stats.resolvedCount,   icon: CheckCircle2,   numberColor: "text-emerald-600", iconBg: "bg-emerald-500/10",   iconColor: "text-emerald-500", bar: "bg-emerald-400",  loading: ticketsLoading, idx: 3 },
    { key: "closed",      label: "Closed",         value: stats.closedCount,     icon: XCircle,        numberColor: "text-slate-500",   iconBg: "bg-slate-400/10",     iconColor: "text-slate-400",   bar: "bg-slate-400",    loading: ticketsLoading, idx: 4 },
    { key: "sla",         label: "SLA Breached",   value: stats.slaBreached,     icon: AlertTriangle,  numberColor: "text-red-600",     iconBg: "bg-red-500/10",       iconColor: "text-red-500",     bar: "bg-red-500",      loading: ticketsLoading, idx: 5 },
  ];

  /* ── Customer name helper for company-mode ticket list ── */
  const getCustomerName = (customer: Ticket['customer']) => {
    if (!customer) return '—';
    if (typeof customer === 'object') return customer.contactPerson || customer.companyName || '—';
    return '—';
  };

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Customer Summary</h1>
          <p className="text-on-surface-variant mt-1">
            {searchMode === 'customer'
              ? 'Select a customer to view their ticket statistics'
              : 'Select a company to view all tickets across the company'}
          </p>
        </div>
        {hasSelection && (
          <button
            onClick={() => {
              if (searchMode === 'customer' && selectedCustomer) {
                navigate(`/tickets?customer=${selectedCustomer._id}`);
              } else if (searchMode === 'company' && selectedCompany) {
                navigate(`/tickets?companyName=${encodeURIComponent(selectedCompany)}`);
              }
            }}
            className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 transition-colors"
          >
            View All Tickets
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low w-fit">
        <button
          onClick={() => handleModeSwitch('customer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            searchMode === 'customer'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <User className="h-4 w-4" />
          By Customer
        </button>
        <button
          onClick={() => handleModeSwitch('company')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            searchMode === 'company'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Building2 className="h-4 w-4" />
          By Company
        </button>
      </div>

      {/* Search area */}
      <AnimatePresence mode="wait">
        {searchMode === 'customer' ? (
          <motion.div
            key="customer-search"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SP_FAST}
            ref={comboRef}
            className="relative max-w-lg"
          >
            {selectedCustomer ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600">
                    {selectedCustomer.companyName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{selectedCustomer.companyName}</p>
                  <p className="text-xs text-on-surface-variant truncate">{selectedCustomer.email}</p>
                </div>
                <button
                  onClick={handleClear}
                  className="p-1 rounded-lg hover:bg-surface-container-high transition-colors shrink-0"
                >
                  <X className="h-4 w-4 text-on-surface-variant" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customers by name or email..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant animate-spin" />
                )}
              </div>
            )}

            <AnimatePresence>
              {dropdownOpen && !selectedCustomer && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={SP_FAST}
                  className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl overflow-hidden"
                >
                  {searching ? (
                    <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-on-surface-variant">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-3.5 text-sm text-on-surface-variant">
                      {query.trim() ? "No customers found." : "Type to search customers..."}
                    </div>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto divide-y divide-outline-variant/10">
                      {results.map((customer) => (
                        <li key={customer._id}>
                          <button
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
                          >
                            <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-brand-600">
                                {customer.companyName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-on-surface truncate">{customer.companyName}</p>
                              <p className="text-xs text-on-surface-variant truncate">{customer.email}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="company-search"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SP_FAST}
            ref={companyComboRef}
            className="relative max-w-lg"
          >
            {selectedCompany ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
                <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{selectedCompany}</p>
                  <p className="text-xs text-on-surface-variant">Company — all users included</p>
                </div>
                <button
                  onClick={handleClear}
                  className="p-1 rounded-lg hover:bg-surface-container-high transition-colors shrink-0"
                >
                  <X className="h-4 w-4 text-on-surface-variant" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  placeholder="Search by company name..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                {companySearching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant animate-spin" />
                )}
              </div>
            )}

            <AnimatePresence>
              {companyDropdownOpen && !selectedCompany && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={SP_FAST}
                  className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl overflow-hidden"
                >
                  {companySearching ? (
                    <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-on-surface-variant">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : companyResults.length === 0 ? (
                    <div className="px-4 py-3.5 text-sm text-on-surface-variant">
                      {companyQuery.trim() ? "No companies found." : "Type to search companies..."}
                    </div>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto divide-y divide-outline-variant/10">
                      {companyResults.map((name) => (
                        <li key={name}>
                          <button
                            onClick={() => handleSelectCompany(name)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
                          >
                            <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-violet-600" />
                            </div>
                            <p className="text-sm font-medium text-on-surface truncate">{name}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {!hasSelection ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="p-5 rounded-2xl bg-surface-container-low">
              {searchMode === 'company'
                ? <Building2 className="h-10 w-10 text-on-surface-variant/50" />
                : <Users className="h-10 w-10 text-on-surface-variant/50" />
              }
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-on-surface">
                {searchMode === 'company' ? 'Select a Company' : 'Select a Customer'}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                {searchMode === 'company'
                  ? 'Choose a company above to view all tickets from all users in that company'
                  : 'Choose a customer above to view their ticket summary'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={searchMode === 'customer' ? selectedCustomer?._id : selectedCompany}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Info strip */}
            <motion.div
              variants={sectionVariants}
              custom={0}
              className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm"
            >
              {searchMode === 'customer' && selectedCustomer ? (
                <>
                  <div className="h-12 w-12 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-lg font-extrabold text-brand-600">
                      {selectedCustomer.companyName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-on-surface">{selectedCustomer.companyName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      <p className="text-xs text-on-surface-variant">{selectedCustomer.email}</p>
                      {selectedCustomer.contactPerson && (
                        <p className="text-xs text-on-surface-variant">{selectedCustomer.contactPerson}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    selectedCustomer.status === "active"
                      ? "bg-emerald-500/12 text-emerald-700"
                      : selectedCustomer.status === "inactive"
                      ? "bg-slate-400/20 text-slate-600"
                      : "bg-red-500/12 text-red-600"
                  }`}>
                    {selectedCustomer.status}
                  </span>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-on-surface">{selectedCompany}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">All users and admins in this company</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/12 text-violet-700">
                    Company View
                  </span>
                </>
              )}
            </motion.div>

            {/* Stat cards */}
            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {statCards.map(({ key, ...card }) => (
                <StatCard key={key} {...card} />
              ))}
            </motion.div>

            {/* Priority breakdown */}
            <motion.div variants={sectionVariants} custom={1}>
              <SectionBlock
                bar="bg-violet-500"
                header={<p className="text-sm font-semibold text-on-surface">Tickets by Priority</p>}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-outline-variant/10">
                  {(["low", "medium", "high", "critical"] as const).map((p) => {
                    const cfg = PRIORITY_CFG[p];
                    const count = stats.byPriority[p];
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={p} className="flex flex-col items-center gap-2 p-5">
                        {ticketsLoading ? (
                          <div className="h-8 w-12 bg-surface-container-high animate-pulse rounded-lg" />
                        ) : (
                          <p className={`text-3xl font-extrabold tabular-nums ${cfg.text}`}>
                            <AnimatedNumber to={count} />
                          </p>
                        )}
                        <p className="text-xs font-semibold text-on-surface-variant">{cfg.label}</p>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ ...SP, delay: 0.3 }}
                            className={`h-full rounded-full ${cfg.bar}`}
                          />
                        </div>
                        <p className="text-xs text-on-surface-variant">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </SectionBlock>
            </motion.div>

            {/* All Tickets */}
            <motion.div variants={sectionVariants} custom={2}>
              <SectionBlock
                bar="bg-brand-500"
                header={
                  <div className="flex items-center justify-between w-full gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface shrink-0">
                      All Tickets
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-[11px] font-bold">
                        {stats.total}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant pointer-events-none" />
                        <input
                          type="text"
                          value={ticketSearch}
                          onChange={(e) => { setTicketSearch(e.target.value); setTablePage(1); }}
                          placeholder="Search tickets..."
                          className="pl-8 pr-3 py-1.5 rounded-lg border border-outline-variant/30 bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-44"
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setTablePage(1); }}
                        className="py-1.5 px-2 rounded-lg border border-outline-variant/30 bg-surface text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      >
                        <option value="all">All statuses</option>
                        {Object.entries(STATUS_PILL).map(([val, { label }]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                }
              >
                {ticketsLoading ? (
                  <div className="divide-y divide-outline-variant/10">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="h-4 w-24 bg-surface-container-high animate-pulse rounded-full hidden sm:block" />
                        <div className="flex-1 h-4 bg-surface-container-high animate-pulse rounded-full" />
                        <div className="h-5 w-16 bg-surface-container-high animate-pulse rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-on-surface-variant">
                    {stats.total === 0
                      ? searchMode === 'company'
                        ? "No tickets found for this company."
                        : "No tickets found for this customer."
                      : "No tickets match your filters."}
                  </div>
                ) : (
                  <>
                    <motion.ul
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      className="divide-y divide-outline-variant/10"
                    >
                      {pagedTickets.map((ticket, idx) => {
                        const sc = STATUS_PILL[ticket.status] ?? { label: ticket.status, pill: "bg-slate-400/20 text-slate-600" };
                        const pc = PRIORITY_PILL[ticket.priority] ?? { label: ticket.priority, pill: "bg-slate-400/20 text-slate-600" };
                        return (
                          <motion.li
                            key={ticket._id}
                            variants={rowVariants}
                            custom={idx}
                            onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low/60 cursor-pointer transition-colors"
                          >
                            <span className="font-mono text-xs text-on-surface-variant shrink-0 hidden sm:inline">
                              {ticket.ticketNumber}
                            </span>
                            <p className="flex-1 text-sm text-on-surface truncate">{ticket.subject}</p>
                            {searchMode === 'company' && (
                              <span className="text-xs text-on-surface-variant shrink-0 hidden lg:inline truncate max-w-[120px]">
                                {getCustomerName(ticket.customer)}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${sc.pill}`}>
                              {sc.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 hidden sm:inline ${pc.pill}`}>
                              {pc.label}
                            </span>
                            <span className="text-xs text-on-surface-variant shrink-0 hidden md:inline">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </motion.li>
                        );
                      })}
                    </motion.ul>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/10 bg-surface-container-low/40">
                        <span className="text-xs text-on-surface-variant">
                          Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                            disabled={tablePage === 1}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Prev
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - tablePage) <= 1)
                            .reduce<(number | "...")[]>((acc, p, i, arr) => {
                              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((p, i) =>
                              p === "..." ? (
                                <span key={`ellipsis-${i}`} className="px-1 text-xs text-on-surface-variant">…</span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() => setTablePage(p as number)}
                                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                                    tablePage === p
                                      ? "bg-brand-500 text-white"
                                      : "text-on-surface-variant hover:bg-surface-container-high"
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            )}
                          <button
                            onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                            disabled={tablePage === totalPages}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </SectionBlock>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
