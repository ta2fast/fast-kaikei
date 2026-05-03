"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AttendancePage() {
    const [students, setStudents] = useState<any[]>([]);
    const [instructors, setInstructors] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [daysInMonth, setDaysInMonth] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [currentLocation, setCurrentLocation] = useState("");
    
    // Fee-related state
    const [payments, setPayments] = useState<Record<string, any>>({});
    const [sessionFee, setSessionFee] = useState<number>(1000);
    const [rentalBikeFee, setRentalBikeFee] = useState<number>(1000);
    const [settingsLocations, setSettingsLocations] = useState<any[]>([]);
    
    // モーダル用の一時的な出欠状態 (ID -> status)
    const [pendingAttendance, setPendingAttendance] = useState<Record<string, string>>({});

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    // データの読み込み
    const fetchData = async () => {
        setLoading(true);

        const currentMonth = viewMode === 'daily' ? selectedDate.substring(0, 7) : selectedMonth;
        
        // その月の全日付を生成
        const [year, month] = currentMonth.split("-").map(Number);
        const date = new Date(year, month, 0);
        const daysCount = date.getDate();
        const days = Array.from({ length: daysCount }, (_, i) => {
            const day = i + 1;
            return `${currentMonth}-${day.toString().padStart(2, '0')}`;
        });
        setDaysInMonth(days);

        const startDate = `${currentMonth}-01`;
        const endDate = `${currentMonth}-${daysCount}`;

        try {
            const { data: stData, error: stError } = await supabase.from("students").select("id, name, has_rental_bike, monthly_fee").eq('is_active', true).order('name');
            if (stError) throw stError;
            
            const { data: instData, error: instError } = await supabase.from("instructors").select("id, name").order('id', { ascending: true });
            if (instError) throw instError;
            
            const { data: attData, error: attError } = await supabase
                .from("attendance")
                .select("*")
                .gte("date", startDate)
                .lte("date", endDate);

            if (attError) throw attError;

            // Existing payments
            const { data: pmtData, error: pmtError } = await supabase.from("tuition_payments").select("*").eq("month", currentMonth);
            if (!pmtError && pmtData) {
                const pmtMap: Record<string, any> = {};
                pmtData.forEach(p => { pmtMap[p.student_id] = p; });
                setPayments(pmtMap);
            }

            // Settings
            const { data: sysData, error: sysError } = await supabase.from("system_settings").select("*").eq("id", 1).single();
            if (!sysError && sysData) {
                setSessionFee(sysData.session_fee || 1000);
                setRentalBikeFee(sysData.rental_bike_fee || 1000);
                setSettingsLocations(sysData.locations || []);
            }

            if (stData) setStudents(stData);
            if (instData) setInstructors(instData);
            if (attData) {
                setAttendance(attData);
                // 現在の日付の場所をセット
                if (viewMode === 'daily') {
                    const dayRecord = attData.find(a => a.date === selectedDate);
                    setCurrentLocation(dayRecord?.location || "");
                }
            }
        } catch (error: any) {
            console.error("データ取得エラー:", error);
            showToast("データの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // モーダルを開く際、または日付変更時に一時的な状態を初期化
    useEffect(() => {
        if (isInputModalOpen) {
            const dayRecords = attendance.filter(a => a.date === selectedDate);
            const initialPending: Record<string, string> = {};
            dayRecords.forEach(r => {
                const id = r.student_id || r.instructor_id;
                if (id) initialPending[id] = r.status;
            });
            setPendingAttendance(initialPending);
            
            const dayLocation = dayRecords.find(a => a.location)?.location || "";
            setCurrentLocation(dayLocation);
        }
    }, [selectedDate, isInputModalOpen, attendance.length]);

    useEffect(() => {
        fetchData();
    }, [selectedMonth, viewMode]);

    // モーダル内でのステート変更のみ
    const handlePendingToggle = (personId: string) => {
        const current = pendingAttendance[personId];
        let next = 'present';
        if (current === 'present') next = 'late';
        else if (current === 'late') next = 'absent';
        else if (current === 'absent') next = ''; // toggle off
        
        setPendingAttendance(prev => ({
            ...prev,
            [personId]: next
        }));
    };

    // 一括保存
    const handleBatchSave = async () => {
        setIsSaving(true);
        try {
            // 1. その日の既存データを削除
            const { error: delError } = await supabase
                .from("attendance")
                .delete()
                .eq("date", selectedDate);
            if (delError) throw delError;

            // 2. pendingAttendanceから有効なものをバルクインサート
            const recordsToInsert = [];
            
            // 生徒
            for (const s of students) {
                const status = pendingAttendance[s.id];
                if (status) {
                    recordsToInsert.push({
                        student_id: s.id,
                        date: selectedDate,
                        status: status,
                        location: currentLocation
                    });
                }
            }
            
            // 講師
            for (const i of instructors) {
                const status = pendingAttendance[i.id];
                if (status) {
                    recordsToInsert.push({
                        instructor_id: i.id,
                        date: selectedDate,
                        status: status,
                        location: currentLocation
                    });
                }
            }

            if (recordsToInsert.length > 0) {
                const { error: insError } = await supabase.from("attendance").insert(recordsToInsert);
                if (insError) throw insError;
            }

            showToast("出欠情報を更新しました");
            await fetchData(); // 全体リロードして背景の表に反映
            setIsInputModalOpen(false);
        } catch (error: any) {
            console.error("保存エラー:", error);
            showToast("更新に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    const getLocationColor = (name: string) => {
        if (!name) return "bg-slate-700";
        const foundLoc = settingsLocations.find((l: any) => l.name === name);
        if (foundLoc && foundLoc.color) return foundLoc.color;

        const colors = [
            "bg-blue-500", "bg-emerald-500", "bg-violet-500", 
            "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const changeMonth = (offset: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + offset, 1);
        const newYear = date.getFullYear();
        const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        setSelectedMonth(`${newYear}-${newMonth}`);
    };

    const getAttendanceCount = (personId: string, isStudent: boolean) => {
        const records = attendance.filter(a => 
            (isStudent ? a.student_id === personId : a.instructor_id === personId) &&
            sessionDates.includes(a.date)
        );
        
        // 同じ日の重複レコードがある場合、優先度の高いステータスを採用
        // 出席(present) > 遅刻(late) > 欠席(absent)
        const priority: Record<string, number> = { 'present': 2, 'late': 1, 'absent': 0 };
        const dailyStatus: Record<string, string> = {};
        
        records.forEach(r => {
            const s = (r.status || '').trim().toLowerCase();
            const current = dailyStatus[r.date] || '';
            if (!current || (priority[s] || 0) > (priority[current] || 0)) {
                dailyStatus[r.date] = s;
            }
        });

        return Object.values(dailyStatus).reduce((acc, status) => {
            if (status === 'present') return acc + 1.0;
            if (status === 'late') return acc + 0.5;
            return acc;
        }, 0);
    };

    const handleConfirmMonth = async () => {
        // window.confirmがブロックされる環境対策として確認ダイアログは一旦スキップするか、カスタムモーダルを利用するのが理想ですが
        // 緊急措置としてconfirmを維持しつつ、もしエラーならスキップしないようにします
        const isConfirmed = typeof window !== 'undefined' ? window.confirm(`${selectedMonth}の出欠を確定し、月謝を計算しますか？\n\n確定後は出欠の編集ができなくなります。`) : true;
        if (!isConfirmed) return;
        
        setIsSaving(true);
        try {
            const toInsert = students.map(s => {
                const count = getAttendanceCount(s.id, true);
                let amount = Math.round(count * sessionFee);
                if (s.has_rental_bike) {
                    amount += rentalBikeFee;
                }
                const defaultMemo = s.has_rental_bike ? `レンタルバイク利用 (+¥${rentalBikeFee.toLocaleString()})` : '';
                return {
                    student_id: s.id,
                    month: selectedMonth,
                    amount: amount,
                    status: 'billed',
                    memo: defaultMemo
                };
            });

            if (toInsert.length > 0) {
                // 1. まず既存の同じ月の unbilled データなどを削除 (ユニーク制約エラー回避)
                await supabase
                    .from('tuition_payments')
                    .delete()
                    .eq('month', selectedMonth);

                // 2. 新規データとして挿入
                const { data: inserted, error } = await supabase
                    .from('tuition_payments')
                    .insert(toInsert)
                    .select();

                if (error) {
                    console.error("Insert error:", error);
                    throw new Error(error.message);
                }

                // 即時ステート更新でUIをロック
                const newPayments: Record<string, any> = { ...payments };
                if (inserted) {
                    inserted.forEach((r: any) => { newPayments[r.student_id] = r; });
                } else {
                    toInsert.forEach(r => { newPayments[r.student_id] = r; });
                }
                setPayments(newPayments);

                showToast("✅ 出欠・月謝を確定しました");
                await fetchData();
            } else {
                showToast("対象の生徒がいません");
            }
        } catch (err: any) {
            console.error("確定エラー:", err);
            showToast(`確定失敗: ${err.message || '不明なエラー'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnlockMonth = async () => {
        const hasPaid = Object.values(payments).some((p: any) => p.status === 'paid');
        if (hasPaid) {
            const force = window.confirm("既に支払済みの生徒がいます。ロックを解除すると月謝データと会計の同期がリセットされます。\n\n本当にロックを解除しますか？");
            if (!force) return;
        } else {
            const confirm = window.confirm(`${selectedMonth}の確定ロックを解除しますか？\n\n月謝管理の請求ステータスはリセットされます。`);
            if (!confirm) return;
        }

        setIsSaving(true);
        try {
            // 1. 月謝データの削除
            const { error } = await supabase
                .from('tuition_payments')
                .delete()
                .eq('month', selectedMonth);
            
            if (error) throw error;

            // 2. 会計レコードの削除（ある場合）
            const [yearStr, monthStr2] = selectedMonth.split('-');
            const yearNum = parseInt(yearStr, 10);
            const monthNum = parseInt(monthStr2, 10);
            const consolidatedTitle = `${yearStr}年${monthNum}月分月謝`;
            const oldConsolidatedTitle = `${monthNum}月分月謝`;

            await supabase.from('transactions').delete()
                .eq('category', 'school')
                .eq('title', consolidatedTitle);
                
            await supabase.from('transactions').delete()
                .eq('category', 'school')
                .eq('title', oldConsolidatedTitle);
            
            showToast("🔓 ロックを解除しました");
            await fetchData();
        } catch (err: any) {
            console.error("Unlock error:", err);
            showToast("ロック解除に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };


    const sessionDates = [...new Set(attendance.map(a => a.date))].sort().slice(0, 5);

    // 確定済み判定：tuition_paymentsにbilled/paidが1件でもあれば確定済み
    const isMonthConfirmed = Object.values(payments).some(
        (p: any) => p.status === 'billed' || p.status === 'paid'
    );

    return (
        <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-white relative">
            {/* トースト通知 */}
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <span className="text-blue-500">ℹ</span>
                    <span className="font-bold text-sm tracking-widest">{toastMessage}</span>
                </div>
            )}

            {/* ヘッダー */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 md:gap-6">
                <div>
                    <p className="text-blue-500 text-xs font-black tracking-[0.2em] mb-1 uppercase">Management System</p>
                    <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase leading-none">出欠管理 <span className="text-slate-600 block md:inline md:ml-2">/ Attendance</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    {isMonthConfirmed ? (
                        <button
                            onClick={handleUnlockMonth}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white px-5 py-2.5 rounded-2xl text-xs font-black tracking-[0.15em] transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="クリックしてロック解除"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span>編集ロック中 (解除)</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsInputModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center gap-2 justify-center"
                        >
                            <span>出欠入力</span>
                            <span className="bg-white/20 w-5 h-5 rounded-md flex items-center justify-center">+</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 月間表示セクション */}
            <div className="space-y-8">
                <div className="bg-slate-900/50 p-3 md:p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm space-y-3">
                    {/* 1行目：表示月切り替え */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-black italic shrink-0 uppercase tracking-widest">表示月</span>
                        <button 
                            onClick={() => changeMonth(-1)}
                            className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-all shadow-lg active:scale-90 text-sm shrink-0"
                        >
                            ←
                        </button>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-blue-400 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-0 text-sm"
                        />
                        <button 
                            onClick={() => changeMonth(1)}
                            className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-all shadow-lg active:scale-90 text-sm shrink-0"
                        >
                            →
                        </button>
                    </div>
                    {/* 2行目：月謝確定ボタン or 確定済みバッジ */}
                    {viewMode === 'monthly' && (
                        isMonthConfirmed ? (
                            <div className="flex gap-2 w-full">
                                <div className="flex-1 bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-black tracking-[0.15em] flex items-center gap-2 justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>この月の出欠・月謝は確定済みです</span>
                                </div>
                                <button
                                    onClick={handleUnlockMonth}
                                    disabled={isSaving}
                                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-colors flex items-center justify-center shrink-0 active:scale-95"
                                    title="ロック解除"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    <span className="ml-2 hidden md:inline">ロック解除</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConfirmMonth}
                                disabled={isSaving || loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black tracking-[0.15em] shadow-[0_10px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center gap-2 justify-center"
                            >
                                <span>出欠・月謝を確定する</span>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                        )
                    )}
                    <span className="text-[10px] text-slate-500 italic">* 月最大5回分まで表示しています</span>
                </div>

                {/* 確定済みバナー */}
                {isMonthConfirmed && (
                    <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <p className="text-[11px] font-black text-amber-400 tracking-widest uppercase">
                            この月は確定済みのため編集できません。月謝管理ページで内容を確認できます。
                        </p>
                    </div>
                )}

                <div className="overflow-x-auto bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl scrollbar-hide min-h-[400px] flex flex-col items-center justify-center">
                    {loading ? (
                        <div className="p-20 text-white text-center font-mono animate-pulse tracking-widest uppercase text-xs">Loading data...</div>
                    ) : sessionDates.length > 0 ? (
                        <table className="w-full border-collapse table-fixed min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-800 text-[10px] tracking-widest uppercase font-black divide-x divide-slate-700">
                                    <th className="sticky left-0 z-40 bg-slate-800 px-2 py-3 text-left border-b border-slate-700 w-[120px] md:w-[160px] text-white text-xs whitespace-nowrap">
                                        名前
                                    </th>
                                    {sessionDates.map(dateStr => {
                                        const dayRecords = attendance.filter(a => a.date === dateStr);
                                        const location = dayRecords.find(a => a.location)?.location || "不明";
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                                        
                                        return (
                                            <th key={dateStr} className={`p-0 border-b border-slate-700 w-[60px] md:w-[80px] text-center ${isToday ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-400'}`}>
                                                <button 
                                                    onClick={() => { if (!isMonthConfirmed) { setSelectedDate(dateStr); setIsInputModalOpen(true); } }}
                                                    disabled={isMonthConfirmed}
                                                    className={`w-full py-2 md:py-3 flex flex-col items-center justify-center gap-1 transition-colors group ${
                                                        isMonthConfirmed ? 'cursor-not-allowed opacity-70' : 'hover:bg-slate-700/50 cursor-pointer'
                                                    }`}
                                                    aria-label={isMonthConfirmed ? '確定済みのため編集不可' : '出欠を修正する'}
                                                >
                                                    <span className="text-[10px] md:text-xs font-mono leading-none opacity-80 flex items-center gap-1 group-hover:text-blue-300 transition-colors">
                                                        {dateStr.substring(5)}
                                                        {!isMonthConfirmed && (
                                                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                        )}
                                                    </span>
                                                    <div className="px-1 w-full">
                                                        <div className={`px-1 py-0.5 rounded text-[8px] md:text-[9px] font-black leading-tight text-white shadow-md w-full truncate ${getLocationColor(location)}`}>
                                                            {location}
                                                        </div>
                                                    </div>
                                                </button>
                                            </th>
                                        );
                                    })}
                                    {/* 5回に満たない場合の空カラム */}
                                    {Array.from({ length: 5 - sessionDates.length }).map((_, i) => (
                                        <th key={`empty-${i}`} className="p-0 border-b border-slate-700 w-[60px] md:w-[80px] text-slate-600 text-[10px] italic">
                                            <div className="w-full py-2 flex items-center justify-center">-</div>
                                        </th>
                                    ))}
                                    <th className="bg-slate-800 px-2 py-3 text-center border-b border-slate-700 w-[50px] md:w-[60px] text-white whitespace-nowrap">
                                        日数
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                <tr className="bg-slate-800/30 text-[10px]">
                                    <td colSpan={7} className="px-3 py-2 font-black text-blue-400 uppercase tracking-widest border-b border-slate-800">
                                        生徒
                                    </td>
                                </tr>
                                {students.map((student) => (
                                    <tr key={student.id} className="group hover:bg-slate-800/30 transition-all font-bold divide-x divide-slate-800/30">
                                        <td className="sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-800/50 px-2 py-2 border-b border-slate-800 text-white whitespace-nowrap overflow-hidden text-ellipsis transition-colors text-xs">
                                            {student.name}
                                        </td>
                                        {sessionDates.map(dateStr => {
                                            const record = attendance.find(a => a.student_id === student.id && a.date === dateStr);
                                            return (
                                                <td key={dateStr} className="p-0 border-b text-center">
                                                    <div className="w-full h-12 flex items-center justify-center">
                                                        <StatusIcon status={record?.status} size="sm" />
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        {Array.from({ length: 5 - sessionDates.length }).map((_, i) => (
                                            <td key={`empty-td-${i}`} className="p-0 border-b text-center">
                                                <div className="w-full h-12"></div>
                                            </td>
                                        ))}
                                        <td className="bg-slate-900/50 p-0 border-b text-center text-blue-400 font-black font-mono text-base italic">
                                            <div className="w-full h-12 flex items-center justify-center">
                                                {getAttendanceCount(student.id, true).toFixed(1)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                <tr className="bg-slate-800/30 text-[10px] text-left">
                                    <td colSpan={7} className="px-3 py-2 font-black text-emerald-400 uppercase tracking-widest border-b border-slate-800">
                                        講師
                                    </td>
                                </tr>
                                {instructors.map((inst) => (
                                    <tr key={inst.id} className="group hover:bg-slate-800/30 transition-all font-bold divide-x divide-slate-800/30">
                                        <td className="sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-800/50 px-2 py-2 border-b border-slate-800 text-white whitespace-nowrap overflow-hidden text-ellipsis transition-colors text-xs">
                                            {inst.name}
                                        </td>
                                        {sessionDates.map(dateStr => {
                                            const record = attendance.find(a => a.instructor_id === inst.id && a.date === dateStr);
                                            return (
                                                <td key={dateStr} className="p-0 border-b text-center">
                                                    <div className="w-full h-12 flex items-center justify-center">
                                                        <StatusIcon status={record?.status} size="sm" />
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        {Array.from({ length: 5 - sessionDates.length }).map((_, i) => (
                                            <td key={`empty-inst-td-${i}`} className="p-0 border-b text-center">
                                                <div className="w-full h-12"></div>
                                            </td>
                                        ))}
                                        <td className="bg-slate-900/50 p-0 border-b text-center text-emerald-400 font-black font-mono text-base italic">
                                            <div className="w-full h-12 flex items-center justify-center">
                                                {getAttendanceCount(inst.id, false).toFixed(1)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-4xl shadow-inner">📅</div>
                            <div>
                                <p className="font-black tracking-[0.2em] text-lg uppercase text-white mb-2">表示可能なデータがありません</p>
                                <p className="text-sm text-slate-500 italic max-w-md mx-auto">「出欠入力」ボタンから出席データを登録してください。</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 出欠入力モーダル (フォーム形式) */}
            {isInputModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4">
                    <div 
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => !isSaving && setIsInputModalOpen(false)}
                    ></div>
                    <div className="relative bg-slate-900 w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] overflow-hidden rounded-t-[2rem] md:rounded-[2.5rem] border border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 flex flex-col">
                        <div className="p-4 md:p-12 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-blue-500 text-[10px] font-black tracking-[0.3em] uppercase mb-1">Attendance Form</p>
                                    <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">出欠情報の入力フォーム</h2>
                                </div>
                                <button 
                                    onClick={() => !isSaving && setIsInputModalOpen(false)}
                                    className="bg-slate-800 hover:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 p-8 bg-slate-950/50 rounded-3xl border border-slate-800/50">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white uppercase tracking-widest italic ml-1">① 日付を選択</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl text-blue-400 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xl"
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white uppercase tracking-widest italic ml-1">② 開催場所</label>
                                    <input
                                        type="text"
                                        list="location-options"
                                        placeholder="例: 会場名、パーク名など"
                                        value={currentLocation}
                                        onChange={(e) => setCurrentLocation(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xl placeholder:text-slate-700"
                                    />
                                    <datalist id="location-options">
                                        {settingsLocations.map((loc: any) => (
                                            <option key={loc.name} value={loc.name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <h3 className="text-xl font-black text-blue-500 italic tracking-[0.1em] uppercase">Students / 生徒</h3>
                                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{students.length} persons</span>
                                    </div>
                                    <div className="space-y-2 md:space-y-3">
                                        {students.map(student => (
                                            <div key={student.id} className="group flex items-center justify-between p-3 md:p-4 bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all shadow-md">
                                                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 pl-2">
                                                    <span className="font-black text-slate-100 text-sm truncate">{student.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handlePendingToggle(student.id)}
                                                    className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-3 md:py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 transition-all active:scale-95 min-w-[120px] md:min-w-[150px] min-h-[48px] justify-between shadow-xl shrink-0"
                                                >
                                                    <StatusIcon status={pendingAttendance[student.id]} size="md" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                        pendingAttendance[student.id] === 'present' ? 'text-green-400' : 
                                                        pendingAttendance[student.id] === 'late' ? 'text-orange-400' : 
                                                        pendingAttendance[student.id] === 'absent' ? 'text-rose-500' : 'text-slate-700'
                                                    }`}>
                                                        {pendingAttendance[student.id] === 'present' ? '出席' : 
                                                         pendingAttendance[student.id] === 'late' ? '遅刻' : 
                                                         pendingAttendance[student.id] === 'absent' ? '欠席' : '未入力'}
                                                    </span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <h3 className="text-xl font-black text-emerald-500 italic tracking-[0.1em] uppercase">Instructors / 講師</h3>
                                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{instructors.length} persons</span>
                                    </div>
                                    <div className="space-y-2 md:space-y-3">
                                        {instructors.map(inst => (
                                            <div key={inst.id} className="group flex items-center justify-between p-3 md:p-4 bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all shadow-md">
                                                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 pl-2">
                                                    <span className="font-black text-slate-100 text-sm truncate">{inst.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handlePendingToggle(inst.id)}
                                                    className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-3 md:py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 transition-all active:scale-95 min-w-[120px] md:min-w-[150px] min-h-[48px] justify-between shadow-xl shrink-0"
                                                >
                                                    <StatusIcon status={pendingAttendance[inst.id]} size="md" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                        pendingAttendance[inst.id] === 'present' ? 'text-green-400' : 
                                                        pendingAttendance[inst.id] === 'late' ? 'text-orange-400' : 
                                                        pendingAttendance[inst.id] === 'absent' ? 'text-rose-500' : 'text-slate-700'
                                                    }`}>
                                                        {pendingAttendance[inst.id] === 'present' ? '出席' : 
                                                         pendingAttendance[inst.id] === 'late' ? '遅刻' : 
                                                         pendingAttendance[inst.id] === 'absent' ? '欠席' : '未入力'}
                                                    </span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* フッターアクション */}
                        <div className="p-4 md:p-8 bg-slate-950 border-t border-slate-800 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 shadow-inner">
                            <button
                                onClick={() => setIsInputModalOpen(false)}
                                disabled={isSaving}
                                className="px-6 md:px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs tracking-[0.2em] transition-all uppercase w-full md:w-auto"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleBatchSave}
                                disabled={isSaving}
                                className={`px-8 md:px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs tracking-[0.2em] md:tracking-[0.3em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] uppercase flex items-center justify-center gap-3 w-full md:w-auto ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSaving ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        保存中...
                                    </>
                                ) : (
                                    <>
                                        <span>出欠情報を更新する</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusIcon({ status, size = 'md' }: { status: string | undefined, size?: 'sm' | 'md' }) {
    const dimension = size === 'sm' ? 24 : 32;
    const strokeWidth = size === 'sm' ? 3 : 2.5;

    if (status === 'present') {
        return (
            <svg width={dimension} height={dimension} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-in zoom-in duration-300">
                <circle cx="12" cy="12" r="9" />
            </svg>
        );
    }
    if (status === 'late') {
        return (
            <svg width={dimension} height={dimension} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)] animate-in zoom-in duration-300">
                <path d="M12 3l9 16H3L12 3z" />
            </svg>
        );
    }
    if (status === 'absent') {
        return (
            <svg width={dimension} height={dimension} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-in zoom-in duration-300">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        );
    }
    return (
        <svg width={dimension} height={dimension} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="text-slate-800">
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}
