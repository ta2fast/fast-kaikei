import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type Transaction = {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
  description?: string;
};

type CategoryInfo = {
  id: string;
  label: string;
  shortLabel: string;
  total: number;
};

type ExportData = {
  transactions: Transaction[];
  selectedMonth: string;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  categoryTotals: CategoryInfo[];
};

/**
 * Export accounting data as an Excel (.xlsx) file
 */
export function exportToExcel(data: ExportData) {
  const { transactions, selectedMonth, monthlyIncome, monthlyExpense, monthlyNet, categoryTotals } = data;
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: 月間サマリー ───
  const summaryRows = [
    ["F.A.S.T. 会計レポート"],
    [],
    ["対象期間", selectedMonth],
    [],
    ["── 月間収支サマリー ──"],
    ["総収入", monthlyIncome],
    ["総支出", monthlyExpense],
    ["純利益", monthlyNet],
    [],
    ["── カテゴリー別内訳 ──"],
    ...categoryTotals.map(cat => [cat.label, cat.total]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Column widths
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];

  // Format currency cells
  const currencyCells = ["B6", "B7", "B8"];
  categoryTotals.forEach((_, i) => {
    currencyCells.push(`B${11 + i}`);
  });
  currencyCells.forEach(ref => {
    if (wsSummary[ref]) {
      wsSummary[ref].z = '#,##0"円"';
    }
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, "月間サマリー");

  // ─── Sheet 2: 取引一覧 ───
  const txHeaders = ["日付", "件名", "カテゴリー", "金額", "備考"];
  const txRows = transactions.map(t => [
    t.date,
    t.title,
    getCategoryLabel(t.category),
    t.amount,
    t.description || "",
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);

  // Column widths
  wsTx["!cols"] = [
    { wch: 14 },  // 日付
    { wch: 30 },  // 件名
    { wch: 18 },  // カテゴリー
    { wch: 16 },  // 金額
    { wch: 40 },  // 備考
  ];

  // Format amount column
  txRows.forEach((_, i) => {
    const ref = `D${i + 2}`;
    if (wsTx[ref]) {
      wsTx[ref].z = '#,##0"円"';
    }
  });

  XLSX.utils.book_append_sheet(wb, wsTx, "取引一覧");

  // Generate and download
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, `FAST会計_${selectedMonth}.xlsx`);
}

/**
 * Export accounting data as PDF via browser print dialog
 */
export function exportToPDF(data: ExportData) {
  const { transactions, selectedMonth, monthlyIncome, monthlyExpense, monthlyNet, categoryTotals } = data;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("ポップアップがブロックされました。ポップアップを許可してください。");
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>F.A.S.T. 会計レポート - ${selectedMonth}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Noto Sans JP', sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 40px;
      line-height: 1.6;
    }

    .header {
      border-bottom: 3px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 12px;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .header .period {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      background: #f1f5f9;
      padding: 8px 20px;
      border-radius: 8px;
    }
    .header .print-date {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
      text-align: right;
    }

    .section-title {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #334155;
      margin: 32px 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 12px;
    }
    .summary-card {
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .summary-card .value {
      font-size: 26px;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }
    .summary-card.income .value { color: #2563eb; }
    .summary-card.expense .value { color: #e11d48; }
    .summary-card.net { border-color: #818cf8; background: #f5f3ff; }
    .summary-card.net .value { color: #4f46e5; }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .category-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-card .name {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
    }
    .category-card .amount {
      font-size: 16px;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    thead th {
      background: #1e293b;
      color: #ffffff;
      padding: 12px 16px;
      text-align: left;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    thead th:nth-child(4) { text-align: right; }
    tbody tr { border-bottom: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td {
      padding: 10px 16px;
      vertical-align: top;
    }
    tbody td:first-child {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      font-weight: 700;
    }
    .tx-title { font-weight: 700; }
    .tx-desc { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .tx-category {
      display: inline-block;
      background: #f1f5f9;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    .positive { color: #059669; }
    .negative { color: #e11d48; }
    td.amount-cell {
      text-align: right;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
      font-size: 14px;
      white-space: nowrap;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      letter-spacing: 2px;
    }

    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }

    .print-btn-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .print-btn {
      background: #1e293b;
      color: #fff;
      border: none;
      padding: 14px 48px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 3px;
      cursor: pointer;
      text-transform: uppercase;
    }
    .print-btn:hover { background: #334155; }
  </style>
</head>
<body>
  <div class="print-btn-container no-print">
    <button class="print-btn" onclick="window.print()">📄 PDF として保存 / 印刷する</button>
  </div>

  <div class="header">
    <div>
      <div class="subtitle">Financial Report</div>
      <h1>F.A.S.T. 会計レポート</h1>
    </div>
    <div>
      <div class="period">対象期間: ${selectedMonth}</div>
      <div class="print-date">出力日: ${new Date().toLocaleDateString('ja-JP')}</div>
    </div>
  </div>

  <div class="section-title">月間収支サマリー</div>
  <div class="summary-grid">
    <div class="summary-card income">
      <div class="label">総収入</div>
      <div class="value">¥${monthlyIncome.toLocaleString()}</div>
    </div>
    <div class="summary-card expense">
      <div class="label">総支出</div>
      <div class="value">¥${monthlyExpense.toLocaleString()}</div>
    </div>
    <div class="summary-card net">
      <div class="label">純利益</div>
      <div class="value">${monthlyNet >= 0 ? '' : '-'}¥${Math.abs(monthlyNet).toLocaleString()}</div>
    </div>
  </div>

  <div class="section-title">カテゴリー別内訳</div>
  <div class="category-grid">
    ${categoryTotals.map(cat => `
      <div class="category-card">
        <span class="name">${cat.label}</span>
        <span class="amount ${cat.total >= 0 ? 'positive' : 'negative'}">${cat.total >= 0 ? '+' : '-'}¥${Math.abs(cat.total).toLocaleString()}</span>
      </div>
    `).join('')}
  </div>

  <div class="section-title">取引一覧（${transactions.length}件）</div>
  <table>
    <thead>
      <tr>
        <th>日付</th>
        <th>件名 / 備考</th>
        <th>カテゴリー</th>
        <th>金額</th>
      </tr>
    </thead>
    <tbody>
      ${transactions.length === 0 ? `
        <tr><td colspan="4" style="text-align:center;padding:40px;color:#94a3b8;">この期間の取引データはありません</td></tr>
      ` : transactions.map(t => `
        <tr>
          <td>${t.date}</td>
          <td>
            <div class="tx-title">${escapeHtml(t.title)}</div>
            ${t.description ? `<div class="tx-desc">${escapeHtml(t.description)}</div>` : ''}
          </td>
          <td><span class="tx-category">${getCategoryLabel(t.category)}</span></td>
          <td class="amount-cell ${t.amount >= 0 ? 'positive' : 'negative'}">
            ${t.amount >= 0 ? '+' : '-'}¥${Math.abs(t.amount).toLocaleString()}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    F.A.S.T. ACCOUNTING SYSTEM — Generated on ${new Date().toISOString().split('T')[0]}
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

function getCategoryLabel(categoryId: string): string {
  const map: Record<string, string> = {
    event: "イベント・体験会報酬",
    school: "スクール月謝収入",
    pool: "チームプール金",
    other: "その他",
  };
  return map[categoryId] || "その他";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
