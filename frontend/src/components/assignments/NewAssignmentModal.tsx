import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ACCESSORIES_ALLOWED_TYPES,
  AssignmentTargetType,
} from "@/constants/assignmentPolicies";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface SearchAssetOption {
  id: number;
  label: string;
}

interface SearchStaffOption {
  id: string;
  label: string;
}

interface AssetDetails {
  id: number;
  assetType: string;
  location?: string | null;
  department?: string | null;
}

interface BundleOption {
  id: number;
  assetTag?: string;
  serialNumber?: string;
  brand: string;
  model: string;
  assetType: string;
}

interface CreateAssignmentPayload {
  assetId: number;
  targetType: AssignmentTargetType;
  staffId?: string;
  location?: string;
  department?: string;
  issueDate: string;
  issueCondition?: Record<string, string>;
  accessoriesIssued?: string[];
  bundleAssetIds?: number[];
  notes?: string;
}

interface NewAssignmentModalProps {
  open: boolean;
  busy: boolean;
  locations: string[];
  departments: string[];
  accessories: Array<{ id: string; name: string; type?: string; status?: string }>;
  accessoriesLoading: boolean;
  accessoriesError: string | null;
  onOpenChange: (open: boolean) => void;
  onRefreshAccessories: () => void;
  onSubmit: (payload: CreateAssignmentPayload) => void;
}

const ACCESSORY_OPTIONS = [
  "Charger / Power Adapter",
  "Laptop Bag",
  "Keyboard (external)",
  "Mouse (wired)",
  "Mouse (wireless)",
  "HDMI Cable",
  "USB-C Adapter",
];

const MIN_SEARCH_LENGTH = 2;

const normalizeSpacing = (value: string) => value.trim().replace(/\s+/g, " ");

