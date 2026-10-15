"use client";
import { useEffect, useState, useCallback } from "react";
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
  sub: "FAST BMX ASSOCIATION",
  person: "谷口 孝行",
  zip: "〒916-0057",
  address: "福井県鯖江市有定町3丁目4-11",
  bankName: "福井銀行 鯖江支店",
  bankType: "普通",
  bankNumber: "6062304",
  bankKana: "ファスト",
  bankEn: "FAST",
};

const TAX_RATE = 0.1;
const TABLE_ROWS = 5; // 明細の固定行数

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
// ユーティリティ
// ─────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

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
// 印刷プレビューコンポーネント（添付画像に完全準拠）
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
  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const total = subtotal; // 税込単価なので合計=小計
  const fmt = (n: number) => n.toLocaleString("ja-JP");

  // 固定5行になるよう空行を埋める
  const rows: InvoiceItem[] = [
    ...items,
    ...Array.from({ length: Math.max(0, TABLE_ROWS - items.length) }, () => ({
      item_description: "", quantity: 0, unit: "", unit_price: 0, amount: 0,
    })),
  ].slice(0, TABLE_ROWS);

  const sheetStyle: React.CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif",
    fontSize: "10pt",
    lineHeight: 1.6,
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
    padding: "12mm 16mm 14mm 16mm",
    position: "relative",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const BLUE = "#1a6fc4";
  const BLUE_DARK = "#1355a0";
  const BLUE_HEADER_BG = "linear-gradient(135deg, #1a6fc4 0%, #0e4d8c 100%)";
  const TABLE_HEADER_BG = "#2176c2";
  const BORDER_COLOR = "#c0c0c0";
  const TABLE_BORDER = "#a0bcd8";

  return (
    <div
      className="no-print-overlay fixed inset-0 z-[200] flex flex-col items-center bg-black/85 backdrop-blur-sm overflow-auto"
      style={{ paddingTop: "60px", paddingBottom: "40px" }}
    >
      {/* 操作ボタン（印刷対象外） */}
      <div
        className="no-print fixed top-3 left-1/2 flex gap-3 z-10"
        style={{ transform: "translateX(-50%)" }}
      >
        <button
          onClick={() => window.print()}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "10px 22px",
            fontWeight: 900,
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(37,99,235,0.5)",
          }}
        >
          🖨️ 印刷 / PDF保存
        </button>
        <button
          onClick={onClose}
          style={{
            background: "#334155",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "10px 18px",
            fontWeight: 900,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          ✕ 閉じる
        </button>
      </div>

      {/* ─── A4 請求書本体 ─── */}
      <div id="invoice-print-area" style={sheetStyle}>

        {/* ① 右上：請求日・請求書No. */}
        <div style={{ textAlign: "right", marginBottom: "2mm", fontSize: "9pt" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8mm" }}>
            <span>
              <span style={{ color: "#555" }}>請求日：</span>
              <span style={{ fontWeight: "bold" }}>{formatDate(invoice.issue_date || "")}</span>
            </span>
            <span>
              <span style={{ color: "#555" }}>請求書No.：</span>
              <span style={{ fontWeight: "bold" }}>{invoice.invoice_number || ""}</span>
            </span>
          </div>
        </div>

        {/* ② ヘッダーバナー「請 求 書」 */}
        <div
          style={{
            background: BLUE_HEADER_BG,
            borderRadius: "4px",
            textAlign: "center",
            padding: "5mm 0",
            marginBottom: "5mm",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
          }}
        >
          <h1
            style={{
              color: "#ffffff",
              fontSize: "20pt",
              fontWeight: 900,
              letterSpacing: "0.5em",
              margin: 0,
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            請　求　書
          </h1>
        </div>

        {/* ③ 請求先（左）＋ 発行者（右）2カラム */}
        <div style={{ display: "flex", gap: "6mm", marginBottom: "5mm", alignItems: "flex-start" }}>

          {/* 左：請求先 */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "14pt",
                fontWeight: 900,
                borderBottom: `2px solid ${BLUE}`,
                paddingBottom: "1mm",
                marginBottom: "2mm",
                color: "#111",
              }}
            >
              {invoice.recipient_name || "　"}
            </div>
            <div style={{ fontSize: "8.5pt", color: "#444", marginBottom: "3mm", lineHeight: 1.7 }}>
              平素より大変お世話になっております。<br />
              下記の通り ご請求申し上げます。
            </div>

            {/* 件名 */}
            {invoice.title && (
              <div style={{ fontSize: "8.5pt", color: "#444", marginBottom: "3mm" }}>
                件名：{invoice.title}
              </div>
            )}

            {/* 請求金額ボックス */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "3mm", marginTop: "2mm" }}>
              <span style={{ fontSize: "9pt", fontWeight: "bold", color: "#333" }}>請求金額：</span>
              <span
                style={{
                  fontSize: "18pt",
                  fontWeight: 900,
                  color: "#111",
                  letterSpacing: "0.02em",
                }}
              >
                {fmt(total)}
              </span>
              <span style={{ fontSize: "10pt", fontWeight: "bold", color: "#333" }}>円</span>
            </div>

            {/* お支払期限 */}
            {invoice.due_date && (
              <div style={{ fontSize: "8pt", color: "#666", marginTop: "1mm" }}>
                お支払期限：{formatDate(invoice.due_date)}
              </div>
            )}
          </div>

          {/* 右：発行者情報 */}
          <div
            style={{
              minWidth: "68mm",
              maxWidth: "72mm",
              textAlign: "left",
              fontSize: "8.5pt",
              color: "#222",
            }}
          >
            {/* F.A.S.T. 公式ロゴ画像 */}
            <div style={{ marginBottom: "2mm" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="F.A.S.T. BMX ASSOCIATION"
                style={{
                  height: "28mm",
                  width: "auto",
                  maxWidth: "68mm",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div style={{ lineHeight: 1.75, color: "#333", paddingLeft: "1mm" }}>
              <div>F.A.S.T.</div>
              <div>{ISSUER.zip} {ISSUER.address}</div>
              <div>経理担当：{ISSUER.person}</div>
            </div>

            {/* 印鑑風エレメント */}
            <div style={{ marginTop: "2mm", display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  width: "24mm",
                  height: "24mm",
                  border: "2px solid #cc2200",
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cc2200",
                  fontSize: "7pt",
                  fontWeight: 900,
                  lineHeight: 1.4,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                }}
              >
                <div>F.A.S.T.</div>
                <div style={{ fontSize: "6pt" }}>谷口</div>
              </div>
            </div>
          </div>
        </div>

        {/* ④ 請求明細テーブル */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "0",
            fontSize: "9pt",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "46%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "19%" }} />
          </colgroup>
          <thead>
            <tr>
              {["No.", "項目名 / 摘要", "数量", "単価（税込）", "金額（税込）"].map((h, i) => (
                <th
                  key={i}
                  style={{
                    background: TABLE_HEADER_BG,
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                    color: "#ffffff",
                    padding: "2.5mm 2mm",
                    textAlign: i === 0 ? "center" : i >= 2 ? "center" : "left",
                    fontWeight: 900,
                    fontSize: "8.5pt",
                    border: `1px solid ${TABLE_BORDER}`,
                    letterSpacing: "0.02em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => (
              <tr key={idx}>
                {/* No. */}
                <td
                  style={{
                    border: `1px solid ${TABLE_BORDER}`,
                    padding: "2.5mm 2mm",
                    textAlign: "center",
                    color: item.item_description ? "#111" : "transparent",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f8fd",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                    height: "9mm",
                  }}
                >
                  {item.item_description ? idx + 1 : ""}
                </td>
                {/* 項目名 */}
                <td
                  style={{
                    border: `1px solid ${TABLE_BORDER}`,
                    padding: "2.5mm 3mm",
                    color: "#111",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f8fd",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                    height: "9mm",
                  }}
                >
                  {item.item_description}
                </td>
                {/* 数量 */}
                <td
                  style={{
                    border: `1px solid ${TABLE_BORDER}`,
                    padding: "2.5mm 2mm",
                    textAlign: "center",
                    color: "#111",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f8fd",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                    height: "9mm",
                  }}
                >
                  {item.item_description ? item.quantity : ""}
                </td>
                {/* 単価 */}
                <td
                  style={{
                    border: `1px solid ${TABLE_BORDER}`,
                    padding: "2.5mm 3mm",
                    textAlign: "right",
                    color: "#111",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f8fd",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                    height: "9mm",
                  }}
                >
                  {item.item_description ? fmt(item.unit_price) : ""}
                </td>
                {/* 金額 */}
                <td
                  style={{
                    border: `1px solid ${TABLE_BORDER}`,
                    padding: "2.5mm 3mm",
                    textAlign: "right",
                    color: "#111",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f8fd",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                    height: "9mm",
                  }}
                >
                  {item.item_description ? fmt(item.amount) : ""}
                </td>
              </tr>
            ))}

            {/* 合計行 */}
            <tr>
              <td
                colSpan={3}
                style={{ border: "none", padding: 0 }}
              />
              <td
                style={{
                  border: `1px solid ${TABLE_BORDER}`,
                  padding: "3mm",
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: "9.5pt",
                  color: "#111",
                  borderTop: `2px solid ${BLUE}`,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                }}
              >
                合計金額
              </td>
              <td
                style={{
                  border: `1px solid ${TABLE_BORDER}`,
                  padding: "3mm",
                  textAlign: "right",
                  fontWeight: 900,
                  fontSize: "10pt",
                  color: "#111",
                  borderTop: `2px solid ${BLUE}`,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
                }}
              >
                ¥ {fmt(total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ⑤ 水平線 */}
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "5mm 0" }} />

        {/* ⑥ お振込先 */}
        <div
          style={{
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: "4px",
            padding: "3mm 4mm",
            display: "inline-block",
            minWidth: "65mm",
            fontSize: "9pt",
            lineHeight: 1.9,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: "1mm", color: "#222" }}>【お振込先】</div>
          <div style={{ color: "#333" }}>
            {ISSUER.bankName}<br />
            （{ISSUER.bankType}）{ISSUER.bankNumber}<br />
            {ISSUER.bankKana} / {ISSUER.bankEn}
          </div>
        </div>

        {/* ⑦ ウォーターマーク */}
        <div
          style={{
            position: "absolute",
            bottom: "18mm",
            right: "12mm",
            fontSize: "36pt",
            fontWeight: 900,
            color: "rgba(26,111,196,0.06)",
            letterSpacing: "0.1em",
            userSelect: "none",
            pointerEvents: "none",
            fontStyle: "italic",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
          }}
        >
          F.A.S.T.
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

  useEffect(() => {
    if (!initial) {
      generateInvoiceNumber().then(setInvoiceNumber);
    }
  }, [initial]);

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
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  // 単価が税込想定なので合計=小計
  const totalAmount = subtotal;
  const taxAmount = 0; // 税込単価のため0

  const handleSave = async (status: Invoice["status"] = "draft") => {
    if (!recipientName || !title) {
      alert("請求先と件名は必須です。");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        const { error } = await supabase
          .from("invoices")
          .update({ issue_date: issueDate, due_date: dueDate, recipient_name: recipientName, title, total_amount: totalAmount, tax_amount: taxAmount, status })
          .eq("id", initial.id);
        if (error) throw error;
        await supabase.from("invoice_items").delete().eq("invoice_id", initial.id);
        if (items.length > 0) {
          const { error: ie } = await supabase.from("invoice_items").insert(
            items.map((item) => ({ invoice_id: initial.id, item_description: item.item_description, quantity: Number(item.quantity), unit: item.unit, unit_price: Number(item.unit_price), amount: Number(item.amount) }))
          );
          if (ie) throw ie;
        }
      } else {
        const { data: inv, error } = await supabase
          .from("invoices")
          .insert({ invoice_number: invoiceNumber, issue_date: issueDate, due_date: dueDate, recipient_name: recipientName, title, total_amount: totalAmount, tax_amount: taxAmount, status })
          .select()
          .single();
        if (error) throw error;
        if (items.length > 0) {
          const { error: ie } = await supabase.from("invoice_items").insert(
            items.map((item) => ({ invoice_id: inv.id, item_description: item.item_description, quantity: Number(item.quantity), unit: item.unit, unit_price: Number(item.unit_price), amount: Number(item.amount) }))
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

  const previewInvoice: Partial<Invoice> = { invoice_number: invoiceNumber, issue_date: issueDate, due_date: dueDate, recipient_name: recipientName, title, total_amount: totalAmount, tax_amount: taxAmount };

  return (
    <>
      {showPreview && (
        <InvoicePreview invoice={previewInvoice} items={items} onClose={() => setShowPreview(false)} />
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
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">発行日</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">お支払期限</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">請求先名称</label>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="例: 越前市役所にぎわい創出課 御中"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">件名</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: BMX体験会＆パフォーマンスショー費用として"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600" />
              </div>
            </div>

            {/* 明細 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">明細</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">※ 単価は税込金額で入力してください</p>
                </div>
                <button onClick={addItem} className="text-xs font-black text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  ＋ 行を追加
                </button>
              </div>

              <div className="grid grid-cols-[1fr_60px_56px_100px_100px_32px] gap-2 mb-2 px-1">
                {["品名・項目", "数量", "単位", "単価（円）", "金額（円）", ""].map((h) => (
                  <span key={h} className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_56px_100px_100px_32px] gap-2 items-center">
                    <input type="text" value={item.item_description} onChange={(e) => updateItem(idx, "item_description", e.target.value)}
                      placeholder="品名を入力"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600" />
                    <input type="number" value={item.quantity} min={1} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-blue-500 transition-colors" />
                    <input type="text" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-blue-500 transition-colors" />
                    <input type="number" value={item.unit_price} min={0} onChange={(e) => updateItem(idx, "unit_price", parseInt(e.target.value) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs text-right focus:outline-none focus:border-blue-500 transition-colors" />
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-2 text-slate-300 text-xs text-right">
                      {Number(item.amount).toLocaleString()}
                    </div>
                    <button onClick={() => removeItem(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors text-xs">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 合計欄 */}
            <div className="flex justify-end">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-64 space-y-2">
                <div className="flex justify-between text-base font-black text-white">
                  <span>合計（税込）</span>
                  <span className="text-blue-300">¥ {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 発行者情報プレビュー */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400">
              <p className="font-black text-slate-300 mb-1">発行者情報（固定）</p>
              <p>{ISSUER.name}　経理担当：{ISSUER.person}</p>
              <p>{ISSUER.zip} {ISSUER.address}</p>
              <p>振込先：{ISSUER.bankName}（{ISSUER.bankType}）{ISSUER.bankNumber}　{ISSUER.bankKana}</p>
            </div>
          </div>

          {/* フッターボタン */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-wrap gap-3 justify-between rounded-b-2xl">
            <button onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-xl transition-colors">
              👁️ プレビュー
            </button>
            <div className="flex gap-3">
              <button onClick={() => handleSave("draft")} disabled={saving}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-xl transition-colors disabled:opacity-50">
                下書き保存
              </button>
              <button onClick={() => handleSave("issued")} disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition-colors disabled:opacity-50">
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
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
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

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDelete = async (id: string) => {
    if (!confirm("この請求書を削除しますか？")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) { showToast("削除に失敗しました"); } else { showToast("削除しました"); fetchInvoices(); }
  };

  const handleStatusChange = async (id: string, newStatus: Invoice["status"]) => {
    const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
    if (error) { showToast("ステータス変更に失敗しました"); return; }
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
    let items = inv.invoice_items || [];
    if (items.length === 0) {
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
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
      {/* 印刷スタイルは globals.css の @media print で管理 */}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[300] bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-black shadow-2xl">
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
        <div className="px-6 md:px-10 pt-8 pb-6 border-b border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">🧾 請求書管理</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Invoice Management</p>
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
                className={`rounded-xl border p-4 cursor-pointer transition-all ${statusFilter === key ? val.bg + " scale-[1.02]" : "bg-slate-900/60 border-slate-800 hover:border-slate-700"}`}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              >
                <p className={`text-2xl font-black ${val.color}`}>{totalByStatus[key as keyof typeof totalByStatus]}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{val.label}</p>
              </div>
            ))}
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[["all", "すべて"], ...Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])].map(([key, label]) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${statusFilter === key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* 請求書リスト */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 font-black text-sm">読み込み中…</div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-5xl">🧾</div>
              <p className="text-slate-500 font-black text-sm">請求書がありません</p>
              <button onClick={() => { setEditTarget(null); setIsFormOpen(true); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-colors">
                ＋ 最初の請求書を作成
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const st = STATUS_LABELS[inv.status];
                return (
                  <div key={inv.id}
                    className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 group">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-black text-slate-500 tracking-widest uppercase">{inv.invoice_number}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
                        </div>
                        <p className="text-base font-black text-white truncate">{inv.recipient_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{inv.title}</p>
                        <p className="text-[10px] text-slate-600 mt-1">発行日：{inv.issue_date} | 期限：{inv.due_date}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-black text-blue-300">¥ {inv.total_amount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-600">税込合計</p>
                        </div>
                        <select value={inv.status} onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice["status"])}
                          className="bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
                          <option value="draft">下書き</option>
                          <option value="issued">発行済</option>
                          <option value="paid">入金済</option>
                        </select>
                        <div className="flex gap-1">
                          <button onClick={() => handlePreview(inv)} title="プレビュー / 印刷"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-blue-700 text-slate-400 hover:text-white transition-all text-sm">🖨️</button>
                          <button onClick={() => { setEditTarget(inv); setIsFormOpen(true); }} title="編集"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-sm">✏️</button>
                          <button onClick={() => handleDelete(inv.id)} title="削除"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-all text-sm">🗑️</button>
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
