"use client"; 
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Transaction = {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
  description?: string;
  created_at?: string;
};

const CATEGORIES = [
  { 
    id: 'event', 
    label: '① イベント・体験会報酬', 
    shortLabel: 'イベント',
    color: 'text-blue-400', 
    bg: 'bg-blue-400/10', 
    border: 'border-blue-400/20',
    gradient: 'from-blue-600/20 to-transparent'
  },
  { 
    id: 'school', 
    label: '② スクール月謝収入', 
    shortLabel: '月謝',
    color: 'text-emerald-400', 
    bg: 'bg-emerald-400/10', 
    border: 'border-emerald-400/20',
    gradient: 'from-emerald-600/20 to-transparent'
  },
  { 
    id: 'pool', 
    label: '③ チームプール金', 
    shortLabel: 'プール金',
    color: 'text-amber-400', 
    bg: 'bg-amber-400/10', 
    border: 'border-amber-400/20',
    gradient: 'from-amber-600/20 to-transparent'
  },
  { 
    id: 'other', 
    label: 'その他', 
    shortLabel: 'その他',
    color: 'text-slate-400', 
    bg: 'bg-slate-400/10', 
    border: 'border-slate-400/20',
    gradient: 'from-slate-600/20 to-transparent'
  },
];

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // 新規登録用フォームの状態
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: "",
    amount: "",
    category: "event",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const startDate = `${selectedMonth}-01`;
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${selectedMonth}-${lastDay}`;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("データ取得エラー:", error);
      showToast("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("transactions").insert([
        {
          date: formData.date,
          title: formData.title,
          amount: Number(formData.amount),
          category: formData.category,
        },
      ]);

      if (error) throw error;

      showToast("正常に登録されました");
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        title: "",
        amount: "",
        category: "event",
      });
      fetchTransactions();
    } catch (error: any) {
      console.error("登録エラー:", error);
      showToast("登録に失敗しました");
    }
  };

  const syncMonthlyFees = async () => {
    if (!confirm(`${selectedMonth}分の生徒月謝を一括計上しますか？`)) return;
    
    try {
      const { data: students, error: stError } = await supabase
        .from("students")
        .select("name, monthly_fee")
        .eq("is_active", true);

      if (stError) throw stError;
      if (!students || students.length === 0) {
        showToast("対象生徒がいません");
        return;
      }

      const newTransactions = students
        .filter(s => s.monthly_fee > 0)
        .map(s => ({
          date: `${selectedMonth}-01`,
          title: `月謝: ${s.name}`,
          amount: s.monthly_fee,
          category: 'school',
        }));

      if (newTransactions.length === 0) {
        showToast("計上対象がいません");
        return;
      }

      const { error: insError } = await supabase.from("transactions").insert(newTransactions);
      if (insError) throw insError;

      showToast(`${newTransactions.length}件の月謝を計上しました`);
      fetchTransactions();
    } catch (error: any) {
      console.error("月謝同期エラー:", error);
      showToast("同期に失敗しました");
    }
  };

  // 集計ロジック
  const monthlyIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const categoryTotals = CATEGORIES.map(cat => {
    const total = transactions
      .filter(t => (cat.id === 'other' ? !CATEGORIES.slice(0, 3).some(c => c.id === t.category) : t.category === cat.id))
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, total };
  });

  return (
    <div className="p-4 md:p-10 bg-slate-950 min-h-screen text-slate-200 selection:bg-blue-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[200] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900 border border-slate-700/50 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-black tracking-widest uppercase">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-[2px] bg-blue-600"></span>
            <p className="text-blue-500 text-[10px] font-black tracking-[0.4em] uppercase">Financial Intelligence</p>
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
            Accounting <span className="text-slate-700 block md:inline md:ml-2">/ 会計管理</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button
            onClick={syncMonthlyFees}
            className="flex-1 lg:flex-none px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <span className="group-hover:text-blue-500 transition-colors uppercase">Sync Monthly Fees</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-hover:rotate-180 transition-transform duration-500">
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            </svg>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 uppercase"
          >
            New Transaction <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </header>

      {/* Filter Section */}
      <div className="mb-12 inline-flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl">
        <label className="pl-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-slate-800 border border-slate-700 px-6 py-3 rounded-xl text-blue-400 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
        />
      </div>

      {/* Scoreboard / Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Main Balance Card */}
        <div className="relative group overflow-hidden bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl col-span-1 md:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000"></div>
          <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase mb-4">Total Monthly Income</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black font-mono tracking-tighter text-white">¥{monthlyIncome.toLocaleString()}</span>
          </div>
          <div className="mt-6 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-2/3 shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
          </div>
        </div>

        {/* Category Specific Cards */}
        {categoryTotals.slice(0, 3).map((cat) => (
          <div key={cat.id} className={`bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group hover:border-slate-700 transition-colors`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
            <p className={`text-[10px] font-black tracking-[0.3em] uppercase mb-4 ${cat.color} opacity-70`}>{cat.label}</p>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className={`text-4xl font-black font-mono tracking-tighter ${cat.color}`}>
                +¥{cat.total.toLocaleString()}
              </span>
            </div>
            <div className="mt-6 flex justify-between items-center relative z-10">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{cat.shortLabel} Distribution</span>
              <div className={`w-8 h-8 rounded-full ${cat.bg} border ${cat.border} flex items-center justify-center`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cat.color.replace('text-', 'bg-')}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-8 py-10 border-b border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h3 className="text-xl font-black italic tracking-[0.1em] text-white flex items-center gap-4">
              TRANSACTION RECORDS
              <span className="inline-block w-20 h-[1px] bg-slate-800"></span>
            </h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase mt-1 tracking-widest">Displaying logs for {selectedMonth}</p>
          </div>
          <div className="px-6 py-3 bg-slate-800/50 rounded-full border border-slate-700/30 text-[10px] font-black font-mono text-slate-500 tracking-widest uppercase">
            {transactions.length} Entries Found
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950/30 text-[10px] uppercase font-black tracking-[0.2em] text-slate-600">
                <th className="px-8 py-6 text-left border-b border-slate-800/50 font-black">Date</th>
                <th className="px-8 py-6 text-left border-b border-slate-800/50">Details / Description</th>
                <th className="px-8 py-6 text-left border-b border-slate-800/50">Allocation</th>
                <th className="px-8 py-6 text-right border-b border-slate-800/50">Balance Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-600 tracking-[0.5em] uppercase">Synchronizing Stream...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                    <p className="text-xs font-black text-slate-700 tracking-[0.3em] uppercase italic">Zero transactions detected for this period</p>
                  </td>
                </tr>
              ) : transactions.map((t) => {
                const cat = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[3];
                return (
                  <tr key={t.id} className="group hover:bg-slate-800/20 transition-all duration-300">
                    <td className="px-8 py-6 text-xs font-mono text-slate-500 group-hover:text-blue-400 transition-colors">{t.date}</td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-200 group-hover:text-white transition-colors">{t.title}</p>
                      {t.description && <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">{t.description}</p>}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest border ${cat.border} ${cat.bg} ${cat.color} uppercase`}>
                        <span className={`w-1 h-1 rounded-full ${cat.color.replace('text-', 'bg-')}`}></span>
                        {cat.shortLabel}
                      </span>
                    </td>
                    <td className={`px-8 py-6 text-right font-black font-mono text-lg tracking-tighter ${t.amount >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {t.amount >= 0 ? '+' : '-'}¥{Math.abs(t.amount).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.8)] overflow-hidden scale-in animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">New Entry</h2>
                <p className="text-[10px] font-black text-blue-500/70 tracking-widest uppercase mt-1">Append to transaction log</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all active:scale-90 shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ml-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ml-1">Category Allocation</label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none uppercase tracking-widest"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ml-1">Description / Transaction Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Fee (John Doe), Venue Rental"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ml-1">Cash Flow Amount (¥)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-black text-xl">¥</span>
                  <input
                    type="number"
                    required
                    placeholder="Input + for revenue, - for expenses"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-6 py-5 text-white font-mono font-black text-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl tracking-[0.3em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] uppercase text-xs"
              >
                Register Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
