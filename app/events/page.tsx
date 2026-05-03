"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventRecord = {
  id: string;
  event_date: string;
  event_name: string | null;
  location: string;
  description: string;
  staff: string | null;
  trial_participants: number;
  has_trial_fee: boolean;
  guarantee: number;
  memo: string | null;
  created_at?: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    event_date: new Date().toISOString().split("T")[0],
    event_name: "",
    location: "",
    description: "",
    staff: "",
    trial_participants: "",
    has_trial_fee: false,
    guarantee: "",
    memo: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchEvents = async () => {
    setLoading(true);
    const startDate = `${selectedMonth}-01`;
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${selectedMonth}-${lastDay}`;

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("イベント取得エラー:", error);
      showToast("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = (date.getMonth() + 1).toString().padStart(2, "0");
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        event_date: formData.event_date,
        event_name: formData.event_name || null,
        location: formData.location || null,
        description: formData.description || null,
        staff: formData.staff || null,
        trial_participants: Number(formData.trial_participants) || 0,
        has_trial_fee: formData.has_trial_fee,
        guarantee: Number(formData.guarantee) || 0,
        memo: formData.memo || null,
      };

      if (formData.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", formData.id);
        if (error) throw error;
        showToast("イベント情報を更新しました");
      } else {
        const { error } = await supabase.from("events").insert([payload]);
        if (error) throw error;
        showToast("イベントを登録しました");
      }

      closeModal();
      fetchEvents();
    } catch (error) {
      console.error("保存エラー:", error);
      showToast("保存に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    if (!confirm("本当にこのイベントを削除しますか？")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", formData.id);
      if (error) throw error;
      showToast("イベントを削除しました");
      closeModal();
      fetchEvents();
    } catch (error) {
      console.error("削除エラー:", error);
      showToast("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const openModalForNew = () => {
    setFormData({
      id: "",
      event_date: new Date().toISOString().split("T")[0],
      event_name: "",
      location: "",
      description: "",
      staff: "",
      trial_participants: "",
      has_trial_fee: false,
      guarantee: "",
      memo: "",
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (ev: EventRecord) => {
    setFormData({
      id: ev.id,
      event_date: ev.event_date,
      event_name: ev.event_name || "",
      location: ev.location || "",
      description: ev.description || "",
      staff: ev.staff || "",
      trial_participants: (ev.trial_participants || 0).toString(),
      has_trial_fee: ev.has_trial_fee || false,
      guarantee: (ev.guarantee || 0).toString(),
      memo: ev.memo || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // サマリー計算
  const totalEvents = events.length;
  const totalTrialParticipants = events.reduce((sum, e) => sum + (e.trial_participants || 0), 0);
  const totalGuarantee = events.reduce((sum, e) => sum + (e.guarantee || 0), 0);

  const summaryCards = [
    {
      label: "イベント数",
      value: `${totalEvents}`,
      unit: "件",
      color: "#818cf8",
      borderColor: "#6366f1",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: "体験参加人数",
      value: `${totalTrialParticipants}`,
      unit: "人",
      color: "#38bdf8",
      borderColor: "#0ea5e9",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
    },
    {
      label: "ギャラ合計",
      value: `¥${totalGuarantee.toLocaleString()}`,
      unit: "",
      color: "#fbbf24",
      borderColor: "#f59e0b",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-10 bg-slate-950 min-h-screen text-slate-200 selection:bg-violet-500/30">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[200] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900 border border-slate-700/50 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
            <span className="text-sm font-black tracking-widest uppercase text-slate-100">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-[2px] bg-violet-600"></span>
            <p className="text-violet-500 text-[10px] font-black tracking-[0.4em] uppercase">EVENT MANAGEMENT</p>
          </div>
          <h1 className="text-3xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
            イベント情報 <span className="text-slate-700 block md:inline md:ml-2">/ Events</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button
            onClick={openModalForNew}
            className="flex-1 lg:flex-none px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black tracking-[0.1em] transition-all active:scale-95 shadow-[0_5px_15px_rgba(124,58,237,0.3)] flex items-center justify-center gap-2 uppercase"
          >
            新規イベント登録 <span className="text-base leading-none">+</span>
          </button>
        </div>
      </header>

      {/* Monthly Summary Section */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/50 flex items-center justify-center text-violet-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </span>
            <h2 className="text-xl font-black italic tracking-widest text-slate-200 uppercase">
              月間サマリー <span className="text-slate-600 text-sm ml-2">Monthly Summary</span>
            </h2>
          </div>

          {/* Month Selector */}
          <div className="inline-flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl w-fit">
            <label className="pl-4 text-[10px] font-black text-white uppercase tracking-widest hidden sm:block">表示月</label>
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
                className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-violet-400 font-mono font-bold focus:ring-2 focus:ring-violet-500 outline-none transition-all cursor-pointer h-10 text-sm"
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

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="relative group bg-slate-900 border rounded-2xl p-5 md:p-6 overflow-hidden hover:scale-[1.02] transition-all duration-300"
              style={{ borderColor: `${card.borderColor}40` }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 opacity-20 group-hover:opacity-40 transition-opacity duration-700"
                style={{ backgroundColor: card.color }}
              ></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.borderColor}20`, color: card.color }}
                  >
                    {card.icon}
                  </span>
                  <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: card.color }}>
                    {card.label}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl md:text-3xl font-black font-mono tracking-tighter text-white">
                    {card.value}
                  </span>
                  {card.unit && (
                    <span className="text-xs font-bold text-slate-500">{card.unit}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-12"></div>

      {/* Events List */}
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-8 py-10 border-b border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h3 className="text-xl font-black italic tracking-[0.1em] text-white flex items-center gap-4">
              イベント一覧
              <span className="inline-block w-20 h-[1px] bg-slate-800"></span>
            </h3>
            <p className="text-[10px] text-white font-bold uppercase mt-1 tracking-widest">{selectedMonth} のイベントを表示中</p>
          </div>
          <div className="px-6 py-3 bg-slate-800/80 rounded-full border border-slate-700/50 text-[10px] font-black font-mono text-white tracking-widest uppercase">
            {events.length} 件のイベント
          </div>
        </div>

        {/* Event Cards */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-800 border-t-violet-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-slate-300 tracking-[0.5em] uppercase">読み込み中...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase italic">この月のイベントはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => openModalForEdit(ev)}
                  className="group bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800 hover:border-violet-500/30 rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-[0_10px_40px_rgba(124,58,237,0.1)]"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Date & Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Date Badge */}
                      <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex flex-col items-center justify-center group-hover:bg-violet-600/25 transition-colors">
                        <span className="text-[10px] font-black text-violet-400 tracking-wider uppercase">
                          {new Date(ev.event_date + "T00:00:00").toLocaleString("ja-JP", { month: "short" })}
                        </span>
                        <span className="text-xl md:text-2xl font-black text-white leading-none">
                          {new Date(ev.event_date + "T00:00:00").getDate()}
                        </span>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base font-black text-white group-hover:text-violet-200 transition-colors truncate">
                          {ev.event_name || ev.description || "イベント"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {ev.location && (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                              {ev.location}
                            </span>
                          )}
                          {ev.staff && (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                              {ev.staff}
                            </span>
                          )}
                          {ev.description && ev.event_name && (
                            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">
                              {ev.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                      {/* Trial */}
                      <div className="text-center bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700/30">
                        <p className="text-[8px] font-black text-slate-500 tracking-wider uppercase mb-0.5">体験</p>
                        <p className="text-sm md:text-base font-black font-mono text-sky-400">{ev.trial_participants || 0}<span className="text-[9px] text-slate-500 ml-0.5">人</span></p>
                      </div>
                      {/* Trial Fee Badge */}
                      <div className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                          ev.has_trial_fee
                            ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                            : "text-slate-500 border-slate-700 bg-slate-800/50"
                        }`}>
                          {ev.has_trial_fee ? "体験有料" : "体験無料"}
                        </span>
                      </div>
                      {/* Guarantee */}
                      <div className="text-right min-w-[80px]">
                        <p className="text-[8px] font-black text-slate-500 tracking-wider uppercase mb-0.5">ギャラ</p>
                        <p className="text-base md:text-lg font-black font-mono text-amber-400 tracking-tighter">
                          ¥{(ev.guarantee || 0).toLocaleString()}
                        </p>
                      </div>
                      {/* Edit Icon */}
                      <div className="hidden md:block">
                        <div className="p-2 text-slate-600 group-hover:text-violet-400 transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Entry/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={closeModal}></div>

          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-t-[2rem] md:rounded-[2.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.8)] overflow-hidden max-h-[95vh] md:max-h-[90vh] overflow-y-auto scale-in animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-violet-600/10 to-transparent">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">
                  {formData.id ? "イベント編集" : "新規イベント登録"}
                </h2>
                <p className="text-[10px] font-black text-violet-500/70 tracking-widest uppercase mt-1">
                  {formData.id ? "既存のイベント情報を修正します" : "新しいイベントを登録します"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all active:scale-90 shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8">
              {/* Date */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">日付</label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                />
              </div>

              {/* Event Name */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">イベント名</label>
                <input
                  type="text"
                  required
                  placeholder="例: BMX体験会 in ○○公園"
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Location */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">開催場所</label>
                <input
                  type="text"
                  placeholder="例: ○○公園スケートパーク"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Description */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">内容</label>
                <input
                  type="text"
                  placeholder="例: イベント出演、体験会開催など"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Staff */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">参加スタッフ</label>
                <input
                  type="text"
                  placeholder="例: 田中、佐藤、鈴木"
                  value={formData.staff}
                  onChange={(e) => setFormData({ ...formData, staff: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Trial Participants */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">体験参加人数</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.trial_participants}
                    onChange={(e) => setFormData({ ...formData, trial_participants: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 pr-12 text-white font-mono font-black text-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">人</span>
                </div>
              </div>

              {/* Trial Fee Toggle */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">体験費用</label>
                <div
                  onClick={() => setFormData({ ...formData, has_trial_fee: !formData.has_trial_fee })}
                  className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 cursor-pointer hover:bg-slate-700/50 transition-all group"
                >
                  <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 ${formData.has_trial_fee ? "bg-amber-500" : "bg-slate-600"}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${formData.has_trial_fee ? "left-7" : "left-1"}`}></div>
                  </div>
                  <div>
                    <p className={`text-sm font-black transition-colors ${formData.has_trial_fee ? "text-amber-400" : "text-slate-400"}`}>
                      {formData.has_trial_fee ? "体験費用あり" : "体験費用なし（無料）"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                      タップして切り替え
                    </p>
                  </div>
                </div>
              </div>

              {/* Guarantee */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">ギャラ (¥)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-black text-xl">¥</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.guarantee}
                    onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-6 py-5 text-white font-mono font-black text-2xl focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Memo */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase ml-1">メモ・備考</label>
                <textarea
                  placeholder="補足情報を入力してください..."
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-xs focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-700 min-h-[100px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-5 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl tracking-[0.3em] shadow-[0_20px_50px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98] uppercase text-xs"
                >
                  {formData.id ? "更新する" : "イベントを登録する"}
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
