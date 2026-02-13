import { LaptopStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LaptopStatusBadgeProps {
  status: LaptopStatus | string | undefined | null;
}

const statusConfig: Record<LaptopStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'status-available' },
  ASSIGNED: { label: 'Assigned', className: 'status-assigned' },
  MAINTENANCE: { label: 'Under Repair', className: 'status-repair' },
  LOST: { label: 'Lost/Stolen', className: 'status-lost' },
  RETIRED: { label: 'Retired', className: 'status-retired' },
};

export function LaptopStatusBadge({ status }: LaptopStatusBadgeProps) {
  const normalized =
    typeof status === "string" ? status.toUpperCase() : undefined;
  const mapped =
    normalized === "UNDER_REPAIR" || normalized === "REPAIR" || normalized === "MAINTENANCE"
      ? "MAINTENANCE"
      : (normalized as LaptopStatus | undefined);
  const config = (mapped && statusConfig[mapped]) || {
    label: "Unknown",
    className: "status-unknown",
  };
  
  return (
    <Badge variant="outline" className={cn('font-medium border', config.className)}>
      {config.label}
    </Badge>
  );
}
