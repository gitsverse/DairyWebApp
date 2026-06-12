import { NextRequest } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/auth-api";
import { json } from "@/lib/http";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const today = searchParams.get("today") || new Date().toISOString().slice(0, 10);

  try {
    // 1. Total Customers
    const { count: customerCount, error: customerError } = (await auth.supabase
      .from("daily_customers" as any)
      .select("*", { count: "exact", head: true })) as { count: number | null; error: any };

    if (customerError) throw customerError;

    // 2. Products Map to identify milk product id
    const { data: products, error: productsError } = (await auth.supabase
      .from("daily_products" as any)
      .select("id, name")) as { data: any[] | null; error: any };

    if (productsError) throw productsError;

    const productMap = new Map(products?.map((p) => [p.id, p.name]));
    const milkProductId = products?.find((p) => p.name.toLowerCase() === "milk")?.id;

    // 3. Today's Milk (liters)
    let todaysMilk = 0;
    if (milkProductId != null) {
      const { data: todaysEntries, error: todaysEntriesError } = (await auth.supabase
        .from("daily_entries" as any)
        .select("quantity")
        .eq("date", today)
        .eq("product_id", milkProductId)) as { data: any[] | null; error: any };

      if (todaysEntriesError) throw todaysEntriesError;

      todaysMilk = (todaysEntries || []).reduce((sum, e) => sum + Number(e.quantity || 0), 0);
    }

    // 4. Cumulative Sales & Collections calculations
    // We fetch entry totals and transaction totals to compute Cumulative Collections and Outstanding Balance
    const { data: allSales, error: salesError } = (await auth.supabase
      .from("daily_entries" as any)
      .select("total_amount")) as { data: any[] | null; error: any };

    if (salesError) throw salesError;

    const totalEntrySales = (allSales || []).reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

    const { data: allTx, error: txError } = (await auth.supabase
      .from("daily_transactions" as any)
      .select("amount, type")) as { data: any[] | null; error: any };

    if (txError) throw txError;

    let totalDues = 0;
    let totalPaid = 0;
    for (const t of allTx || []) {
      if (t.type === "due") {
        totalDues += Number(t.amount || 0);
      } else if (["payment", "advance", "adjustment"].includes(t.type)) {
        totalPaid += Number(t.amount || 0);
      }
    }

    // Retail sales are paid immediately, so they add to both sales and paid collections
    const { data: retailSales, error: retailError } = (await auth.supabase
      .from("daily_retail_sales" as any)
      .select("total_amount, quantity, product_id")) as { data: any[] | null; error: any };

    if (retailError && retailError.code !== "42P01") throw retailError;

    let totalRetailSales = 0;
    let todaysRetailMilk = 0;

    for (const rs of retailSales || []) {
      const amount = Number(rs.total_amount || 0);
      totalRetailSales += amount;

      const prodName = productMap.get(rs.product_id);
      if (prodName?.toLowerCase() === "milk") {
        todaysRetailMilk += Number(rs.quantity || 0);
      }
    }

    // Include retail milk in today's milk if date matches today (default: retailSales has a date column)
    const { data: todaysRetailSales } = (await auth.supabase
      .from("daily_retail_sales" as any)
      .select("quantity, product_id")
      .eq("date", today)) as { data: any[] | null; error: any };

    let todaysRetailMilkOnly = 0;
    for (const trs of todaysRetailSales || []) {
      const prodName = productMap.get(trs.product_id);
      if (prodName?.toLowerCase() === "milk") {
        todaysRetailMilkOnly += Number(trs.quantity || 0);
      }
    }

    const finalTodaysMilk = todaysMilk + todaysRetailMilkOnly;
    const totalCollections = totalPaid + totalRetailSales;
    const outstandingBalance = (totalEntrySales + totalDues) - totalPaid;

    // 5. Recent Milk Entries (last 10 entries)
    // We want the most recent entries, mapped with customer name, product name, quantity, rate, amount, shift, date
    const { data: recentEntriesRaw, error: recentError } = (await auth.supabase
      .from("daily_entries" as any)
      .select("id, date, customer_id, product_id, quantity, price_per_unit, total_amount, shift")
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .limit(10)) as { data: any[] | null; error: any };

    if (recentError) throw recentError;

    // Fetch customer names to map them
    const { data: customersList } = (await auth.supabase
      .from("daily_customers" as any)
      .select("id, name")) as { data: any[] | null; error: any };

    const customerMap = new Map((customersList || []).map((c) => [c.id, c.name]));

    const recentEntries = (recentEntriesRaw || []).map((e) => ({
      id: e.id,
      date: e.date,
      customerName: customerMap.get(e.customer_id) || "Unknown Customer",
      productName: productMap.get(e.product_id) || "milk",
      quantity: Number(e.quantity || 0),
      rate: Number(e.price_per_unit || 0),
      amount: Number(e.total_amount || 0),
      shift: e.shift,
    }));

    return json({
      totalCustomers: customerCount || 0,
      todaysMilk: finalTodaysMilk,
      totalCollections,
      outstandingBalance,
      recentEntries,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
}
