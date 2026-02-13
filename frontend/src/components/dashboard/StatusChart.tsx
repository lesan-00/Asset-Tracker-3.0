import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { mockDashboardStats } from '@/data/mockData';

const data = [
  { name: 'Available', value: mockDashboardStats.availableLaptops, color: 'hsl(142, 71%, 45%)' },
  { name: 'Assigned', value: mockDashboardStats.assignedLaptops, color: 'hsl(226, 70%, 55%)' },
  { name: 'Under Repair', value: mockDashboardStats.underRepair, color: 'hsl(38, 92%, 50%)' },
  { name: 'Lost/Stolen', value: mockDashboardStats.lostOrStolen, color: 'hsl(0, 84%, 60%)' },
];

export function StatusChart() {
  return (
    <div className="rounded-xl border bg-card p-6 animate-fade-in">
      <h3 className="font-semibold text-lg mb-6">Laptop Status Distribution</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
