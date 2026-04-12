"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      // 画像で確認したカラム名に合わせてデータを取得
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order('name', { ascending: true });

      if (error) {
        console.error("データ取得エラー:", error);
      } else if (data) {
        setStudents(data);
      }
      setLoading(false);
    }
    fetchStudents();
  }, []);

  const toggleRentalBike = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('students').update({ has_rental_bike: !currentStatus }).eq('id', id);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === id ? { ...s, has_rental_bike: !currentStatus } : s));
    } catch (err) {
      console.error("レンタルバイク更新エラー:", err);
    }
  };

  if (loading) return <div className="p-10 text-white text-center text-xl tracking-widest font-black italic">読み込み中...</div>;

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 md:mb-10 gap-4">
        <div>
          <p className="text-blue-500 text-sm font-black mb-1 uppercase tracking-widest">F.A.S.T. BMX SCHOOL</p>
          <h1 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
            生徒名簿マスター <span className="text-slate-700 block md:inline md:ml-2">/ Students</span>
          </h1>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-[10px] font-black block mb-2 uppercase tracking-[0.2em]">REGISTERED STUDENTS / 登録数</span>
          <span className="bg-blue-600 px-6 py-2 rounded-xl text-sm font-black shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
            {students.length} <span className="text-[10px] ml-1">名</span>
          </span>
        </div>
      </div>

      {/* デスクトップ: テーブル表示 */}
      <div className="hidden md:block overflow-x-auto rounded-[2rem] border border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-800/80 text-slate-300 text-[10px] uppercase tracking-[0.2em] font-black">
              <th className="p-6 border-b border-slate-700">氏名 / フリガナ</th>
              <th className="p-6 border-b border-slate-700">生年月日</th>
              <th className="p-6 border-b border-slate-700">住所</th>
              <th className="p-6 border-b border-slate-700">緊急連絡先 (続柄)</th>
              <th className="p-6 border-b border-slate-700">月謝設定</th>
              <th className="p-6 border-b border-slate-700 text-center">レンタルバイク</th>
              <th className="p-6 border-b border-slate-700 text-center">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {students.map((s) => (
              <tr key={s.id} className="group hover:bg-blue-900/10 transition-all duration-300">
                <td className="p-6">
                  <div className="font-bold text-blue-100 text-base">{s.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{s.furigana || s.kana || "-"}</div>
                </td>
                <td className="p-6 text-sm text-slate-300 font-mono font-bold">{s.birth_date || "-"}</td>
                <td className="p-6 text-sm text-slate-400 max-w-xs truncate font-medium">{s.address || "-"}</td>
                <td className="p-6">
                  <div className="text-sm text-orange-400 font-mono font-bold tracking-tight">{s.emergency_contact || "-"}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">({s.emergency_relationship || "不明"})</div>
                </td>
                <td className="p-6 text-sm">
                  <span className="text-slate-100 font-mono font-black">¥{s.monthly_fee?.toLocaleString() || "0"}</span>
                </td>
                <td className="p-6 text-center">
                  <button 
                    onClick={() => toggleRentalBike(s.id, s.has_rental_bike)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${s.has_rental_bike ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.has_rental_bike ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <p className="text-[8px] font-black mt-1 text-slate-500 uppercase tracking-widest">{s.has_rental_bike ? '有り / YES' : '無し / NO'}</p>
                </td>
                <td className="p-6 text-center">
                  {s.is_active ? (
                    <span className="text-[9px] font-black px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 tracking-widest">有効 / ACTIVE</span>
                  ) : (
                    <span className="text-[9px] font-black px-3 py-1 rounded-full bg-slate-800 text-slate-500 border border-slate-700 tracking-widest">無効 / INACTIVE</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-4">
        {students.map((s) => (
          <div key={s.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 backdrop-blur-sm shadow-xl">
            {/* ヘッダー: 名前 + 状態 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-sm font-black">
                  {s.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-blue-100 text-base">{s.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold tracking-tighter">{s.furigana || s.kana || "-"}</div>
                </div>
              </div>
              {s.is_active ? (
                <span className="text-[8px] font-black px-2 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 tracking-widest">ACTIVE</span>
              ) : (
                <span className="text-[8px] font-black px-2 py-1 rounded-full bg-slate-800 text-slate-500 border border-slate-700 tracking-widest">INACTIVE</span>
              )}
            </div>

            {/* 情報グリッド */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">生年月日</p>
                <p className="text-slate-300 font-mono font-bold text-xs">{s.birth_date || "-"}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">月謝</p>
                <p className="text-slate-100 font-mono font-black text-xs">¥{s.monthly_fee?.toLocaleString() || "0"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">緊急連絡先</p>
                <p className="text-orange-400 font-mono font-bold text-xs">{s.emergency_contact || "-"} <span className="text-slate-500">({s.emergency_relationship || "不明"})</span></p>
              </div>
            </div>

            {/* レンタルバイクトグル */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">レンタルバイク</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-500">{s.has_rental_bike ? '有り' : '無し'}</span>
                <button 
                  onClick={() => toggleRentalBike(s.id, s.has_rental_bike)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${s.has_rental_bike ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${s.has_rental_bike ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}