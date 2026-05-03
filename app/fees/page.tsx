"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
    id: string;
    name: string;
    monthly_fee: number;
    has_rental_bike: boolean;
};

type Attendance = {
    id: string;
    student_id: string;
    date: string;
    status: string;
};

type MonthlyPayment = {
    id?: string;
    student_id: string;
    month: string;
    amount: number;
    status: 'unbilled' | 'billed' | 'paid';
    memo: string;
};

export default function FeesPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [payments, setPayments] = useState<Record<string, MonthlyPayment>>({});
    const [sessionFee, setSessionFee] = useState<number>(1000);
    const [rentalBikeFee, setRentalBikeFee] = useState<number>(1000);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Students
            const { data: stds, error: stdError } = await supabase.from('students').select('id, name, monthly_fee, has_rental_bike').eq('is_active', true).order('name');
            if (stdError) throw stdError;
            setStudents(stds || []);

            // Calculation for last day of month
            const [year, month] = selectedMonth.split("-").map(Number);
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `${selectedMonth}-01`;
            const endDate = `${selectedMonth}-${lastDay}`;

            // Attendance for month
            try {
                const { data: atts, error: attError } = await supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate);
                if (attError) throw attError;
                setAttendance(atts || []);
            } catch (err) {
                console.error("Attendance fetch error:", err);
            }

            // Existing payments
            try {
                const { data: pmts, error: pmtError } = await supabase.from('tuition_payments').select('*').eq('month', selectedMonth);
                if (pmtError) throw pmtError;
                const paymentMap: Record<string, MonthlyPayment> = {};
                pmts?.forEach(p => { paymentMap[p.student_id] = p; });
                setPayments(paymentMap);
            } catch (err) {
                console.error("Payments fetch error:", err);
            }
            
            // System Settings
            try {
                const { data: sys, error: sysError } = await supabase.from('system_settings').select('*').eq('id', 1).single();
                if (sysError && sysError.code !== 'PGRST116') throw sysError;
                if (sys) {
                    setSessionFee(sys.session_fee || 1000);
                    setRentalBikeFee(sys.rental_bike_fee || 1000);
                }
            } catch (err) {
                console.error("Settings fetch error:", err);
            }

        } catch (error: any) {
            console.error("Data fetch error:", error);
            showToast("データの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const changeMonth = (offset: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + offset, 1);
        const newYear = date.getFullYear();
        const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        setSelectedMonth(`${newYear}-${newMonth}`);
    };

    const sessionDates = [...new Set(attendance.map(a => a.date))].sort().slice(0, 5);

    const getAttendanceCount = (studentId: string) => {
        const records = attendance.filter(a => a.student_id === studentId && sessionDates.includes(a.date));
        
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

    const calculateExpectedAmount = (student: Student) => {
        const attCount = getAttendanceCount(student.id);
        let amount = Math.round(attCount * sessionFee);
        if (student.has_rental_bike) {
            amount += rentalBikeFee;
        }
        return amount;
    };

    const syncMonthlyTuitionTransaction = async (monthStr: string, updatedPayments: Record<string, MonthlyPayment>) => {
        const [yearStr, monthStr2] = monthStr.split('-');
        const monthNum = parseInt(monthStr2, 10);
        const consolidatedTitle = `${yearStr}年${monthNum}月分月謝`;
        const txDate = `${monthStr}-01`;

        // この月のpaid状態の生徒の合計を算出
        const paidStudents = students.filter(s => {
            const p = updatedPayments[s.id];
            return p && p.status === 'paid';
        });
        const totalAmount = paidStudents.reduce((sum, s) => {
            const p = updatedPayments[s.id];
            return sum + (p?.amount || 0);
        }, 0);

        // 旧フォーマット（個別）のレコードをすべて削除
        for (const s of students) {
            const oldTitle1 = `月謝 (${s.name})`;
            const oldTitle2 = `${monthNum}月分月謝 (${s.name})`;
            const oldDesc = `${monthStr}分 月謝支払い`;
            await supabase.from('transactions').delete()
                .eq('category', 'school')
                .eq('title', oldTitle1)
                .eq('description', oldDesc);
            await supabase.from('transactions').delete()
                .eq('category', 'school')
                .eq('title', oldTitle2)
                .eq('description', oldDesc);
        }

        // 統合レコードを削除してから再作成
        await supabase.from('transactions').delete()
            .eq('category', 'school')
            .eq('title', consolidatedTitle)
            .eq('date', txDate);
        // 旧フォーマット（年なし）の統合レコードも削除
        const oldConsolidatedTitle = `${monthNum}月分月謝`;
        await supabase.from('transactions').delete()
            .eq('category', 'school')
            .eq('title', oldConsolidatedTitle)
            .eq('date', txDate);

        if (totalAmount > 0 && paidStudents.length > 0) {
            const paidNames = paidStudents.map(s => s.name).join('、');
            const description = `受領済み ${paidStudents.length}名: ${paidNames}`;
            const { error: transError } = await supabase.from('transactions').insert({
                date: txDate,
                title: consolidatedTitle,
                amount: totalAmount,
                category: 'school',
                description: description
            });
            if (transError) {
                console.error("Transaction sync error:", transError);
                showToast("月謝は保存されましたが、会計への同期に失敗しました");
                return false;
            }
        }
        return true;
    };

    const handleSave = async (studentId: string, updates: Partial<MonthlyPayment>) => {
        setIsSaving(true);
        const student = students.find(s => s.id === studentId);
        const expectedAmount = student ? calculateExpectedAmount(student) : 0;
        const defaultMemo = student?.has_rental_bike ? `レンタルバイク利用 (+¥${rentalBikeFee.toLocaleString()})` : '';
        const current = payments[studentId] || { 
            student_id: studentId, 
            month: selectedMonth, 
            amount: expectedAmount, 
            status: 'unbilled', 
            memo: defaultMemo 
        };
        const updated = { ...current, ...updates };

        try {
            const { data, error } = await supabase.from('tuition_payments').upsert(updated).select().single();
            if (error) throw error;

            const newPayments = { ...payments, [studentId]: data };
            setPayments(newPayments);

            if (updates.status === 'paid' || updates.status === 'billed') {
                const synced = await syncMonthlyTuitionTransaction(selectedMonth, newPayments);
                if (updates.status === 'paid') {
                    showToast(synced ? "受取完了 ＆ 会計ページに反映しました" : "月謝は保存されましたが、会計への同期に失敗しました");
                } else {
                    showToast("ステータスを戻し、会計から取り消しました");
                }
            } else {
                showToast("保存しました");
            }
        } catch (error: any) {
            console.error("Save error:", error);
            showToast("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBatchConfirm = async () => {
        setIsSaving(true);
        const toUpsert = students.map(s => {
            const expectedAmount = calculateExpectedAmount(s);
            const defaultMemo = s.has_rental_bike ? `レンタルバイク利用 (+¥${rentalBikeFee.toLocaleString()})` : '';
            const p = payments[s.id] || { 
                student_id: s.id, 
                month: selectedMonth, 
                amount: expectedAmount, 
                status: 'unbilled', 
                memo: defaultMemo 
            };
            if (p.status === 'unbilled') {
                return { ...p, status: 'billed' };
            }
            return null;
        }).filter(Boolean) as MonthlyPayment[];

        if (toUpsert.length === 0) {
            showToast("確定対象の生徒はいません");
            setIsSaving(false);
            return;
        }

        try {
            const { error } = await supabase.from('tuition_payments').upsert(toUpsert);
            if (error) throw error;
            fetchData();
            showToast(`${toUpsert.length}名の月謝を確定しました`);
        } catch (error: any) {
            console.error("Batch error:", error);
            showToast("一括確定に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    const summary = students.reduce((acc, s) => {
        const expectedAmount = calculateExpectedAmount(s);
        const p = payments[s.id];
        const amount = p?.amount !== undefined ? p.amount : expectedAmount;
        acc.totalBilledForecast += amount;
        if (p?.status === 'paid') {
            acc.paidCount++;
            acc.totalPaid += amount;
        } else if (p?.status === 'billed') {
            acc.billedUnpaidCount++;
        } else {
            acc.unbilledCount++;
        }
        return acc;
    }, { totalBilledForecast: 0, totalPaid: 0, paidCount: 0, billedUnpaidCount: 0, unbilledCount: 0 });

    // 月謝確定済み判定
    const isMonthConfirmed = Object.values(payments).some(
        (p) => p.status === 'billed' || p.status === 'paid'
    );
    const isAllPaid = students.length > 0 && students.every(s => payments[s.id]?.status === 'paid');

    return (
        <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-white relative">
            {/* トースト通知 */}
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <span className="text-emerald-500">✔</span>
                    <span className="font-bold text-sm tracking-widest">{toastMessage}</span>
                </div>
            )}

            {/* ヘッダー */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 md:gap-6">
                <div>
                    <p className="text-emerald-500 text-xs font-black tracking-[0.2em] mb-1 uppercase">Billing System</p>
                    <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase leading-none">月謝管理 <span className="text-slate-600 block md:inline md:ml-2">/ Fees & Billing</span></h1>
                </div>


            </div>

            {/* サマリーダッシュボード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-slate-900/50 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-800/50 backdrop-blur-sm">
                    <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase mb-2">総請求額</p>
                    <div className="flex items-end gap-2">
                        <span className="text-xl md:text-3xl font-black italic tracking-tighter">¥{summary.totalBilledForecast.toLocaleString()}</span>
                        <span className="text-slate-600 text-xs mb-1 font-bold">/ Month</span>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-800/50 backdrop-blur-sm border-l-emerald-500/50 border-l-4">
                    <p className="text-emerald-500 text-[10px] font-black tracking-widest uppercase mb-2">受取済み</p>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-xl md:text-3xl font-black italic tracking-tighter text-emerald-400">¥{summary.totalPaid.toLocaleString()}</span>
                        <span className="text-slate-600 text-xs mb-1 font-bold">Received</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            style={{ width: `${(summary.paidCount / (students.length || 1)) * 100}%` }}
                        />
                    </div>
                    <p className="text-right text-[10px] mt-1 text-slate-500 font-bold tracking-widest">{summary.paidCount} / {students.length} 名</p>
                </div>
                <div className="bg-slate-900/50 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-800/50 backdrop-blur-sm">
                    <p className="text-amber-500 text-[10px] font-black tracking-widest uppercase mb-2">受取待ち</p>
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-xl md:text-2xl font-black italic tracking-tighter text-amber-400">{summary.billedUnpaidCount}</span>
                            <span className="text-slate-600 text-[9px] block font-bold leading-none uppercase">未受取</span>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-800" />
                        <div>
                            <span className="text-xl md:text-2xl font-black italic tracking-tighter text-slate-500">{summary.unbilledCount}</span>
                            <span className="text-slate-600 text-[9px] block font-bold leading-none uppercase">出欠未確定</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 月謝確定済みバナー */}
            {isMonthConfirmed && (
                <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
                    isAllPaid
                        ? 'bg-emerald-900/20 border-emerald-700/40'
                        : 'bg-amber-900/20 border-amber-700/40'
                }`}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isAllPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                            {isAllPaid ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            )}
                        </div>
                        <div>
                            <p className={`text-xs font-black tracking-widest uppercase ${
                                isAllPaid ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                                {isAllPaid
                                    ? `✅ ${selectedMonth} — 全員の受け取りが完了しています`
                                    : `📋 ${selectedMonth} — 月謝が確定済みです。各生徒の受け取りを確認してください`
                                }
                            </p>
                            {!isAllPaid && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {summary.billedUnpaidCount}名が未受取 / {summary.paidCount}名が受取済み
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* フィルター & 月次選択 */}
            <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-4 bg-slate-900/50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-800/50 backdrop-blur-sm mb-6 md:mb-8">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="text-[10px] md:text-xs text-slate-200 font-bold uppercase tracking-widest font-black italic shrink-0">表示月:</span>
                    <div className="flex items-center gap-1 md:gap-2 flex-1">
                        <button 
                            onClick={() => changeMonth(-1)}
                            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-all active:scale-90 shrink-0"
                        >←</button>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-slate-800 border border-slate-700 px-3 md:px-4 py-2 rounded-lg text-emerald-400 font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none flex-1 min-w-0 md:w-[180px]"
                        />
                        <button 
                            onClick={() => changeMonth(1)}
                            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-all active:scale-90 shrink-0"
                        >→</button>
                    </div>
                </div>
            </div>

            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block overflow-x-auto bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl relative">
                {loading ? (
                    <div className="p-20 text-emerald-400 text-center font-mono animate-pulse tracking-widest uppercase text-xs">Loading Fee Records...</div>
                ) : (
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-800 text-[10px] tracking-widest uppercase font-black divide-x divide-slate-700">
                                <th className="p-6 text-left w-[250px] text-white">生徒名 / NAME</th>
                                <th className="p-6 text-center w-[120px]">出席数</th>
                                <th className="p-6 text-right w-[150px]">基本料金(1回)</th>
                                <th className="p-6 text-right w-[150px]">請求金額</th>
                                <th className="p-6 text-center w-[150px]">ステータス</th>
                                <th className="p-6 text-left">備考 / MEMO</th>
                                <th className="p-6 text-right w-[150px]">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {students.map((student) => {
                                const attCount = getAttendanceCount(student.id);
                                const expectedAmount = calculateExpectedAmount(student);
                                const defaultMemo = student.has_rental_bike ? `レンタルバイク利用 (+¥${rentalBikeFee.toLocaleString()})` : '';
                                const p = payments[student.id] || { student_id: student.id, month: selectedMonth, amount: expectedAmount, status: 'unbilled', memo: defaultMemo };
                                
                                return (
                                    <tr key={student.id} className="group hover:bg-slate-800/30 transition-all text-sm divide-x divide-slate-800/30">
                                        <td className="p-6 font-bold text-white whitespace-nowrap">
                                            {student.name}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${attCount > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                                {attCount.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right text-slate-500 font-mono italic">
                                            ¥{sessionFee.toLocaleString()}
                                        </td>
                                        <td className="p-6 text-right">
                                            <input 
                                                type="number"
                                                value={p.amount}
                                                onChange={(e) => setPayments(prev => ({ ...prev, [student.id]: { ...p, amount: Number(e.target.value) } }))}
                                                onBlur={() => handleSave(student.id, { amount: p.amount })}
                                                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-mono font-bold text-right w-24 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-6 text-center">
                                            {p.status === 'paid' ? (
                                                <span className="inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]">領収済</span>
                                            ) : p.status === 'billed' ? (
                                                <span className="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">請求確定</span>
                                            ) : (
                                                <span className="inline-block bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">出欠未確定</span>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <input 
                                                type="text"
                                                value={p.memo}
                                                placeholder="メモを入力..."
                                                onChange={(e) => setPayments(prev => ({ ...prev, [student.id]: { ...p, memo: e.target.value } }))}
                                                onBlur={() => handleSave(student.id, { memo: p.memo })}
                                                className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 outline-none w-full text-slate-400 text-xs transition-colors"
                                            />
                                        </td>
                                        <td className="p-4 text-right">
                                            {p.status === 'billed' && (
                                                <button 
                                                    onClick={() => handleSave(student.id, { status: 'paid' })}
                                                    disabled={isSaving}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                    受け取り確認
                                                </button>
                                            )}
                                            {p.status === 'paid' && (
                                                <button 
                                                    onClick={() => handleSave(student.id, { status: 'billed' })}
                                                    className="px-3 py-1.5 text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg text-xs transition-all"
                                                    title="ステータスを戻す"
                                                >↩ 戻す</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* モバイル: カード表示 */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="p-12 text-emerald-400 text-center font-mono animate-pulse tracking-widest uppercase text-xs">Loading...</div>
                ) : students.map((student) => {
                    const attCount = getAttendanceCount(student.id);
                    const expectedAmount = calculateExpectedAmount(student);
                    const defaultMemo = student.has_rental_bike ? `レンタルバイク利用 (+¥${rentalBikeFee.toLocaleString()})` : '';
                    const p = payments[student.id] || { student_id: student.id, month: selectedMonth, amount: expectedAmount, status: 'unbilled', memo: defaultMemo };

                    return (
                        <div key={student.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 backdrop-blur-sm shadow-xl">
                            {/* ヘッダー: 名前 + ステータス */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-white text-sm">{student.name}</span>
                                {p.status === 'paid' ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest">領収済</span>
                                ) : p.status === 'billed' ? (
                                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest">請求確定</span>
                                ) : (
                                    <span className="bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest">出欠未確定</span>
                                )}
                            </div>

                            {/* 数値情報 */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="bg-slate-950/50 rounded-xl p-2.5 text-center">
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">出席数</p>
                                    <p className={`text-sm font-black font-mono ${attCount > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{attCount.toFixed(1)}</p>
                                </div>
                                <div className="bg-slate-950/50 rounded-xl p-2.5 text-center">
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">単価</p>
                                    <p className="text-sm font-mono text-slate-400 font-bold">¥{sessionFee.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-950/50 rounded-xl p-2.5 text-center">
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">請求額</p>
                                    <p className="text-sm font-black font-mono text-white">¥{p.amount.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* メモ */}
                            <div className="mb-3">
                                <input 
                                    type="text"
                                    value={p.memo}
                                    placeholder="メモを入力..."
                                    onChange={(e) => setPayments(prev => ({ ...prev, [student.id]: { ...p, memo: e.target.value } }))}
                                    onBlur={() => handleSave(student.id, { memo: p.memo })}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-400 text-xs focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-700"
                                />
                            </div>

                            {/* 操作ボタン */}
                            <div className="flex gap-2">
                                {p.status === 'billed' && (
                                    <button 
                                        onClick={() => handleSave(student.id, { status: 'paid' })}
                                        disabled={isSaving}
                                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        受け取り確認
                                    </button>
                                )}
                                {p.status === 'paid' && (
                                    <button 
                                        onClick={() => handleSave(student.id, { status: 'billed' })}
                                        className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-black tracking-widest transition-all active:scale-95"
                                    >↩ 戻す</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
