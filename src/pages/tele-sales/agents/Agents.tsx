import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchAgents, createAgent, updateAgent, deleteAgent, toggleAgentStatus } from '@/redux/slices/teleSalesAgentsSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Swal from 'sweetalert2';
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, X, Shield, User } from 'lucide-react';
import type { TeleSalesAgent, CreateAgentData, UpdateAgentData, TeleSalesRole } from '@/types/teleSales.types';

export default function Agents() {
  const dispatch = useAppDispatch();
  const { agents, loading, total } = useAppSelector((s) => s.teleSalesAgents);

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<TeleSalesAgent | null>(null);
  const [form, setForm] = useState<CreateAgentData>({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'user' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchAgents({ search: search || undefined, limit: 50 }));
  }, [dispatch, search]);

  const openCreate = () => {
    setEditingAgent(null);
    setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'user' });
    setIsDialogOpen(true);
  };

  const openEdit = (agent: TeleSalesAgent) => {
    setEditingAgent(agent);
    setForm({ firstName: agent.firstName, lastName: agent.lastName, email: agent.email, password: '', phone: agent.phone || '', role: agent.role });
    setIsDialogOpen(true);
  };

  const handleDelete = async (agent: TeleSalesAgent) => {
    const r = await Swal.fire({
      title: 'Delete Agent?',
      text: `"${agent.firstName} ${agent.lastName}" will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
    });
    if (r.isConfirmed) dispatch(deleteAgent(agent._id));
  };

  const handleToggle = (agent: TeleSalesAgent) => dispatch(toggleAgentStatus(agent._id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) return;
    if (editingAgent) {
      const updateData: UpdateAgentData = { firstName: form.firstName, lastName: form.lastName, phone: form.phone, role: form.role };
      await dispatch(updateAgent({ id: editingAgent._id, data: updateData }));
    } else {
      if (!form.password) return;
      await dispatch(createAgent(form));
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Agents</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{total} total agents</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Agent
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <Input placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <User className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No agents found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container/50">
                {['Name', 'Email', 'Phone', 'Role', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {agents.map((agent) => (
                <tr key={agent._id} className="hover:bg-surface-container/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {agent.firstName} {agent.lastName}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{agent.email}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{agent.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${agent.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {agent.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${agent.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(agent)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-brand-500 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(agent)} className={`p-1.5 rounded-lg hover:bg-surface-container transition-colors ${agent.status === 'active' ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`} title="Toggle Status">
                        {agent.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(agent)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors" title="Delete">
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

      {/* Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
              <h2 className="text-lg font-semibold text-on-surface">{editingAgent ? 'Edit Agent' : 'New Agent'}</h2>
              <button onClick={() => setIsDialogOpen(false)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">First Name *</label>
                  <Input value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Mohamed" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">Last Name *</label>
                  <Input value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Gaber" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="agent@company.com" required disabled={!!editingAgent} />
              </div>
              {!editingAgent && (
                <div>
                  <label className="text-sm font-medium text-on-surface mb-1 block">Password *</label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" required minLength={8} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Phone</label>
                <Input value={form.phone || ''} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+20 100 000 0000" />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1 block">Role</label>
                <select value={form.role || 'user'} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as TeleSalesRole }))}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingAgent ? 'Update' : 'Create Agent'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
