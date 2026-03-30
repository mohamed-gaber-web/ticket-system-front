import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import type { ConsultantCount } from '../../../types/assignment.types';

interface TopConsultantsChartProps {
  data: ConsultantCount[];
  limit?: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function TopConsultantsChart({ data, limit = 10 }: TopConsultantsChartProps) {
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({
      name: item.consultantName,
      assignments: item.count,
    }));

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Consultants by Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-on-surface-variant py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Consultants by Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" />
            <Tooltip />
            <Bar dataKey="assignments" fill="#3b82f6" radius={[0, 4, 4, 0]}>
              {sortedData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
