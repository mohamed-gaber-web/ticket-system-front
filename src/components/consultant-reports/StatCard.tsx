import { Card, CardContent } from '../ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  colorClass?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass = 'text-brand-600',
}: StatCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-on-surface-variant uppercase tracking-wide">
              {title}
            </p>
            <h3 className={cn('text-3xl font-bold mt-2', colorClass)}>{value}</h3>
            {subtitle && (
              <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-3 rounded-lg bg-opacity-10', colorClass)}>
              <Icon className={cn('w-6 h-6', colorClass)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
