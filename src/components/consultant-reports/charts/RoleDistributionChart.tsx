import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import type { RoleCount } from '../../../types/consultant.types';

interface RoleDistributionChartProps {
  data: RoleCount[];
}

const COLORS = {
  admin: '#8b5cf6',
  senior_consultant: '#3b82f6',
  consultant: '#6b7280',
};

const ROLE_LABELS = {
  admin: 'Admin',
  senior_consultant: 'Senior Consultant',
  consultant: 'Consultant',
};

export default function RoleDistributionChart({ data }: RoleDistributionChartProps) {
  const chartData = data.map((item) => ({
    name: ROLE_LABELS[item._id] || item._id,
    value: item.count,
    color: COLORS[item._id] || '#6b7280',
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consultants by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultants by Role</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value} (${((value / total) * 100).toFixed(1)}%)`,
                'Count',
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
