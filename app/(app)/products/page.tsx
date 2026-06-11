"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useI18n } from "@/components/i18n/LanguageProvider";

const FETCH_MS = 18_000;

interface Product {
  id: number;
  name: string;
  default_rate: number;
  unit: "liter" | "kg";
}

const ProductsPage = () => {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setPageError(null);
    try {
      const { data, error } = await withTimeout(
        supabaseClient.from("daily_products" as any).select("*").order("name"),
        FETCH_MS
      ) as { data: any[] | null; error: any };
      if (error) {
        setPageError(error.message);
        setProducts([]);
        return;
      }
      setProducts((data as any[]) || []);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Failed to load products");
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openModalForNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This product might be used in past entries.")) {
      const { error } = await supabaseClient.from("daily_products" as any).delete().eq("id", id);
      if (error) {
        if (error.message.includes("violates foreign key constraint")) {
          setPageError(
            lang === "hi"
              ? "आप इस उत्पाद को नहीं हटा सकते क्योंकि यह पुरानी प्रविष्टियों (बिक्री) से जुड़ा हुआ है। कृपया इसके बजाय इसे संपादित करें।"
              : "Cannot delete this product because it is linked to past sales. Please edit the product instead if you want to change it."
          );
        } else {
          setPageError(error.message);
        }
        setPageMessage(null);
      } else {
        setPageMessage("Product deleted.");
        setPageError(null);
        fetchProducts();
      }
    }
  };

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingProduct
            ? lang === "hi"
              ? "उत्पाद संपादित करें"
              : "Edit Product"
            : lang === "hi"
              ? "नया उत्पाद जोड़ें"
              : "Add New Product"
        }
      >
        <ProductForm product={editingProduct} onSuccess={handleSuccess} />
      </Modal>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">{t("products.title")}</h1>
        <Button type="button" onClick={openModalForNew}>
          {t("products.add")}
        </Button>
      </div>
      {pageError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {pageError}
        </p>
      )}
      {pageMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
          {pageMessage}
        </p>
      )}

      <Card title={lang === "hi" ? "सभी उत्पाद" : "All Products"}>
        {products.length === 0 && !pageError ? (
          <p className="text-muted-foreground py-6 text-center">
            No products yet. Add one with a lowercase name (e.g. milk, curd) and a rate per unit.
          </p>
        ) : products.length === 0 ? null : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/80">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border hover:bg-secondary/40 transition-colors"
                >
                  <td className="px-4 py-2 font-medium capitalize">{p.name}</td>
                  <td className="px-4 py-2">₹{Number(p.default_rate).toFixed(2)}</td>
                  <td className="px-4 py-2 capitalize">{p.unit}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openModalForEdit(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

const ProductForm = ({
  product,
  onSuccess,
}: {
  product: Product | null;
  onSuccess: () => void;
}) => {
  const { t, lang } = useI18n();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  type ProductUnit = "liter" | "kg";
  const [unit, setUnit] = useState<ProductUnit>("liter");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(product?.name || "");
    setRate(product?.default_rate?.toString() || "");
    setUnit(product?.unit === "kg" ? "kg" : "liter");
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const normalized = name.trim().toLowerCase();
      if (!normalized) {
        setError("Enter a product name");
        return;
      }
      const rateNum = Number(rate);
      if (!Number.isFinite(rateNum) || rateNum < 0) {
        setError(
          rateNum < 0
            ? lang === "hi"
              ? "रेट ऋणात्मक नहीं हो सकती।"
              : "Rate cannot be negative."
            : "Enter a valid rate (zero or positive)."
        );
        return;
      }
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        setError("No authenticated user session found.");
        return;
      }
      const payload = { name: normalized, default_rate: rateNum, unit, user_id: user.id };
      const { error } = product
        ? await supabaseClient.from("daily_products" as any).update({ name: normalized, default_rate: rateNum, unit }).eq("id", product.id)
        : await supabaseClient.from("daily_products" as any).insert([payload]);

      if (error) {
        if (error.message.includes("products_name_check")) {
          setError(
            lang === "hi"
              ? "Database me purana constraint active hai. SQL script `scripts/2026040504_relax_products_name.sql` Supabase SQL editor me run karein."
              : "Old database constraint is still active. Run `scripts/2026040504_relax_products_name.sql` in Supabase SQL editor."
          );
        } else {
          setError(error.message);
        }
      } else {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="prod-name"
        label={t("form.productName")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. milk, curd"
        required
      />
      <p className="text-xs text-muted-foreground -mt-2">
        {t("products.savedLower")}
      </p>
      <Input
        id="prod-rate"
        label={t("form.ratePerUnit")}
        type="number"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        required
      />
      <Select
        label={t("form.unit")}
        value={unit}
        onChange={(v) => setUnit(v === "kg" ? "kg" : "liter")}
        options={[
          { value: "liter", label: "Liter" },
          { value: "kg", label: "Kg" },
        ]}
      />
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : t("products.save")}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </form>
  );
};

export default ProductsPage;
