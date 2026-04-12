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
    color: 'text-cyan-400',
    hexColor: '#22d3ee', // cyan-400
    hexBg: '#083344',
    hexBorder: '#06b6d4',
    bg: 'bg-cyan-500/20', 
    border: 'border-cyan-500',
    gradient: 'from-cyan-500/50 to-transparent'
  },
  { 
    id: 'school', 
    label: '② スクール月謝収入', 
    shortLabel: '月謝',
    color: 'text-emerald-400',
    hexColor: '#34d399', // emerald-400
    hexBg: '#022c22',
    hexBorder: '#10b981',
    bg: 'bg-emerald-500/20', 
    border: 'border-emerald-500',
    gradient: 'from-emerald-500/50 to-transparent'
  },
  { 
    id: 'pool', 
    label: '③ チームプール金', 
    shortLabel: 'プール金',
    color: 'text-yellow-400',
    hexColor: '#facc15', // yellow-400
    hexBg: '#422006',
    hexBorder: '#eab308',
    bg: 'bg-yellow-500/20', 
    border: 'border-yellow-500',
    gradient: 'from-yellow-500/50 to-transparent'
  },
  { 
    id: 'other', 
    label: 'その他', 
    shortLabel: 'その他',
    color: 'text-slate-300',
    hexColor: '#cbd5e1', // slate-300
    hexBg: '#1e293b',
    hexBorder: '#64748b',
    bg: 'bg-slate-400/20', 
    border: 'border-slate-500',
    gradient: 'from-slate-500/50 to-transparent'
  },
];

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [lifetimeTransactions, setLifetimeTransactions] = useState<{id: string, amount: number, category: string}[]>([]);

  // 新規登録・編集用フォームの状態
  const [formData, setFormData] = useState({
    id: "",
    date: new Date().toISOString().split('T')[0],
    title: "",
    amount: "",
    category: "event",
    description: "",
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchAllTimeTotals = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category");
      if (error) throw error;
      setLifetimeTransactions(data || []);
    } catch (error) {
      console.error("全期間データ取得エラー:", error);
    }
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
    fetchAllTimeTotals();
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleUpdateCategory = async (id: string, newCategory: string) => {
    try {
      // Optimitistic update
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
      setLifetimeTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
      
      const { error } = await supabase.from("transactions").update({ category: newCategory }).eq("id", id);
      if (error) throw error;
      
      showToast("カテゴリーを変更しました");
      fetchAllTimeTotals();
    } catch (error: any) {
      console.error("カテゴリー更新エラー:", error);
      showToast("カテゴリーの更新に失敗しました");
      fetchTransactions();
      fetchAllTimeTotals();
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        date: formData.date,
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description,
      };

      if (formData.id) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", formData.id);
        if (error) throw error;
        showToast("データが更新されました");
      } else {
        const { error } = await supabase.from("transactions").insert([payload]);
        if (error) throw error;
        showToast("正常に登録されました");
      }

      closeModal();
      fetchTransactions();
      fetchAllTimeTotals();
    } catch (error: any) {
      console.error("保存エラー:", error);
      showToast("保存に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    if (!confirm("本当にこのデータを削除しますか？")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", formData.id);
      if (error) throw error;
      showToast("データが削除されました");
      closeModal();
      fetchTransactions();
      fetchAllTimeTotals();
    } catch (error: any) {
      console.error("削除エラー:", error);
      showToast("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const openModalForNew = () => {
    setFormData({
      id: "",
      date: new Date().toISOString().split('T')[0],
      title: "",
      amount: "",
      category: "event",
      description: "",
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (t: Transaction) => {
    setFormData({
      id: t.id,
      date: t.date,
      title: t.title,
      amount: t.amount.toString(),
      category: t.category,
      description: t.description || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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
      fetchAllTimeTotals();
    } catch (error: any) {
      console.error("月謝同期エラー:", error);
      showToast("同期に失敗しました");
    }
  };

  // 集計ロジック
  // 1. 月間
  const monthlyIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const monthlyNet = monthlyIncome - monthlyExpense;
  
  const monthlyCategoryTotals = CATEGORIES.map(cat => {
    const total = transactions
      .filter(t => (cat.id === 'other' ? !CATEGORIES.slice(0, 3).some(c => c.id === t.category) : t.category === cat.id))
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, total };
  });

  // 2. 全期間 (Lifetime)
  const lifetimeTotal = lifetimeTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const lifetimeCategoryTotals = CATEGORIES.map(cat => {
    const total = lifetimeTransactions
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
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-sm font-black tracking-widest uppercase text-slate-100">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-[2px] bg-blue-600"></span>
            <p className="text-blue-500 text-[10px] font-black tracking-[0.4em] uppercase">FINANCIAL OVERVIEW</p>
          </div>
          <h1 className="text-3xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
            会計管理 <span className="text-slate-700 block md:inline md:ml-2">/ Accounting</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <a
            href="/accounting/annual"
            className="flex-1 lg:flex-none px-8 py-4 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-indigo-300"
          >
            年間収支レポート表示
          </a>
          <button
            onClick={syncMonthlyFees}
            className="flex-1 lg:flex-none px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <span className="text-white group-hover:text-blue-400 transition-colors uppercase font-black">月謝データの同期</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:rotate-180 transition-transform duration-500">
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            </svg>
          </button>
          <button
            onClick={openModalForNew}
            className="flex-1 lg:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 uppercase"
          >
            新規取引の登録 <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </header>

      {/* 1. LIFETIME SECTION (F.A.S.T. Funds) */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </span>
          <h2 className="text-xl font-black italic tracking-widest text-slate-200 uppercase">
            全期間資金ステータス <span className="text-slate-600 text-sm ml-2">Lifetime Status</span>
          </h2>
        </div>
        
        {/* Unified F.A.S.T. Total Card */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-[2rem] shadow-[0_20px_60px_rgba(79,70,229,0.15)] overflow-hidden">
          
          {/* Main F.A.S.T. Header Section */}
          <div className="relative group p-8 md:p-10 border-b border-indigo-500/20">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10">
              <p className="text-[12px] font-black text-indigo-300 tracking-[0.3em] uppercase mb-4">現在の総トータル金額 (F.A.S.T.資金)</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl md:text-6xl font-black font-mono tracking-tighter ${lifetimeTotal >= 0 ? "text-white" : "text-rose-400"}`}>
                  {lifetimeTotal < 0 ? "-" : ""}¥{Math.abs(lifetimeTotal).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest bg-slate-800/50 inline-block px-4 py-2 rounded-xl border border-slate-700/50">すべての期間の「総収入 - 総支出」</p>
            </div>
          </div>

          {/* Lifetime Category Breakdown (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-indigo-500/10 bg-slate-950/30">
            {lifetimeCategoryTotals.slice(0, 3).map((cat) => (
              <div key={`lifetime-${cat.id}`} className="relative p-6 md:p-8 group hover:bg-slate-800/40 transition-colors overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-slate-500 mb-2 tracking-wider">全期間カテゴリー別</p>
                  <p className="text-[14px] font-black tracking-[0.1em] uppercase opacity-90 drop-shadow-sm" style={{ color: cat.hexColor }}>{cat.shortLabel}</p>
                </div>
                <div className="flex items-baseline gap-2 relative z-10 mt-4">
                  <span className="text-2xl md:text-4xl font-black font-mono tracking-tighter drop-shadow-md" style={{ color: cat.total >= 0 ? '#ffffff' : '#fb7185' }}>
                    {cat.total >= 0 ? '+' : '-'}¥{Math.abs(cat.total).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-12"></div>

      {/* 2. MONTHLY SECTION */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10H3M21 6H3M21 14H3M21 18H3"/></svg>
            </span>
            <h2 className="text-xl font-black italic tracking-widest text-slate-200 uppercase">
              月間収支サマリー <span className="text-slate-600 text-sm ml-2">Monthly Summary</span>
            </h2>
          </div>
          
          {/* Filter Section Moved Here */}
          <div className="inline-flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl w-fit">
            <label className="pl-4 text-[10px] font-black text-white uppercase tracking-widest hidden sm:block">表示月の選択</label>
            <div className="flex items-center gap-2 pr-2">
                <button 
                    onClick={() => changeMonth(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-all shadow-lg active:scale-90 text-sm"
                >
                    ←
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-blue-400 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer h-10 text-sm"
                />
                <button 
                    onClick={() => changeMonth(1)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-all shadow-lg active:scale-90 text-sm"
                >
                    →
                </button>
            </div>
          </div>
        </div>

        {/* Unified Monthly Summary Card */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-[2rem] shadow-2xl overflow-hidden mt-6">
          {/* Monthly Net Section */}
          <div className="relative group p-8 md:p-10 border-b border-blue-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-1000"></div>
            
            <div className="relative z-10">
              <p className="text-[12px] font-black text-blue-300 tracking-[0.3em] uppercase mb-4">【{selectedMonth}】 月間トータル</p>
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl md:text-6xl font-black font-mono tracking-tighter ${monthlyNet >= 0 ? "text-white" : "text-rose-400"}`}>
                  {monthlyNet < 0 ? "-" : ""}¥{Math.abs(monthlyNet).toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">(純利益)</span>
              </div>
            </div>
            
            <div className="relative z-10 mt-8 max-w-2xl">
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className="h-full flex">
                  <div style={{ width: `${monthlyIncome === 0 && monthlyExpense === 0 ? 0 : (monthlyIncome / (monthlyIncome + monthlyExpense)) * 100}%` }} className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500"></div>
                  <div style={{ width: `${monthlyIncome === 0 && monthlyExpense === 0 ? 0 : (monthlyExpense / (monthlyIncome + monthlyExpense)) * 100}%` }} className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all duration-500"></div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>総収入</span>
                  <span className="font-bold tracking-wider" style={{ color: '#60a5fa' }}>¥{monthlyIncome.toLocaleString()}</span>
                </div>
                <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col text-right">
                  <span className="text-[9px] uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>総支出</span>
                  <span className="font-bold tracking-wider" style={{ color: '#fb7185' }}>¥{monthlyExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Category Breakdown (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-blue-500/10 bg-slate-950/30">
            {monthlyCategoryTotals.slice(0, 3).map((cat) => (
              <div key={`monthly-${cat.id}`} className="relative p-6 md:p-8 group hover:bg-slate-800/40 transition-colors overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-2 tracking-wider">【{selectedMonth}】 カテゴリー内訳</p>
                    <p className="text-[14px] font-black tracking-[0.1em] uppercase opacity-90 drop-shadow-sm" style={{ color: cat.hexColor }}>{cat.shortLabel}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full ${cat.bg} border border:opacity-50 ${cat.border} flex items-center justify-center shrink-0`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-80" style={{ color: cat.hexColor }}></div>
                  </div>
                </div>
                <div className="flex items-center mt-4 relative z-10">
                  <span className="text-2xl md:text-4xl font-black font-mono tracking-tighter drop-shadow-md" style={{ color: cat.total >= 0 ? '#ffffff' : '#fb7185' }}>
                    {cat.total >= 0 ? '+' : '-'}¥{Math.abs(cat.total).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-8 py-10 border-b border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h3 className="text-xl font-black italic tracking-[0.1em] text-white flex items-center gap-4">
              取引履歴一覧
              <span className="inline-block w-20 h-[1px] bg-slate-800"></span>
            </h3>
            <p className="text-[10px] text-white font-bold uppercase mt-1 tracking-widest">{selectedMonth} の取引ログを表示中</p>
          </div>
          <div className="px-6 py-3 bg-slate-800/80 rounded-full border border-slate-700/50 text-[10px] font-black font-mono text-white tracking-widest uppercase">
            {transactions.length} 件のデータが見つかりました
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950 text-[10px] uppercase font-black tracking-[0.2em] text-white">
                <th className="px-4 md:px-8 py-4 md:py-6 text-left border-b border-slate-800 font-black">発生日</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-left border-b border-slate-800">内容 / 内訳（説明）</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-left border-b border-slate-800 hidden md:table-cell">カテゴリー</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-right border-b border-slate-800">収支金額</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-center border-b border-slate-800 w-[60px] md:w-[100px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-300 tracking-[0.5em] uppercase">同期中...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <p className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase italic">この期間の取引データはありません</p>
                  </td>
                </tr>
              ) : transactions.map((t) => {
                const cat = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[3];
                return (
                  <tr key={t.id} className="group hover:bg-slate-800/40 transition-all duration-300">
                    <td className="px-4 md:px-8 py-4 md:py-6 text-xs font-mono text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">{t.date}</td>
                    <td className="px-4 md:px-8 py-4 md:py-6">
                      <p className="text-sm font-black text-white transition-colors">{t.title}</p>
                      {t.description && <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter leading-relaxed" style={{ color: '#94a3b8' }}>{t.description}</p>}
                      {/* モバイルではカテゴリーをここに表示 */}
                      <div className="md:hidden mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border" style={{ color: cat.hexColor, borderColor: cat.hexBorder, backgroundColor: cat.hexBg }}>
                          {cat.shortLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6 hidden md:table-cell">
                      <div className="relative inline-block">
                        <select
                          value={t.category}
                          onChange={(e) => handleUpdateCategory(t.id, e.target.value)}
                          className="appearance-none outline-none cursor-pointer inline-flex items-center px-4 py-2 pr-10 rounded-full text-xs font-black tracking-widest border-2 uppercase transition-all hover:brightness-125 focus:ring-2 focus:ring-slate-400 shadow-xl"
                          style={{ color: cat.hexColor, borderColor: cat.hexBorder, backgroundColor: cat.hexBg }}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.id} value={c.id} style={{ color: c.hexColor, backgroundColor: c.hexBg }} className="font-bold py-2">{c.shortLabel}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" style={{ color: cat.hexColor }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                      </div>
                    </td>
                    <td 
                      className="px-4 md:px-8 py-4 md:py-6 text-right font-black font-mono text-base md:text-lg tracking-tighter drop-shadow-md whitespace-nowrap"
                      style={{ color: t.amount >= 0 ? '#34d399' : '#fb7185' }}
                    >
                      {t.amount >= 0 ? '+' : '-'}¥{Math.abs(t.amount).toLocaleString()}
                    </td>
                    <td className="px-4 md:px-8 py-4 md:py-6 text-center">
                      <button
                        onClick={() => openModalForEdit(t)}
                        className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                        title="編集"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
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
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={closeModal}></div>
          
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-t-[2rem] md:rounded-[2.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.8)] overflow-hidden max-h-[95vh] md:max-h-auto overflow-y-auto scale-in animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">
                  {formData.id ? "取引の編集" : "取引の新規登録"}
                </h2>
                <p className="text-[10px] font-black text-blue-500/70 tracking-widest uppercase mt-1">
                  {formData.id ? "既存のデータを修正します" : "新しい履歴をログに追加します"}
                </p>
              </div>
              <button 
                onClick={closeModal}
                className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all active:scale-90 shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">発生日</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">カテゴリー設定</label>
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
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">件名 / 取引の名称</label>
                <input
                  type="text"
                  required
                  placeholder="例: 月謝（田中太郎）、会場利用料など"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">取引金額 (¥)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-black text-xl">¥</span>
                  <input
                    type="number"
                    required
                    placeholder="収入はプラス、支出はマイナスで入力"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-6 py-5 text-white font-mono font-black text-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">内訳・備考</label>
                <textarea
                  placeholder="取引に関する補足情報を入力してください..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700 min-h-[100px] resize-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl tracking-[0.3em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] uppercase text-xs"
                >
                  {formData.id ? "更新する" : "取引を登録する"}
                </button>
                {formData.id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-6 py-5 bg-rose-600/10 text-rose-500 hover:bg-rose-500 hover:text-white font-black rounded-2xl tracking-widest transition-all active:scale-[0.98] uppercase text-xs"
                  >
                    削除
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
