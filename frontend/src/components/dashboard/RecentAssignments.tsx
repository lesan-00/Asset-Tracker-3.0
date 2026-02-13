import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockAssignments, mockLaptops, mockStaff } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function RecentAssignments() {
  const recentAssignments = mockAssignments.slice(0, 5);

  const getLaptop = (id: string) => mockLaptops.find(l => l.id === id);
  const getStaff = (id: string) => mockStaff.find(s => s.id === id);

  return (
    <div className="rounded-xl border bg-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Recent Assignments</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/assignments" className="gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {recentAssignments.map((assignment) => {
          const laptop = getLaptop(assignment.laptopId);
          const staff = getStaff(assignment.staffId);
          
          return (
            <div 
              key={assignment.id} 
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {laptop?.brand.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{laptop?.brand} {laptop?.model}</p>
                  <p className="text-sm text-muted-foreground">{laptop?.assetTag}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-medium">{staff?.fullName}</p>
                <p className="text-sm text-muted-foreground">{staff?.department}</p>
              </div>

              <Badge variant={assignment.isActive ? "default" : "secondary"}>
                {assignment.isActive ? 'Active' : 'Returned'}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