export function NewAssignmentModal({
  open,
  busy,
  locations,
  departments,
  accessories,
  accessoriesLoading,
  accessoriesError,
  onOpenChange,
  onRefreshAccessories,
  onSubmit,
}: NewAssignmentModalProps) {
  const [assetId, setAssetId] = useState("");
  const [targetType, setTargetType] = useState<AssignmentTargetType>("STAFF");
  const [staffId, setStaffId] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [issueCondition, setIssueCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);

  const [assetOpen, setAssetOpen] = useState(false);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetResults, setAssetResults] = useState<SearchAssetOption[]>([]);
  const [selectedAssetLabel, setSelectedAssetLabel] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetDetails | null>(null);

  const [staffOpen, setStaffOpen] = useState(false);
  const [staffQuery, setStaffQuery] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffResults, setStaffResults] = useState<SearchStaffOption[]>([]);
  const [selectedStaffLabel, setSelectedStaffLabel] = useState("");

  const [monitorAssetId, setMonitorAssetId] = useState("");
  const [keyboardAssetId, setKeyboardAssetId] = useState("");
  const [mouseAssetId, setMouseAssetId] = useState("");
  const [bundleOptions, setBundleOptions] = useState<BundleOption[]>([]);
  const [bundleLoading, setBundleLoading] = useState(false);

  const supportsAccessories = selectedAsset
    ? ACCESSORIES_ALLOWED_TYPES.includes(
        selectedAsset.assetType as (typeof ACCESSORIES_ALLOWED_TYPES)[number]
      )
    : false;
  const supportsBundleItems =
    targetType === "STAFF" &&
    ["DESKTOP", "SYSTEM_UNIT"].includes(String(selectedAsset?.assetType || "").toUpperCase());

  const monitorOptions = useMemo(
    () => bundleOptions.filter((item) => item.assetType === "MONITOR"),
    [bundleOptions]
  );
  const keyboardOptions = useMemo(
    () => bundleOptions.filter((item) => item.assetType === "KEYBOARD"),
    [bundleOptions]
  );
  const mouseOptions = useMemo(
    () => bundleOptions.filter((item) => item.assetType === "MOUSE"),
    [bundleOptions]
  );

  const targetLocations = useMemo(() => {
    const set = new Set<string>();
    for (const item of locations) {
      if (item?.trim()) set.add(item.trim());
    }
    if (selectedAsset?.location?.trim()) set.add(selectedAsset.location.trim());
    return Array.from(set);
  }, [locations, selectedAsset]);

  const targetDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const item of departments) {
      if (item?.trim()) set.add(item.trim());
    }
    if (selectedAsset?.department?.trim()) set.add(selectedAsset.department.trim());
    return Array.from(set);
  }, [departments, selectedAsset]);

  useEffect(() => {
    if (supportsBundleItems) return;
    setMonitorAssetId("");
    setKeyboardAssetId("");
    setMouseAssetId("");
  }, [supportsBundleItems]);

  useEffect(() => {
    if (!supportsBundleItems) {
      setBundleOptions([]);
      setBundleLoading(false);
      return;
    }
    const loadBundleOptions = async () => {
      setBundleLoading(true);
      try {
        const [monitorResponse, keyboardResponse, mouseResponse] = await Promise.all([
          apiClient.get<BundleOption[]>("/assets/assignable?type=MONITOR"),
          apiClient.get<BundleOption[]>("/assets/assignable?type=KEYBOARD"),
          apiClient.get<BundleOption[]>("/assets/assignable?type=MOUSE"),
        ]);
        const monitor = Array.isArray((monitorResponse as any)?.data)
          ? ((monitorResponse as any).data as BundleOption[])
          : [];
        const keyboard = Array.isArray((keyboardResponse as any)?.data)
          ? ((keyboardResponse as any).data as BundleOption[])
          : [];
        const mouse = Array.isArray((mouseResponse as any)?.data)
          ? ((mouseResponse as any).data as BundleOption[])
          : [];
        setBundleOptions([...monitor, ...keyboard, ...mouse]);
      } catch {
        setBundleOptions([]);
      } finally {
        setBundleLoading(false);
      }
    };
    void loadBundleOptions();
  }, [supportsBundleItems]);

  useEffect(() => {
    if (!assetOpen) return;
    const term = assetQuery.trim();
    if (term.length > 0 && term.length < MIN_SEARCH_LENGTH) {
      setAssetResults([]);
      setAssetLoading(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setAssetLoading(true);
      try {
        const suffix = term ? `?q=${encodeURIComponent(term)}` : "";
        const response = await apiClient.get<SearchAssetOption[]>(`/assets/search${suffix}`);
        const data = Array.isArray((response as any)?.data)
          ? ((response as any).data as SearchAssetOption[])
          : [];
        setAssetResults(data);
      } catch {
        setAssetResults([]);
      } finally {
        setAssetLoading(false);
      }
    }, term ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [assetOpen, assetQuery]);

  useEffect(() => {
    if (!staffOpen) return;
    const term = staffQuery.trim();
    if (term.length > 0 && term.length < MIN_SEARCH_LENGTH) {
      setStaffResults([]);
      setStaffLoading(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setStaffLoading(true);
      try {
        const suffix = term ? `?q=${encodeURIComponent(term)}` : "";
        const response = await apiClient.get<SearchStaffOption[]>(`/staff/search${suffix}`);
        const data = Array.isArray((response as any)?.data)
          ? ((response as any).data as SearchStaffOption[])
          : [];
        setStaffResults(data);
      } catch {
        setStaffResults([]);
      } finally {
        setStaffLoading(false);
      }
    }, term ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [staffOpen, staffQuery]);

  const toggleAccessory = (name: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessories((current) => (current.includes(name) ? current : [...current, name]));
      return;
    }
    setSelectedAccessories((current) => current.filter((item) => item !== name));
  };

  const reset = () => {
    setAssetId("");
    setTargetType("STAFF");
    setStaffId("");
    setLocation("");
    setDepartment("");
    setAssignedDate("");
    setIssueCondition("");
    setNotes("");
    setSelectedAccessories([]);
    setAssetQuery("");
    setAssetResults([]);
    setSelectedAssetLabel("");
    setSelectedAsset(null);
    setStaffQuery("");
    setStaffResults([]);
    setSelectedStaffLabel("");
    setMonitorAssetId("");
    setKeyboardAssetId("");
    setMouseAssetId("");
  };

  const handleAssetSelect = async (option: SearchAssetOption) => {
    setAssetId(String(option.id));
    setSelectedAssetLabel(option.label);
    setAssetOpen(false);
    setAssetQuery("");

    try {
      const detailResponse = await apiClient.get<any>(`/assets/${option.id}`);
      const detail = (detailResponse as any)?.data ?? null;
      if (detail) {
        const nextAsset: AssetDetails = {
          id: Number(detail.id),
          assetType: String(detail.assetType || ""),
          location: detail.location || null,
          department: detail.department || null,
        };
        setSelectedAsset(nextAsset);
        if (
          !ACCESSORIES_ALLOWED_TYPES.includes(
            nextAsset.assetType as (typeof ACCESSORIES_ALLOWED_TYPES)[number]
          )
        ) {
          setSelectedAccessories([]);
        }
      }
    } catch {
      // Keep selected ID and label even if details fetch fails.
    }
  };

  const canSubmitTarget =
    targetType === "STAFF"
      ? Boolean(staffId)
      : targetType === "LOCATION"
        ? normalizeSpacing(location).length >= 2
        : normalizeSpacing(department).length >= 2;

  const targetFieldError =
    targetType === "LOCATION" && location
      ? normalizeSpacing(location).length < 2
        ? "Location must be at least 2 characters."
        : null
      : targetType === "DEPARTMENT" && department
        ? normalizeSpacing(department).length < 2
          ? "Department must be at least 2 characters."
          : null
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg overflow-visible">
        <DialogHeader>
          <DialogTitle>New Assignment</DialogTitle>
          <DialogDescription>Status starts as Pending Acceptance.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3 max-h-[70vh] overflow-y-auto pr-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!supportsAccessories) {
              setSelectedAccessories([]);
            }
            const normalizedLocation = normalizeSpacing(location);
            const normalizedDepartment = normalizeSpacing(department);
            if (targetType === "LOCATION" && normalizedLocation.length < 2) return;
            if (targetType === "DEPARTMENT" && normalizedDepartment.length < 2) return;
            const bundleAssetIds = Array.from(
              new Set(
                [monitorAssetId, keyboardAssetId, mouseAssetId]
                  .filter(Boolean)
                  .map((value) => Number(value))
                  .filter((value) => Number.isInteger(value) && value > 0)
              )
            );
            onSubmit({
              assetId: Number(assetId),
              targetType,
              staffId: targetType === "STAFF" ? staffId : undefined,
              location: targetType === "LOCATION" ? normalizedLocation : undefined,
              department: targetType === "DEPARTMENT" ? normalizedDepartment : undefined,
              issueDate: new Date(assignedDate).toISOString(),
              issueCondition: issueCondition ? { summary: issueCondition } : undefined,
              accessoriesIssued: supportsAccessories ? selectedAccessories : undefined,
              bundleAssetIds: supportsBundleItems ? bundleAssetIds : undefined,
              notes: notes || undefined,
            });
          }}
        >
          <div>
            <Label>Asset</Label>
            <Popover open={assetOpen} onOpenChange={setAssetOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={assetOpen}
                  className="h-10 w-full justify-between font-normal"
                >
                  {assetId ? selectedAssetLabel || "Selected asset" : "Search asset..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search assets..."
                    value={assetQuery}
                    onValueChange={setAssetQuery}
                  />
                  <CommandList>
                    {assetLoading && <CommandEmpty>Loading...</CommandEmpty>}
                    {!assetLoading && assetQuery.trim().length > 0 && assetQuery.trim().length < MIN_SEARCH_LENGTH && (
                      <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
                    )}
                    {!assetLoading &&
                      (assetQuery.trim().length === 0 || assetQuery.trim().length >= MIN_SEARCH_LENGTH) &&
                      assetResults.length === 0 && <CommandEmpty>No results found</CommandEmpty>}
                    <CommandGroup>
                      {assetResults.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={String(item.id)}
                          onSelect={() => {
                            void handleAssetSelect(item);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              String(item.id) === assetId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {item.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Assignment Target</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(value) => setTargetType(value as AssignmentTargetType)}
              className="flex flex-wrap gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="STAFF" id="target-staff" />
                <span>Staff</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="DEPARTMENT" id="target-department" />
                <span>Department</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="LOCATION" id="target-location" />
                <span>Location</span>
              </label>
            </RadioGroup>
          </div>

          {targetType === "STAFF" && (
            <div>
              <Label>Receiver</Label>
              <Popover open={staffOpen} onOpenChange={setStaffOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={staffOpen}
                    className="h-10 w-full justify-between font-normal"
                  >
                    {staffId ? selectedStaffLabel || "Selected receiver" : "Search receiver..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                  <CommandInput
                      placeholder="Search receiver..."
                      value={staffQuery}
                      onValueChange={setStaffQuery}
                    />
                    <CommandList>
                      {staffLoading && <CommandEmpty>Loading...</CommandEmpty>}
                      {!staffLoading && staffQuery.trim().length > 0 && staffQuery.trim().length < MIN_SEARCH_LENGTH && (
                        <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
                      )}
                      {!staffLoading &&
                        (staffQuery.trim().length === 0 || staffQuery.trim().length >= MIN_SEARCH_LENGTH) &&
                        staffResults.length === 0 && <CommandEmpty>No results found</CommandEmpty>}
                      <CommandGroup>
                        {staffResults.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => {
                              setStaffId(item.id);
                              setSelectedStaffLabel(item.label);
                              setStaffOpen(false);
                              setStaffQuery("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                item.id === staffId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {targetType === "DEPARTMENT" && (
            <div>
              <Label>Department</Label>
              <Input
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="Type department (e.g., ICT, Finance, HR)..."
                list="assignment-departments-suggestions"
              />
              <datalist id="assignment-departments-suggestions">
                {targetDepartments.slice(0, 20).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {targetFieldError && (
                <p className="mt-1 text-xs text-destructive">{targetFieldError}</p>
              )}
            </div>
          )}

          {targetType === "LOCATION" && (
            <div>
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Type location (e.g., HQ, Branch A, Store, Floor 2)..."
                list="assignment-locations-suggestions"
              />
              <datalist id="assignment-locations-suggestions">
                {targetLocations.slice(0, 20).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {targetFieldError && (
                <p className="mt-1 text-xs text-destructive">{targetFieldError}</p>
              )}
            </div>
          )}

          <div>
            <Label>Issue Date</Label>
            <Input type="date" value={assignedDate} onChange={(event) => setAssignedDate(event.target.value)} />
          </div>

          <div>
            <Label>Issue Condition</Label>
            <Input value={issueCondition} onChange={(event) => setIssueCondition(event.target.value)} />
          </div>

          {supportsAccessories && (
            <div className="space-y-2">
              <Label>Accessories Issued</Label>
              <div className="space-y-2 rounded-md border p-3">
                {ACCESSORY_OPTIONS.map((name) => {
                  const checked = selectedAccessories.includes(name);
                  return (
                    <label key={name} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleAccessory(name, value === true)}
                      />
                      <span>{name}</span>
                    </label>
                  );
                })}
              </div>
              {selectedAccessories.length > 0 && (
                <p className="text-sm text-muted-foreground">Selected: {selectedAccessories.length}</p>
              )}
            </div>
          )}

          {supportsBundleItems && (
            <div className="space-y-3 rounded-md border p-3">
              <div>
                <Label>Bundle Items (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Select additional devices to issue with this desktop.
                </p>
              </div>

              {bundleLoading && <p className="text-xs text-muted-foreground">Loading bundle assets...</p>}

              <div>
                <Label>Monitor</Label>
                <Select
                  value={monitorAssetId || "none"}
                  onValueChange={(value) => setMonitorAssetId(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No monitor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No monitor</SelectItem>
                    {monitorOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.brand} {item.model} ({item.assetTag || item.serialNumber || item.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Keyboard</Label>
                <Select
                  value={keyboardAssetId || "none"}
                  onValueChange={(value) => setKeyboardAssetId(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No keyboard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No keyboard</SelectItem>
                    {keyboardOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.brand} {item.model} ({item.assetTag || item.serialNumber || item.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mouse</Label>
                <Select
                  value={mouseAssetId || "none"}
                  onValueChange={(value) => setMouseAssetId(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No mouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mouse</SelectItem>
                    {mouseOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.brand} {item.model} ({item.assetTag || item.serialNumber || item.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !assetId || !canSubmitTarget || !assignedDate}>
              {busy ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
