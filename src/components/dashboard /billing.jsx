import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";

const statusColors = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Overdue: "bg-rose-100 text-rose-700",
};

export default function BillingSection({ records, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", amount: "", billing_date: "", status: "Pending", description: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.client_name || !form.amount || !form.billing_date) return;
    setSaving(true);
    const created = await base44.entities.BillingRecord.create({ ...form, amount: parseFloat(form.amount) });
    onAdd(created);
    setForm({ client_name: "", amount: "", billing_date: "", status: "Pending", description: "" });
    setOpen(false);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-900">বিলিং ইনফরমেশন</h3>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700">
          <Plus className="w-3.5 h-3.5" /> যোগ করুন
        </button>
      </div>

      {open && (
        <div className="mb-4 p-3 bg-stone-50 rounded-xl space-y-2">
          <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="ক্লায়েন্টের নাম" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="টাকার পরিমাণ" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
          <input type="date" value={form.billing_date} onChange={e => setForm(f => ({ ...f, billing_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm">
            <option>Pending</option><option>Paid</option><option>Overdue</option>
          </select>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="বিবরণ (ঐচ্ছিক)" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
          <button onClick={handleAdd} disabled={saving} className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50">
            {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-6">কোনো বিলিং রেকর্ড নেই</p>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">{r.client_name}</p>
                <p className="text-[11px] text-stone-400">{r.billing_date} · ৳{r.amount}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${statusColors[r.status]}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
