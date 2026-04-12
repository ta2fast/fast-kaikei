"use client"; 
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { id: 'event', label: 'イベント' },
  { id: 'school', label: 'スクール月謝' },
  { id: 'pool', label: 'チームプール金' },
  { id: 'other', label: 'その他' },
];

export default function AnnualAccountingPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedYear]);

  // 集計用データ（1月～12月）
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
    const monthTransactions = transactions.filter(t => t.date.startsWith(monthStr));
    
    const income = monthTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      month: i + 1,
      monthStr,
      income,
      expense,
      net: income - expense,
      count: monthTransactions.length
    };
  });

  const totalIncome = monthlyStats.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = monthlyStats.reduce((sum, m) => sum + m.expense, 0);
  const totalNet = totalIncome - totalExpense;

  // Max value for scaling bars
  const maxAbsValue = Math.max(
    ...monthlyStats.map(m => Math.max(m.income, m.expense, Math.abs(m.net))),
    1 // avoid dividing by zero
  );

  return (
    <div className="p-4 md:p-10 bg-slate-950 min-h-screen text-slate-200 selection:bg-indigo-500/30">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-[2px] bg-indigo-600"></span>
            <p className="text-indigo-500 text-[10px] font-black tracking-[0.4em] uppercase">ANNUAL REPORT</p>
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
            年間収支レポート <span className="text-slate-700 block md:inline md:ml-2">/ Yearly</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <a
            href="/accounting"
            className="flex-1 lg:flex-none px-8 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all hover:bg-slate-800 active:scale-95 flex items-center justify-center gap-3 uppercase text-slate-400 hover:text-white"
          >
            ← 月間会計に戻る
          </a>
        </div>
      </header>

      {/* Filter Section */}
      <div className="mb-12 inline-flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl">
        <label className="pl-4 text-[10px] font-black text-white uppercase tracking-widest">表示年の選択</label>
        <div className="flex items-center gap-2 pr-2">
            <button 
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-all shadow-lg active:scale-90 text-sm"
            >
                ←
            </button>
            <div className="bg-slate-800 border border-slate-700 px-6 py-3.5 rounded-xl text-indigo-400 font-mono font-black text-xl flex items-center justify-center min-w-[120px] h-12">
                {selectedYear}年
            </div>
            <button 
                onClick={() => setSelectedYear(prev => prev + 1)}
                className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-all shadow-lg active:scale-90 text-sm"
            >
                →
            </button>
        </div>
      </div>

      {/* Summary Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="relative overflow-hidden bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-8 -mt-8"></div>
          <p className="text-[10px] font-black text-slate-100 tracking-[0.3em] uppercase mb-2">年間総収入</p>
          <p className="text-4xl font-black font-mono tracking-tighter text-blue-400">¥{totalIncome.toLocaleString()}</p>
        </div>
        
        <div className="relative overflow-hidden bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-8 -mt-8"></div>
          <p className="text-[10px] font-black text-slate-100 tracking-[0.3em] uppercase mb-2">年間総支出</p>
          <p className="text-4xl font-black font-mono tracking-tighter text-rose-400">¥{totalExpense.toLocaleString()}</p>
        </div>

        <div className="relative overflow-hidden bg-indigo-900/20 p-8 rounded-[2rem] border border-indigo-500/30 shadow-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-8 -mt-8"></div>
          <p className="text-[10px] font-black text-indigo-200 tracking-[0.3em] uppercase mb-2">年間純利益 (Net Profit)</p>
          <p className={`text-5xl font-black font-mono tracking-tighter ${totalNet >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
            {totalNet >= 0 ? '+' : ''}¥{totalNet.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-8 py-10 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-xl font-black italic tracking-[0.1em] text-white flex items-center gap-4">
            月別収支推移 ({selectedYear}年)
            <span className="inline-block w-20 h-[1px] bg-slate-800"></span>
          </h3>
        </div>

        {loading ? (
          <div className="py-32 flex justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-950/80 text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                  <th className="px-8 py-6 text-left border-b border-slate-800">月 (Month)</th>
                  <th className="px-8 py-6 text-right border-b border-slate-800 text-blue-400">収入 (Income)</th>
                  <th className="px-8 py-6 text-right border-b border-slate-800 text-rose-400">支出 (Expense)</th>
                  <th className="px-8 py-6 text-right border-b border-slate-800 text-indigo-400">純利益 (Net)</th>
                  <th className="px-8 py-6 text-left border-b border-slate-800 w-[200px]">利益グラフ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {monthlyStats.map((stat) => (
                  <tr key={stat.month} className="hover:bg-slate-800/20 transition-all">
                    <td className="px-8 py-6 font-black text-white text-lg italic">{stat.month}月</td>
                    <td className="px-8 py-6 text-right font-mono font-bold" style={{ color: '#60a5fa' }}>
                      ¥{stat.income.toLocaleString()}
                    </td>
                    <td className="px-8 py-6 text-right font-mono font-bold" style={{ color: '#fb7185' }}>
                      ¥{stat.expense.toLocaleString()}
                    </td>
                    <td className="px-8 py-6 text-right font-mono font-black text-xl tracking-tighter drop-shadow-md" style={{ color: stat.net >= 0 ? '#818cf8' : '#fb7185' }}>
                      {stat.net >= 0 ? '+' : ''}¥{stat.net.toLocaleString()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                        <div 
                          className={`h-full ${stat.net >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, (Math.abs(stat.net) / maxAbsValue) * 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
