import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!startDate || !endDate) {
    return json({ error: "start_date and end_date are required" }, { status: 400 });
  }

  try {
    const { data: entries, error: entriesError } = await auth.supabase
      .from("daily_entries" as any)
      .select("quantity, total_amount, product_id, customer_id, date")
      .gte("date", startDate)
      .lte("date", endDate) as { data: any[] | null; error: any };

    if (entriesError) throw entriesError;

    const { data: products, error: productsError } = await auth.supabase
      .from("daily_products" as any)
      .select("id, name") as { data: any[] | null; error: any };

    if (productsError) throw productsError;

    const productMap = new Map(products?.map((p) => [p.id, p.name]));

    const { data: tx, error: txError } = await auth.supabase
      .from("daily_transactions" as any)
      .select("amount, type, customer_id")
      .gte("date", startDate)
      .lte("date", endDate) as { data: any[] | null; error: any };

    if (txError) throw txError;

    // Retail sales (paid immediately at point of sale)
    const { data: retailSales, error: retailError } = await auth.supabase
      .from("daily_retail_sales" as any)
      .select("date, total_amount, quantity, product_id")
      .gte("date", startDate)
      .lte("date", endDate) as { data: any[] | null; error: any };

    if (retailError && retailError.code !== "42P01") throw retailError;

    let totalSales = 0;
    let totalMilk = 0;
    let totalPaid = 0;
    const dailySales: Record<string, number> = {};
    const productSales: Record<string, number> = {};
    const customerSales: Record<string, number> = {};

    const { data: custRows } = await auth.supabase
      .from("daily_customers" as any)
      .select("id, name") as { data: any[] | null };
    const nameById = new Map((custRows || []).map((c) => [c.id, c.name]));

    for (const e of entries || []) {
      const amount = Number(e.total_amount || 0);
      const qty = Number(e.quantity || 0);
      const dateKey = e.date;
      const prodName = productMap.get(e.product_id) || "Unknown";

      totalSales += amount;
      dailySales[dateKey] = (dailySales[dateKey] || 0) + amount;

      const cname = nameById.get(e.customer_id as string);
      if (cname) {
        customerSales[cname] = (customerSales[cname] || 0) + amount;
      }

      productSales[prodName] = (productSales[prodName] || 0) + amount;
      if (prodName.toLowerCase() === "milk") {
        totalMilk += qty;
      }
    }

    for (const t of tx || []) {
      if (t.type === "due") {
        totalSales += Number(t.amount || 0);
      } else if (t.type === "payment" || t.type === "advance" || t.type === "adjustment") {
        totalPaid += Number(t.amount || 0);
      }
    }

    // Integrate retail sales into analytics
    for (const rs of retailSales || []) {
      const amount = Number(rs.total_amount || 0);
      const qty = Number(rs.quantity || 0);
      const dateKey = rs.date;
      const prodName = productMap.get(rs.product_id) || "retail";

      totalSales += amount;
      totalPaid += amount; // retail is paid immediately
      dailySales[dateKey] = (dailySales[dateKey] || 0) + amount;
      productSales[prodName] = (productSales[prodName] || 0) + amount;

      if (prodName.toLowerCase() === "milk") {
        totalMilk += qty;
      }
    }

    const outstandingBalance = totalSales - totalPaid;

    const topCustomers = Object.entries(customerSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total_purchase]) => ({ name, total_purchase }));

    return json({
      totalSales,
      totalMilk,
      totalPaid,
      outstandingBalance,
      dailySales,
      productSales,
      topCustomers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
}
