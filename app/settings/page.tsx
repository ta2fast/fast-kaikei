"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
    const [sessionFee, setSessionFee] = useState<number>(1000);
    const [rentalBikeFee, setRentalBikeFee] = useState<number>(1000);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
            if (error && error.code !== 'PGRST116') throw error; // Ignore not found, we'll upsert anyway
            if (data) {
                setSessionFee(data.session_fee || 1000);
                setRentalBikeFee(data.rental_bike_fee || 1000);
            }
        } catch (error: any) {
            console.error("設定取得エラー:", error);
            showToast("設定の読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase.from('system_settings').upsert({
                id: 1,
                session_fee: sessionFee,
                rental_bike_fee: rentalBikeFee,
                updated_at: new Date().toISOString()
            });

            if (error) throw error;
            showToast("設定を保存しました");
        } catch (error: any) {
            console.error("設定保存エラー:", error);
            showToast("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-white relative">
            {/* トースト通知 */}
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <span className="text-blue-500">✔</span>
                    <span className="font-bold text-sm tracking-widest">{toastMessage}</span>
                </div>
            )}

            {/* ヘッダー */}
            <div className="mb-6 md:mb-10">
                <p className="text-slate-400 text-xs font-black tracking-[0.2em] mb-1 uppercase">System Configuration</p>
                <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                    システム設定 <span className="text-slate-600 block md:inline md:ml-2">/ Settings</span>
                </h1>
            </div>

            {loading ? (
                <div className="p-20 text-slate-500 text-center font-mono animate-pulse tracking-widest uppercase text-xs">
                    Loading settings...
                </div>
            ) : (
                <div className="max-w-2xl bg-slate-900/50 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl backdrop-blur-sm">
                    
                    <div className="mb-8 border-b border-slate-800/80 pb-8">
                        <h2 className="text-lg font-black text-slate-200 mb-2 flex items-center gap-2">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">FEE</span>
                            月謝（セッション料金）設定
                        </h2>
                        <p className="text-xs text-slate-500 font-bold mb-6">
                            1回の出席ごとに計算される基本料金を設定します。ここで設定された金額 × 出席日数が月謝画面で自動算出されます。（遅刻は0.5回分として計算されます）
                        </p>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    1回あたりの料金 (円)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">¥</span>
                                    <input 
                                        type="number"
                                        value={sessionFee}
                                        onChange={(e) => setSessionFee(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold text-lg rounded-xl pl-10 pr-4 py-3 h-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 border-b border-slate-800/80 pb-8">
                        <h2 className="text-lg font-black text-slate-200 mb-2 flex items-center gap-2">
                            <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs">RENTAL</span>
                            レンタルバイク月額料金
                        </h2>
                        <p className="text-xs text-slate-500 font-bold mb-6">
                            生徒名簿で「レンタルバイク有」と設定されている生徒に対して、毎月の自動計算請求額に上乗せされる月額レンタル料金を設定します。
                        </p>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    レンタル月額料金 (円)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">¥</span>
                                    <input 
                                        type="number"
                                        value={rentalBikeFee}
                                        onChange={(e) => setRentalBikeFee(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold text-lg rounded-xl pl-10 pr-4 py-3 h-12 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition-all active:scale-95 w-full md:w-auto h-12"
                        >
                            {isSaving ? '保存中...' : '設定を保存'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
