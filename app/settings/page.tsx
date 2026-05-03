"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
    const [sessionFee, setSessionFee] = useState<number>(1000);
    const [rentalBikeFee, setRentalBikeFee] = useState<number>(1000);
    const [locations, setLocations] = useState<any[]>([]);
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
                setLocations(data.locations || []);
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
                locations: locations,
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

                    <div className="mb-8 border-b border-slate-800/80 pb-8">
                        <h2 className="text-lg font-black text-slate-200 mb-2 flex items-center gap-2">
                            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs">LOCATION</span>
                            開催場所リストの管理
                        </h2>
                        <p className="text-xs text-slate-500 font-bold mb-6">
                            出欠管理画面で表示される「開催場所」のプルダウン選択肢と、表示カラーを自由に追加・管理できます。
                        </p>
                        
                        <div className="space-y-4">
                            {locations.map((loc, index) => (
                                <div key={index} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl relative">
                                    <div className="flex-1">
                                        <input 
                                            type="text"
                                            value={loc.name}
                                            onChange={(e) => {
                                                const newLocs = [...locations];
                                                newLocs[index].name = e.target.value;
                                                setLocations(newLocs);
                                            }}
                                            placeholder="例: 武生中央公園"
                                            className="w-full bg-transparent text-white font-bold text-sm focus:outline-none placeholder:text-slate-700"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-slate-500'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => {
                                                    const newLocs = [...locations];
                                                    newLocs[index].color = color;
                                                    setLocations(newLocs);
                                                }}
                                                className={`w-6 h-6 rounded-full ${color} ${loc.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110' : 'opacity-50 hover:opacity-100'} transition-all`}
                                            />
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newLocs = locations.filter((_, i) => i !== index);
                                            setLocations(newLocs);
                                        }}
                                        className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors shrink-0"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => setLocations([...locations, { name: "", color: "bg-slate-500" }])}
                                className="w-full py-3 border border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <span>+</span> 開催場所を追加する
                            </button>
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
