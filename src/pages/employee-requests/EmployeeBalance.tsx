import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchEmployeeBalances,
  fetchMyBalance,
  upsertEmployeeBalance,
} from '@/redux/slices/employeeBalanceSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, CalendarOff, Clock, Save } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function EmployeeBalance() {
  const { consultantRole } = useAppSelector((state) => state.auth);
  const isAdmin = consultantRole === 'admin';

  const [year, setYear] = useState(CURRENT_YEAR);

  if (isAdmin) return <AdminBalances year={year} setYear={setYear} />;
  return <MyBalanceView year={year} setYear={setYear} />;
}

function YearSelect({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  return (
    <select
      value={year}
      onChange={(e) => setYear(Number(e.target.value))}
      className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}

// ---- Employee self-view ----
function MyBalanceView({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const dispatch = useAppDispatch();
  const { myBalance } = useAppSelector((state) => state.employeeBalances);

  useEffect(() => { dispatch(fetchMyBalance(year)); }, [year]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">My Balance</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Your vacation and excuse usage for {year}</p>
        </div>
        <YearSelect year={year} setYear={setYear} />
      </div>

      {myBalance ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={<Plane className="w-5 h-5" />} label="Annual Allotment" value={`${myBalance.annualAllotment + myBalance.carriedOver} days`} sub={myBalance.carriedOver ? `${myBalance.annualAllotment} + ${myBalance.carriedOver} carried` : undefined} />
          <Stat icon={<CalendarOff className="w-5 h-5" />} label="Used Vacation" value={`${myBalance.usedVacationDays} days`} />
          <Stat icon={<Plane className="w-5 h-5" />} label="Remaining" value={`${myBalance.remainingDays} days`} highlight />
          <Stat icon={<Clock className="w-5 h-5" />} label="Excuse Hours Used" value={`${myBalance.usedExcuseHours} h`} />
        </div>
      ) : (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
        </div>
      )}
    </div>
  );
}

// ---- Admin management view ----
function AdminBalances({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const dispatch = useAppDispatch();
  const { balances, loading } = useAppSelector((state) => state.employeeBalances);
  const { consultants } = useAppSelector((state) => state.consultants);

  // Inline edits keyed by balance id
  const [edits, setEdits] = useState<Record<string, { annualAllotment: string; carriedOver: string }>>({});
  // New-balance form
  const [newEmployee, setNewEmployee] = useState('');
  const [newAllotment, setNewAllotment] = useState('21');

  useEffect(() => { dispatch(fetchEmployeeBalances({ year })); }, [year]);
  useEffect(() => { dispatch(fetchConsultants({ limit: 999 } as any)); }, []);

  const setEdit = (id: string, field: 'annualAllotment' | 'carriedOver', value: string) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveRow = (b: typeof balances[number]) => {
    const e = edits[b._id];
    const employeeId = typeof b.employee === 'object' ? b.employee._id : b.employee;
    dispatch(upsertEmployeeBalance({
      employee: employeeId,
      employeeModel: b.employeeModel,
      year: b.year,
      annualAllotment: e?.annualAllotment !== undefined ? Number(e.annualAllotment) : b.annualAllotment,
      carriedOver: e?.carriedOver !== undefined ? Number(e.carriedOver) : b.carriedOver,
    }));
  };

  const addBalance = () => {
    if (!newEmployee) return;
    dispatch(upsertEmployeeBalance({
      employee: newEmployee,
      employeeModel: 'Consultant',
      year,
      annualAllotment: Number(newAllotment),
    })).then(() => {
      setNewEmployee('');
      setNewAllotment('21');
      dispatch(fetchEmployeeBalances({ year }));
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Employee Balances</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Set annual allotments and review usage for {year}</p>
        </div>
        <YearSelect year={year} setYear={setYear} />
      </div>

      {/* Add / adjust a consultant's allotment */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4 grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="newEmployee">Consultant</Label>
          <select
            id="newEmployee"
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select consultant…</option>
            {consultants.map((c: any) => (
              <option key={c._id} value={c._id}>{c.fullName}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newAllotment">Annual Days</Label>
          <Input id="newAllotment" type="number" min={0} value={newAllotment} onChange={(e) => setNewAllotment(e.target.value)} />
        </div>
        <Button onClick={addBalance} disabled={!newEmployee}>Set Allotment</Button>
      </div>

      {/* Balances table */}
      <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-16">
            <Plane className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4" />
            <p className="text-on-surface text-lg font-semibold">No balances for {year}</p>
            <p className="text-sm text-on-surface-variant mt-1">Set an allotment above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-container-low">
                <tr className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 w-32">Annual Days</th>
                  <th className="px-4 py-3 w-32">Carried Over</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Excuse Hrs</th>
                  <th className="px-4 py-3 text-right">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {balances.map((b) => {
                  const e = edits[b._id];
                  const name = typeof b.employee === 'object' ? `${b.employee.firstName} ${b.employee.lastName}` : '—';
                  return (
                    <tr key={b._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-on-surface">{name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{b.employeeModel}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          value={e?.annualAllotment ?? String(b.annualAllotment)}
                          onChange={(ev) => setEdit(b._id, 'annualAllotment', ev.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          value={e?.carriedOver ?? String(b.carriedOver)}
                          onChange={(ev) => setEdit(b._id, 'carriedOver', ev.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-3 text-on-surface">{b.usedVacationDays} d</td>
                      <td className="px-4 py-3 font-semibold text-primary">{b.remainingDays} d</td>
                      <td className="px-4 py-3 text-on-surface">{b.usedExcuseHours} h</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="icon-sm" variant="ghost" onClick={() => saveRow(b)} aria-label="Save balance">
                          <Save className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[1rem] p-5 ${highlight ? 'bg-primary/10' : 'bg-surface-container-lowest'}`}>
      <div className={`flex items-center gap-2 text-sm ${highlight ? 'text-primary' : 'text-on-surface-variant'}`}>{icon}{label}</div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  );
}
