import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ShoppingCart, AlertTriangle, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getPartsRequests } from "@/api/partsRequests";

interface InventoryItem {
  id: string;
  sku: string;
  part_name: string;
  category: string;
  stock_quantity: number;
  min_threshold: number;
  unit_price: number;
  status: string;
}

interface InventoryDashboardProps {
  items: InventoryItem[];
  loading: boolean;
}

interface MonthlyApproved {
  month: string;
  total: number;
}

export default function InventoryDashboard({ items, loading }: InventoryDashboardProps) {
  const { t } = useTranslation();
  const [pendingOrders, setPendingOrders] = useState(0);
  const [monthlyApproved, setMonthlyApproved] = useState<MonthlyApproved[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    async function loadExtras() {
      const [pendingRes, approved] = await Promise.all([
        getPartsRequests({ status: "Pending" }),
        getPartsRequests({ status: "Approved" }),
      ]);

      setPendingOrders(pendingRes.length ?? 0);

      const byMonth: Record<string, number> = {};
      approved.forEach((r) => {
        const d = new Date(r.created_at);
        const key = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        byMonth[key] = (byMonth[key] || 0) + r.quantity;
      });
      const sorted = Object.entries(byMonth)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);
      setMonthlyApproved(sorted);
      setLoadingExtras(false);
    }
    loadExtras();
  }, []);

  const totalValue = items.reduce((s, i) => s + i.stock_quantity * i.unit_price, 0);
  const lowStockItems = items.filter((i) => i.status === "Low" || i.status === "Critical");
  const outOfStockCount = items.filter((i) => i.stock_quantity === 0).length;

  const categoryValues: Record<string, number> = {};
  items.forEach((i) => {
    categoryValues[i.category] = (categoryValues[i.category] || 0) + i.stock_quantity * i.unit_price;
  });
  const sortedCategories = Object.entries(categoryValues).sort((a, b) => b[1] - a[1]);
  const maxCategoryValue = sortedCategories[0]?.[1] || 1;

  const formatMoney = (v: number) => formatCurrency(v, { compact: true });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("inventory.dashboard.totalValue")}</p>
          <p className="text-3xl font-bold mt-1 text-card-foreground">{formatMoney(totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("inventory.dashboard.inStock")}</p>
        </Card>

        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("inventory.dashboard.pendingOrders")}</p>
          <p className="text-3xl font-bold mt-1 text-card-foreground">
            {loadingExtras ? "—" : pendingOrders}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{t("inventory.dashboard.awaitingApproval")}</p>
        </Card>

        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("inventory.dashboard.lowStockItems")}</p>
          <p className="text-3xl font-bold mt-1 text-card-foreground">{lowStockItems.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("inventory.dashboard.needAttention")}</p>
        </Card>

        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("inventory.dashboard.outOfStock")}</p>
          <p className="text-3xl font-bold mt-1 text-card-foreground">{outOfStockCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("inventory.dashboard.skusAtZero")}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-card-foreground mb-4">
            {t("inventory.dashboard.valueDistribution")}
          </h3>
          <div className="space-y-3">
            {sortedCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("inventory.dashboard.noData")}</p>
            )}
            {sortedCategories.map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-24 text-right shrink-0">{t(`inventory.categories.${cat}`, cat)}</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded transition-all"
                    style={{ width: `${(val / maxCategoryValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-16 text-right">
                  {formatMoney(val)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-destructive/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-destructive">
              {t("inventory.dashboard.criticalLowStock")}
            </h3>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("inventory.dashboard.wellStocked")}</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{item.part_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("inventory.dashboard.leftMin", { stock: item.stock_quantity, min: item.min_threshold })}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" className="text-xs h-7">
                    {t("inventory.actions.reorder")}
                  </Button>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  {t("inventory.dashboard.moreItems", { count: lowStockItems.length - 5 })}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-card-foreground mb-4">
          {t("inventory.dashboard.monthlyApproved")}
        </h3>
        {loadingExtras ? (
          <Skeleton className="h-20" />
        ) : monthlyApproved.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inventory.dashboard.noApproved")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {monthlyApproved.map((m) => (
              <div key={m.month} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase">{m.month}</p>
                <p className="text-lg font-bold text-card-foreground mt-1">{m.total}</p>
                <p className="text-[10px] text-muted-foreground">{t("inventory.dashboard.partsApproved")}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
