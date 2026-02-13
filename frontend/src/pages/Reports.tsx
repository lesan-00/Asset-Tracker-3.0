import { Download, FileText, PieChart, BarChart3, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  {
    title: 'Current Laptop Assignments',
    description: 'All active laptop assignments with staff details and accessories',
    icon: Users,
    format: 'Excel, PDF',
  },
  {
    title: 'Laptop Inventory Status',
    description: 'Complete inventory with current status, specifications, and warranty info',
    icon: PieChart,
    format: 'Excel, PDF',
  },
  {
    title: 'Assignment History',
    description: 'Historical record of all laptop assignments and returns',
    icon: Calendar,
    format: 'Excel, PDF',
  },
  {
    title: 'Issue & Repair Summary',
    description: 'Summary of all issues, repairs, and resolutions by category',
    icon: BarChart3,
    format: 'Excel, PDF',
  },
  {
    title: 'Accessories Loss Report',
    description: 'Track missing or damaged accessories across all assignments',
    icon: FileText,
    format: 'Excel, PDF',
  },
  {
    title: 'Warranty Expiration Report',
    description: 'Laptops approaching or past warranty expiration date',
    icon: Calendar,
    format: 'Excel, PDF',
  },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and export reports for auditing and analysis
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="card-hover animate-fade-in">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <report.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Available: {report.format}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="w-3 h-3" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="w-3 h-3" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Data Import</CardTitle>
          <CardDescription>
            Import laptops or staff data from CSV/Excel files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Import Laptops
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Import Staff
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
