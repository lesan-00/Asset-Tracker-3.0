import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { LaptopStatusBadge } from "@/components/laptops/LaptopStatusBadge";
import { LaptopFormModal } from "@/components/laptops/LaptopFormModal";
import { LaptopDeleteDialog } from "@/components/laptops/LaptopDeleteDialog";
import { departments } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { apiClient, APIClientError } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV } from "@/utils/exportUtils";
import { Laptop } from "@/types";

export default function Laptops() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  // State
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [laptopToDelete, setLaptopToDelete] = useState<{
    id: string;
    assetTag: string;
  } | null>(null);
  const [accessoriesByLaptop, setAccessoriesByLaptop] = useState<
    Record<string, { id: string; name: string; quantity: number }[]>
  >({});

  const loadAccessories = async (laptopIds: string[]) => {
    if (laptopIds.length === 0) {
      setAccessoriesByLaptop({});
      return;
    }

    try {
      const results = await Promise.all(
        laptopIds.map(async (id) => {
          const response = await apiClient.get<{
            id: string;
            quantity: number;
            accessory?: { id: string; name: string };
          }[]>(`/accessories/${id}/items`);

          const items = Array.isArray(response)
            ? response
            : Array.isArray((response as { data?: unknown }).data)
              ? ((response as { data: any[] }).data)
              : [];

          const normalized = items
            .map((item) => ({
              id: item.accessory?.id || item.id,
              name: item.accessory?.name || "Unknown",
              quantity: item.quantity ?? 1,
            }))
            .filter((item) => !!item.id);

          return [id, normalized] as const;
        })
      );

      const next: Record<string, { id: string; name: string; quantity: number }[]> = {};
      for (const [id, items] of results) {
        next[id] = items;
      }
      setAccessoriesByLaptop(next);
    } catch (error) {
      console.error("Failed to load laptop accessories:", error);
    }
  };

  // Fetch laptops
  const fetchLaptops = async () => {
    setLoading(true);
    setError(null);
    setIsBackendDown(false);

    try {
      const response = await apiClient.get<Laptop[]>("/laptops");
      const maybeList = Array.isArray(response)
        ? response
        : Array.isArray((response as { data?: unknown }).data)
          ? ((response as { data: Laptop[] }).data)
          : [];

      setLaptops(maybeList);
      await loadAccessories(maybeList.map((laptop) => laptop.id));
    } catch (error) {
      setIsBackendDown(false);

      if (error instanceof APIClientError) {
        // Check for network/backend down errors
        if (error.code === "NETWORK_ERROR") {
          setIsBackendDown(true);
          setError(null);
        } else {
          setError(error.message);
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load laptops";
        setError(errorMessage);
      }
      setLaptops([]);
    } finally {
      setLoading(false);
    }
  };

  // Wait for auth to load before fetching
  useEffect(() => {
    if (!authLoading) {
      fetchLaptops();
    }
  }, [authLoading]);

  // Debounced client-side search
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter laptops - DEFENSIVE: Handle undefined properties
  let filteredLaptops: Laptop[] = [];
  try {
    filteredLaptops = laptops.filter((laptop) => {
      const matchesSearch =
        (laptop?.assetTag?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (laptop?.serialNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (laptop?.brand?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (laptop?.model?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || laptop.status === statusFilter;
      const matchesDepartment =
        departmentFilter === "all" || laptop.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  } catch (filterError) {
    console.error("Filter error:", filterError);
    filteredLaptops = [];
  }

  // Handlers
  const handleAddClick = () => {
    setSelectedLaptop(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (laptop: Laptop) => {
    setSelectedLaptop(laptop);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (laptop: Laptop) => {
    setLaptopToDelete({ id: laptop.id, assetTag: laptop.assetTag });
    setDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    fetchLaptops();
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    fetchLaptops();
  };

  const handleExport = () => {
    if (filteredLaptops.length === 0) {
      toast({
        title: "Info",
        description: "No laptops to export",
      });
      return;
    }

    const exportData = filteredLaptops.map((laptop) => ({
      "Asset Tag": laptop.assetTag,
      Brand: laptop.brand,
      Model: laptop.model,
      "Serial Number": laptop.serialNumber,
      CPU: laptop.specifications?.cpu || "N/A",
      RAM: laptop.specifications?.ram || "N/A",
      Storage: laptop.specifications?.storage || "N/A",
      Department: laptop.department,
      Status: laptop.status,
      "Purchase Date": laptop.purchaseDate || "N/A",
      "Warranty Expiry": laptop.warrantyExpiry || "N/A",
      Notes: laptop.notes || "",
    }));

    exportToCSV(exportData, `laptops-${new Date().toISOString().split("T")[0]}.csv`);
    toast({
      title: "Success",
      description: "Laptops exported successfully",
    });
  };

  // Show loading state while auth initializes
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laptop Inventory</h1>
            <p className="text-muted-foreground">
              Manage and track all laptops in your organization
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show backend down error with helpful message
  if (isBackendDown) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laptop Inventory</h1>
            <p className="text-muted-foreground">
              Manage and track all laptops in your organization
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Backend Server Unavailable</p>
            <p className="text-sm mb-3">
              Unable to connect to the backend API. Please ensure the backend server is running.
            </p>
            <p className="text-xs text-muted-foreground">
              Backend should be running at: <code className="bg-muted px-2 py-1 rounded">http://localhost:5000</code>
            </p>
            <Button
              onClick={fetchLaptops}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show error state with retry button
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laptop Inventory</h1>
            <p className="text-muted-foreground">
              Manage and track all laptops in your organization
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Failed to Load Laptops</p>
            <p className="text-sm mb-3">{error}</p>
            <Button
              onClick={fetchLaptops}
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laptop Inventory</h1>
            <p className="text-muted-foreground">
              Manage and track all laptops in your organization
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">Loading laptops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laptop Inventory</h1>
          <p className="text-muted-foreground">
            Manage and track all laptops in your organization
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={filteredLaptops.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button className="gap-2" onClick={handleAddClick}>
              <Plus className="w-4 h-4" />
              Add Laptop
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by asset tag, serial number, brand..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchTerm(searchInput.trim());
              }
            }}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="MAINTENANCE">Under Repair</SelectItem>
            <SelectItem value="LOST">Lost/Stolen</SelectItem>
            <SelectItem value="RETIRED">Retired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Asset Tag</TableHead>
              <TableHead className="font-semibold">Device</TableHead>
              <TableHead className="font-semibold">Serial Number</TableHead>
              <TableHead className="font-semibold">Specifications</TableHead>
              <TableHead className="font-semibold">Accessories</TableHead>
              <TableHead className="font-semibold">Department</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {isAdmin && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(filteredLaptops) && filteredLaptops.length > 0 ? (
              filteredLaptops.map((laptop) => {
                if (!laptop || !laptop.id) return null;

                return (
                  <TableRow key={laptop.id}>
                    <TableCell className="font-medium">{laptop.assetTag || "N/A"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{laptop.brand || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          {laptop.model || "N/A"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {laptop.serialNumber || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{laptop.specifications?.cpu || "N/A"}</p>
                        <p className="text-muted-foreground">
                          {laptop.specifications?.ram || "N/A"} •{" "}
                          {laptop.specifications?.storage || "N/A"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(accessoriesByLaptop[laptop.id] || []).length > 0 ? (
                          accessoriesByLaptop[laptop.id].map((item) => (
                            <Badge key={`${laptop.id}-${item.id}`} variant="outline">
                              {item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{laptop.department || "N/A"}</TableCell>
                    <TableCell>
                      {laptop.status && (
                        <LaptopStatusBadge status={laptop.status} />
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => handleEditClick(laptop)}
                            >
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-destructive cursor-pointer"
                              onClick={() => handleDeleteClick(laptop)}
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-12">
                  <p className="text-muted-foreground">
                    {laptops.length === 0
                      ? "No laptops yet. Add your first laptop to get started."
                      : "No laptops found matching your criteria."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredLaptops.length} of {laptops.length} laptops
        </p>
        {isSearching && (
          <p className="text-sm text-muted-foreground">Searching...</p>
        )}
      </div>

      {/* Modals */}
      <LaptopFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        laptop={selectedLaptop}
        onSuccess={handleFormSuccess}
      />

      {laptopToDelete && (
        <LaptopDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          laptop={laptopToDelete}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
