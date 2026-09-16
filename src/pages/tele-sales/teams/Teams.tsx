import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchTeams, createTeam, updateTeam, deleteTeam, toggleTeamStatus,
} from '@/redux/slices/teleSalesTeamsSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Swal from 'sweetalert2';
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, X, Globe, ShieldAlert } from 'lucide-react';
import { isSystemAdmin } from '@/lib/teleSalesRole';
import type { TeleSalesTeam, CreateTeamData } from '@/types/teleSales.types';

const emptyForm: CreateTeamData = { name: '', code: '', description: '', isActive: true };

/**
 * Tele-sales team management — the tenant boundaries of the module.
 *
 * Super admins only: a team manager can run their own team but must not be able
 * to invent, rename or delete the boundaries themselves. The API enforces the
 * same rule, so this screen is a convenience, not the control.
 */
export default function Teams() {
  const dispatch = useAppDispatch();
  const { teams, loading, total } = useAppSelector((s) => s.teleSalesTeams);
  const { user } = useAppSelector((s) => s.auth);
  const superAdmin = isSystemAdmin(user);

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeleSalesTeam | null>(null);
  const [form, setForm] = useState<CreateTeamData>(emptyForm);

  // Debounced: the effect keys off `search`, so without this every keystroke
  // would fire its own request.
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(fetchTeams(search ? { search } : undefined));
    }, 300);
    return () => clearTimeout(t);
  }, [dispatch, search]);

  const openCreate = () => {
    setEditingTeam(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (team: TeleSalesTeam) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      code: team.code,
      description: team.description || '',
      isActive: team.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (team: TeleSalesTeam) => {
    const r = await Swal.fire({
      title: `Delete "${team.name}"?`,
      html:
        'This is only possible while the team is empty. Any agents or leads still ' +
        'inside it must be moved to another team first, or they would become ' +
        'invisible to everyone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
    });
    if (r.isConfirmed) dispatch(deleteTeam(team._id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name || !code) return;

    if (editingTeam) {
      await dispatch(updateTeam({ id: editingTeam._id, data: { ...form, name, code } }));
    } else {
      await dispatch(createTeam({ ...form, name, code }));
    }
    setIsDialogOpen(false);
  };

  if (!superAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16 flex flex-col items-center text-center gap-3 text-on-surface-variant">
          <ShieldAlert className="w-10 h-10 opacity-40" />
          <p className="font-medium text-on-surface">Teams are managed by a super admin</p>
          <p className="text-sm">
            You can manage the agents and leads inside your own team from the Agents and Leads screens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Teams</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {total} team{total === 1 ? '' : 's'} — each one sees only its own leads and agents
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Team
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <Input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <Globe className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No teams yet</p>
            <p className="text-sm mt-1">Create Egypt, UAE and KSA to separate the pipelines.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container/50">
                {['Team', 'Code', 'Description', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {teams.map((team) => (
                <tr key={team._id} className="hover:bg-surface-container/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-on-surface">{team.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                      {team.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{team.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${team.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {team.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(team)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-brand-500 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => dispatch(toggleTeamStatus(team._id))}
                        className={`p-1.5 rounded-lg hover:bg-surface-container transition-colors ${team.isActive ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
                        title={team.isActive ? 'Deactivate (hides it from the pickers)' : 'Activate'}
                      >
                        {team.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(team)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
              <h2 className="text-lg font-semibold text-on-surface">{editingTeam ? 'Edit Team' : 'New Team'}</h2>
              <button onClick={() => setIsDialogOpen(false)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Name *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Egypt" required />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="EG"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Short identifier used by scripts and reports. Stays stable even if the team is renamed.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Description</label>
                <Input value={form.description || ''} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Egypt tele-sales team" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-on-surface">
                  Active <span className="text-on-surface-variant">— inactive teams stay readable but are hidden from the pickers</span>
                </span>
              </label>
              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingTeam ? 'Update' : 'Create Team'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
