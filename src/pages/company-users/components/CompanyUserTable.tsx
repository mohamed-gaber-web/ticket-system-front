import { UserX, Pencil, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Customer } from '@/types/customer.types';

interface Props {
  users: Customer[];
  onEdit: (user: Customer) => void;
  onDeactivate: (user: Customer) => void;
  currentUserId: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  suspended: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function CompanyUserTable({ users, onEdit, onDeactivate, currentUserId }: Props) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <User className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">No users found. Add the first company user.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-outline-variant/20">
          <TableHead>Contact Person</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user._id} className="border-outline-variant/20 hover:bg-surface-container-lowest/50">
            <TableCell className="font-medium">{user.contactPerson}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{user.phone || '—'}</TableCell>
            <TableCell>
              {user.role === 'company_admin' ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                  <User className="h-3 w-3" />
                  User
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${statusColors[user.status] || ''}`}
              >
                {user.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(user)}
                  title="Edit user"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {user._id !== currentUserId && user.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDeactivate(user)}
                    title="Deactivate user"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
