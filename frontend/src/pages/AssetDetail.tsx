import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { assetsApi, Asset } from "@/lib/assetsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const parsedId = Number(id);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          setError("Invalid asset id");
          return;
        }
        const data = await assetsApi.getById(parsedId);
        if (!data) {
          setError("Asset not found");
          return;
        }
        setAsset(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load asset");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/assets")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Asset Detail</h1>
      </div>

      {loading && <Card><CardContent className="p-6 text-muted-foreground">Loading asset...</CardContent></Card>}
      {!loading && error && <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card>}

      {!loading && asset && (
        <Card>
          <CardHeader>
            <CardTitle>{asset.assetTag}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Type" value={asset.assetType} />
            <Field label="Brand" value={asset.brand} />
            <Field label="Model" value={asset.model} />
            <Field label="IMEI No" value={asset.imeiNo || "-"} />
            <Field label="Serial Number" value={asset.serialNumber || "-"} />
            <Field label="Specifications" value={asset.specifications || "-"} />
            <Field label="Department" value={asset.department || "-"} />
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="mt-1" variant={asset.status === "IN_STOCK" ? "secondary" : asset.status === "RETIRED" ? "outline" : "default"}>
                {asset.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <Field label="Location" value={asset.location} />
            <Field label="Purchase Date" value={asset.purchaseDate || "-"} />
            <Field label="Warranty End Date" value={asset.warrantyEndDate || "-"} />
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{asset.notes || "-"}</p>
            </div>
            <Field label="Created At" value={new Date(asset.createdAt).toLocaleString()} />
            <Field label="Updated At" value={new Date(asset.updatedAt).toLocaleString()} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
