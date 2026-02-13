import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockIssues, mockLaptops } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const priorityStyles = {
  critical: 'status-lost',
  high: 'status-repair',
  medium: 'status-assigned',
  low: 'status-available',
};

export function OpenIssues() {
  const openIssues = mockIssues.filter(i => i.status === 'open' || i.status === 'in_progress');

  const getLaptop = (id: string) => mockLaptops.find(l => l.id === id);

  return (
    <div className="rounded-xl border bg-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-status-repair" />
          <h3 className="font-semibold text-lg">Open Issues</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/issues" className="gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {openIssues.map((issue) => {
          const laptop = getLaptop(issue.laptopId);
          
          return (
            <div 
              key={issue.id} 
              className="p-4 rounded-lg border bg-background hover:border-primary/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn(priorityStyles[issue.priority])}>
                      {issue.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {issue.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="font-medium truncate">{issue.description}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {laptop?.assetTag} • {laptop?.brand} {laptop?.model}
                  </p>
                </div>
                <Badge variant={issue.status === 'open' ? 'destructive' : 'secondary'}>
                  {issue.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          );
        })}

        {openIssues.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No open issues! 🎉
          </p>
        )}
      </div>
    </div>
  );
}
