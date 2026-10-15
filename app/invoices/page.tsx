"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────
type InvoiceItem = {
  id?: string;
  item_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  recipient_name: string;
  title: string;
  total_amount: number;
  tax_amount: number;
  status: "draft" | "issued" | "paid";
  created_at: string;
  invoice_items?: InvoiceItem[];
};

// ─────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────
const ISSUER = {
  name: "F.A.S.T.",
  person: "谷口 孝行",
  address: "福井県鯖江市有定町",
  bank: "福井銀行 鯖江支店",
};

const TAX_RATE = 0.1;

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:  { label: "下書き",  color: "text-slate-400",  bg: "bg-slate-700/40 border-slate-600" },
  issued: { label: "発行済",  color: "text-blue-400",   bg: "bg-blue-900/30 border-blue-500/40" },
  paid:   { label: "入金済",  color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-500/40" },
};

const EMPTY_ITEM: InvoiceItem = {
  item_description: "",
  quantity: 1,
  unit: "式",
  unit_price: 0,
  amount: 0,
};

// ─────────────────────────────────────────────────────────
// 自動採番ロジック (クライアントサイドフォールバック)
// ─────────────────────────────────────────────────────────
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = `FAST-${year}${String(month).padStart(2, "0")}`;

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}-%`);

  let maxSeq = 0;
  (data || []).forEach((row) => {
    const parts = row.invoice_number.split("-");
    const seq = parseInt(parts[parts.length - 1] || "0", 10);
    if (seq > maxSeq) maxSeq = seq;
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────────────────
// 印刷用プレビューコンポーネント
// ─────────────────────────────────────────────────────────
function InvoicePreview({
  invoice,
  items,
  onClose,
}: {
  invoice: Partial<Invoice>;
  items: InvoiceItem[];
  onClose: () => void;
}) {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* 画面上ボタン（印刷対象外） */}
      <div className="no-print absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition-colors"
        >
          🖨️ 印刷 / PDF保存
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-xl transition-colors"
        >
          ✕ 閉じる
        </button>
      </div>

      {/* A4プレビュー本体 */}
      <div
        id="invoice-print-area"
        className="invoice-sheet bg-white text-black"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "15mm 18mm",
          fontFamily: "'Noto Serif JP', 'Yu Mincho', 'MS Mincho', serif",
          fontSize: "10pt",
          lineHeight: "1.7",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          overflow: "auto",
          maxHeight: "85vh",
        }}
      >
        {/* タイトル */}
        <div style={{ textAlign: "center", marginBottom: "8mm" }}>
          <h1 style={{ fontSize: "22pt", fontWeight: "bold", letterSpacing: "0.3em", margin: 0 }}>
            請　求　書
          </h1>
        </div>

        {/* 発行日・番号 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6mm", fontSize: "9pt" }}>
          <div style={{ textAlign: "right" }}>
            <div>発行日：{invoice.issue_date?.replace(/-/g, "年").replace(/年(\d+)年/, "年$1月") + "日" || "　　　年　　月　　日"}</div>
            <div>請求書番号：{invoice.invoice_number || "　"}</div>
          </div>
        </div>

        {/* 請求先・発行者 2カラム */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm", gap: "8mm" }}>
          {/* 左：請求先 */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "2px solid #000", paddingBottom: "2mm", marginBottom: "3mm" }}>
              {invoice.recipient_name || "　"}
            </div>
            <div style={{ fontSize: "9pt" }}>
              下記の通り、ご請求申し上げます。
            </div>
            <div style={{ marginTop: "6mm", padding: "4mm 5mm", border: "2px solid #000", display: "inline-block", minWidth: "60%" }}>
              <div style={{ fontSize: "9pt", marginBottom: "1mm" }}>ご請求金額（税込）</div>
              <div style={{ fontSize: "18pt", fontWeight: "bold" }}>
                ¥ {total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 右：発行者情報 */}
          <div style={{ minWidth: "70mm", fontSize: "9pt", textAlign: "right" }}>
            <div style={{ fontWeight: "bold", fontSize: "12pt" }}>{ISSUER.name}</div>
            <div>担当：{ISSUER.person}</div>
            <div>{ISSUER.address}</div>
            <div style={{ marginTop: "3mm", padding: "2mm 3mm", border: "1px solid #999", textAlign: "left", fontSize: "8pt" }}>
              <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>【振込先】</div>
              <div>{ISSUER.bank}</div>
              <div style={{ color: "#666", marginTop: "1mm", fontSize: "7.5pt" }}>※口座詳細は別途ご確認ください</div>
            </div>
          </div>
        </div>

        {/* 件名 */}
        <div style={{ marginBottom: "6mm", padding: "2mm 3mm", backgroundColor: "#f5f5f5", borderLeft: "3px solid #333" }}>
          <span style={{ fontSize: "9pt", fontWeight: "bold" }}>件名：</span>
          <span style={{ fontSize: "10pt" }}>{invoice.title || "　"}</span>
        </div>

        {/* お支払期限 */}
        <div style={{ marginBottom: "6mm", fontSize: "9pt", textAlign: "right" }}>
          お支払期限：{invoice.due_date?.replace(/-/g, "年").replace(/年(\d+)年/, "年$1月") + "日" || "　"}
        </div>

        {/* 明細テーブル */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "6mm",
            fontSize: "9pt",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>
              <th style={{ padding: "3mm 2mm", textAlign: "left", width: "40%" }}>品名・項目</th>
              <th style={{ padding: "3mm 2mm", textAlign: "center", width: "10%" }}>数量</th>
              <th style={{ padding: "3mm 2mm", textAlign: "center", width: "10%" }}>単位</th>
              <th style={{ padding: "3mm 2mm", textAlign: "right", width: "20%" }}>単価（円）</th>
              <th style={{ padding: "3mm 2mm", textAlign: "right", width: "20%" }}>金額（円）</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={idx}
                style={{ borderBottom: "1px solid #ddd", backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <td style={{ padding: "2.5mm 2mm" }}>{item.item_description}</td>
                <td style={{ padding: "2.5mm 2mm", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "2.5mm 2mm", textAlign: "center" }}>{item.unit}</td>
                <td style={{ padding: "2.5mm 2mm", textAlign: "right" }}>{item.unit_price.toLocaleString()}</td>
                <td style={{ padding: "2.5mm 2mm", textAlign: "right" }}>{item.amount.toLocaleString()}</td>
              </tr>
            ))}
            {/* 空行補完 */}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ borderBottom: "1px solid #eee", height: "8mm" }}>
                <td colSpan={5} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* 合計欄 */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "9pt", minWidth: "65mm" }}>
            <tbody>
              <tr>
                <td style={{ padding: "2mm 4mm", border: "1px solid #ccc", fontWeight: "bold" }}>小計</td>
                <td style={{ padding: "2mm 4mm", border: "1px solid #ccc", textAlign: "right" }}>
                  ¥ {subtotal.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "2mm 4mm", border: "1px solid #ccc" }}>消費税（10%）</td>
                <td style={{ padding: "2mm 4mm", border: "1px solid #ccc", textAlign: "right" }}>
                  ¥ {tax.toLocaleString()}
                </td>
              </tr>
              <tr style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>
                <td style={{ padding: "3mm 4mm", fontWeight: "bold", fontSize: "11pt" }}>合計（税込）</td>
                <td style={{ padding: "3mm 4mm", textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>
                  ¥ {total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 備考欄 */}
        <div style={{ marginTop: "8mm", fontSize: "8pt", color: "#555" }}>
          <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>備考</div>
          <div style={{ border: "1px solid #ccc", padding: "3mm", minHeight: "12mm" }}>
            お振込手数料はご負担いただきますようお願いいたします。
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 請求書作成・編集モーダル
// ─────────────────────────────────────────────────────────
function InvoiceFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const dueDefault = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoice_number || "");
  const [issueDate, setIssueDate] = useState(initial?.issue_date || today);
  const [dueDate, setDueDate] = useState(initial?.due_date || dueDefault);
  const [recipientName, setRecipientName] = useState(initial?.recipient_name || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [items, setItems] = useState<InvoiceItem[]>(
    initial?.invoice_items && initial.invoice_items.length > 0
      ? initial.invoice_items
      : [{ ...EMPTY_ITEM }]
  );
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 新規の場合、採番する
  useEffect(() => {
    if (!initial) {
      generateInvoiceNumber().then(setInvoiceNumber);
    }
  }, [initial]);

  // 明細の金額を自動計算
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.amount = Number(item.quantity) * Number(item.unit_price);
      }
      next[idx] = item;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const taxAmount = Math.floor(subtotal * TAX_RATE);
  const totalAmount = subtotal + taxAmount;

  const handleSave = async (status: Invoice["status"] = "draft") => {
    if (!recipientName || !title) {
      alert("請求先と件名は必須です。");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        // UPDATE
        const { error } = await supabase
          .from("invoices")
          .update({
            issue_date: issueDate,
            due_date: dueDate,
            recipient_name: recipientName,
            title,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            status,
          })
          .eq("id", initial.id);
        if (error) throw error;

        // 明細を一旦削除して再挿入
        await supabase.from("invoice_items").delete().eq("invoice_id", initial.id);
        if (items.length > 0) {
          const { error: ie } = await supabase.from("invoice_items").insert(
            items.map((item) => ({
              invoice_id: initial.id,
              item_description: item.item_description,
              quantity: Number(item.quantity),
              unit: item.unit,
              unit_price: Number(item.unit_price),
              amount: Number(item.amount),
            }))
          );
          if (ie) throw ie;
        }
      } else {
        // INSERT
        const { data: inv, error } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            issue_date: issueDate,
            due_date: dueDate,
            recipient_name: recipientName,
            title,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            status,
          })
          .select()
          .single();
        if (error) throw error;

        if (items.length > 0) {
          const { error: ie } = await supabase.from("invoice_items").insert(
            items.map((item) => ({
              invoice_id: inv.id,
              item_description: item.item_description,
              quantity: Number(item.quantity),
              unit: item.unit,
              unit_price: Number(item.unit_price),
              amount: Number(item.amount),
            }))
          );
          if (ie) throw ie;
        }
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice: Partial<Invoice> = {
    invoice_number: invoiceNumber,
    issue_date: issueDate,
    due_date: dueDate,
    recipient_name: recipientName,
    title,
    total_amount: totalAmount,
    tax_amount: taxAmount,
  };

  return (
    <>
      {showPreview && (
        <InvoicePreview
          invoice={previewInvoice}
          items={items}
          onClose={() => setShowPreview(false)}
        />
      )}

      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* ヘッダー */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                {initial ? "請求書を編集" : "新規請求書作成"}
              </h2>
              <p className="text-xs text-blue-400 font-bold mt-0.5">{invoiceNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  発行日
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  お支払期限
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  請求先名称
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="例: 越前市役所にぎわい創出課 御中"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  件名
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: BMX体験会＆パフォーマンスショー費用として"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* 明細 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">明細</h3>
                <button
                  onClick={addItem}
                  className="text-xs font-black text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  ＋ 行を追加
                </button>
              </div>

              {/* テーブルヘッダー */}
              <div className="grid grid-cols-[1fr_60px_56px_100px_100px_32px] gap-2 mb-2 px-1">
                {["品名・項目", "数量", "単位", "単価（円）", "金額（円）", ""].map((h) => (
                  <span key={h} className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_56px_100px_100px_32px] gap-2 items-center">
                    <input
                      type="text"
                      value={item.item_description}
                      onChange={(e) => updateItem(idx, "item_description", e.target.value)}
                      placeholder="品名を入力"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <input
                      type="number"
                      value={item.unit_price}
                      min={0}
                      onChange={(e) => updateItem(idx, "unit_price", parseInt(e.target.value) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-right focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-2 text-slate-300 text-xs text-right">
                      {Number(item.amount).toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 合計欄 */}
            <div className="flex justify-end">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-64 space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>小計</span>
                  <span>¥ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>消費税（10%）</span>
                  <span>¥ {taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white border-t border-slate-600 pt-2 mt-2">
                  <span>合計（税込）</span>
                  <span className="text-blue-300">¥ {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 発行者情報プレビュー */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400">
              <p className="font-black text-slate-300 mb-1">発行者情報（固定）</p>
              <p>{ISSUER.name}　{ISSUER.person}</p>
              <p>{ISSUER.address}</p>
              <p>振込先：{ISSUER.bank}</p>
            </div>
          </div>

          {/* フッターボタン */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-wrap gap-3 justify-between rounded-b-2xl">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-xl transition-colors"
            >
              👁️ プレビュー
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                下書き保存
              </button>
              <button
                onClick={() => handleSave("issued")}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "保存中…" : "発行する"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ invoice: Invoice; items: InvoiceItem[] } | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
      showToast("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async (id: string) => {
    if (!confirm("この請求書を削除しますか？")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      showToast("削除に失敗しました");
    } else {
      showToast("削除しました");
      fetchInvoices();
    }
  };

  const handleStatusChange = async (id: string, newStatus: Invoice["status"]) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      showToast("ステータス変更に失敗しました");
      return;
    }

    // 「paid」に変更したとき → 会計テーブルに売上を連携
    if (newStatus === "paid") {
      const inv = invoices.find((i) => i.id === id);
      if (inv) {
        await supabase.from("transactions").insert({
          date: new Date().toISOString().split("T")[0],
          title: `請求書売上 ${inv.invoice_number}：${inv.title}`,
          amount: inv.total_amount,
          category: "event",
          description: `請求書 ${inv.invoice_number} 入金`,
        });
        showToast("入金済に更新し、会計データへ反映しました ✅");
      }
    } else {
      showToast("ステータスを更新しました");
    }

    fetchInvoices();
  };

  const handlePreview = async (inv: Invoice) => {
    // 明細が未ロードの場合は取得
    let items = inv.invoice_items || [];
    if (items.length === 0) {
      const { data } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id);
      items = data || [];
    }
    setPreviewTarget({ invoice: inv, items });
  };

  const totalByStatus = {
    draft: invoices.filter((i) => i.status === "draft").length,
    issued: invoices.filter((i) => i.status === "issued").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  return (
    <>
      {/* 印刷用グローバルスタイル */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print-area { display: block !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
          #invoice-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[300] bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-black shadow-2xl animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* フォームモーダル */}
      {isFormOpen && (
        <InvoiceFormModal
          initial={editTarget}
          onClose={() => { setIsFormOpen(false); setEditTarget(null); }}
          onSaved={() => { fetchInvoices(); showToast("保存しました ✅"); }}
        />
      )}

      {/* プレビューモーダル */}
      {previewTarget && (
        <InvoicePreview
          invoice={previewTarget.invoice}
          items={previewTarget.items}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {/* ページ本体 */}
      <div className="min-h-screen bg-slate-950 text-white">
        {/* ページヘッダー */}
        <div className="px-6 md:px-10 pt-8 pb-6 border-b border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                🧾 請求書管理
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                Invoice Management
              </p>
            </div>
            <button
              onClick={() => { setEditTarget(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-blue-900/30"
            >
              ＋ 新規請求書作成
            </button>
          </div>
        </div>

        <div className="px-6 md:px-10 py-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <div
                key={key}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  statusFilter === key ? val.bg + " scale-[1.02]" : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              >
                <p className={`text-2xl font-black ${val.color}`}>
                  {totalByStatus[key as keyof typeof totalByStatus]}
                </p>
                <p className="text-xs text-slate-400 font-bold mt-1">{val.label}</p>
              </div>
            ))}
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[["all", "すべて"], ...Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])].map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                    statusFilter === key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          {/* 請求書リスト */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 font-black text-sm">
              読み込み中…
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-5xl">🧾</div>
              <p className="text-slate-500 font-black text-sm">請求書がありません</p>
              <button
                onClick={() => { setEditTarget(null); setIsFormOpen(true); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-colors"
              >
                ＋ 最初の請求書を作成
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const st = STATUS_LABELS[inv.status];
                return (
                  <div
                    key={inv.id}
                    className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* 左：請求書情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-black text-slate-500 tracking-widest uppercase">
                            {inv.invoice_number}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-base font-black text-white truncate">{inv.recipient_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{inv.title}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          発行日：{inv.issue_date} | 期限：{inv.due_date}
                        </p>
                      </div>

                      {/* 右：金額・操作 */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-black text-blue-300">
                            ¥ {inv.total_amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-600">税込合計</p>
                        </div>

                        {/* ステータス変更セレクト */}
                        <select
                          value={inv.status}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice["status"])}
                          className="bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="draft">下書き</option>
                          <option value="issued">発行済</option>
                          <option value="paid">入金済</option>
                        </select>

                        {/* アクションボタン */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePreview(inv)}
                            title="プレビュー / 印刷"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-blue-700 text-slate-400 hover:text-white transition-all text-sm"
                          >
                            🖨️
                          </button>
                          <button
                            onClick={() => { setEditTarget(inv); setIsFormOpen(true); }}
                            title="編集"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            title="削除"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-all text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
