"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TeachersPage() {
    const [instructors, setInstructors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInstructors() {
            // テーブル名を 'instructors' に修正
            const { data, error } = await supabase
                .from("instructors")
                .select("*")
                .order('id', { ascending: true });

            if (error) {
                console.error("講師データ取得エラー:", error);
            } else if (data) {
                setInstructors(data);
            }
            setLoading(false);
        }
        fetchInstructors();
    }, []);

    if (loading) return <div className="p-10 text-white text-center tracking-widest text-xl font-black italic">読み込み中...</div>;

    return (
        <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-white">
            <div className="mb-6 md:mb-10">
                <p className="text-emerald-500 text-sm font-bold mb-1 uppercase tracking-widest">F.A.S.T. BMX SCHOOL</p>
                <h1 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                    講師・スタッフ管理 <span className="text-slate-700 block md:inline md:ml-2">/ Instructors</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instructors.length > 0 ? (
                    instructors.map((instructor) => (
                        <div key={instructor.id} className="group p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all shadow-xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-xl font-black border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors shadow-inner">
                                    {instructor.name?.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">{instructor.name}</h2>
                                    <p className="text-xs text-emerald-500 font-mono uppercase tracking-widest font-black">
                                        {instructor.role || "講師・スタッフ"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 text-slate-300">
                                    <span className="text-[10px] font-black bg-slate-800 px-2 py-1 rounded text-slate-400 w-16 text-center tracking-tighter">メール</span>
                                    <span className="truncate text-slate-100 font-medium">{instructor.email || "---"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-300">
                                    <span className="text-[10px] font-black bg-slate-800 px-2 py-1 rounded text-slate-400 w-16 text-center tracking-tighter">電話</span>
                                    <span className="font-mono text-slate-100 font-medium">{instructor.phone || "---"}</span>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-800">
                                    <p className="text-[10px] text-slate-400 font-black mb-2 uppercase tracking-widest">担当・専門 / SPECIALTY</p>
                                    <p className="text-slate-300 text-xs leading-relaxed font-bold">
                                        {instructor.bio || instructor.memo || "担当クラスの詳細情報は未設定です。"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 font-bold uppercase tracking-widest italic">
                        講師データが見つかりません。
                    </div>
                )}
            </div>
        </div>
    );
}