"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function calculateAge(birthDateStr: string) {
  if (!birthDateStr) return "";
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - bDate.getFullYear();
  const m = today.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }
  return `${age}歳`;
}

function calculateGrade(birthDateStr: string) {
  if (!birthDateStr) return "";
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return "";

  const today = new Date();
  const currentSchoolYear = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
  
  let birthSchoolYear = bDate.getFullYear();
  if (bDate.getMonth() < 3 || (bDate.getMonth() === 3 && bDate.getDate() === 1)) {
    birthSchoolYear -= 1;
  }
  
  const diff = currentSchoolYear - birthSchoolYear;
  
  if (diff < 4) return "未就学";
  if (diff === 4) return "年少";
  if (diff === 5) return "年中";
  if (diff === 6) return "年長";
  if (diff >= 7 && diff <= 12) return `小${diff - 6}`;
  if (diff >= 13 && diff <= 15) return `中${diff - 12}`;
  if (diff >= 16 && diff <= 18) return `高${diff - 15}`;
  if (diff >= 19 && diff <= 22) return `大${diff - 18}`;
  return "一般";
}

export default function Home() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 編集用の状態
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
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

  const toggleRentalBike = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('students').update({ has_rental_bike: !currentStatus }).eq('id', id);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === id ? { ...s, has_rental_bike: !currentStatus } : s));
    } catch (err) {
      console.error("レンタルバイク更新エラー:", err);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStudent) return;
    setEditingStudent({ ...editingStudent, [e.target.name]: e.target.value });
  };

  const saveStudent = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    try {
      if (editingStudent.id) {
        // 編集した内容を保存 (is_active等もここでまとめて更新)
        const { error } = await supabase
          .from('students')
          .update({
            name: editingStudent.name,
            furigana: editingStudent.furigana,
            birth_date: editingStudent.birth_date,
            address: editingStudent.address,
            emergency_contact: editingStudent.emergency_contact,
            emergency_relationship: editingStudent.emergency_relationship,
            is_active: editingStudent.is_active
          })
          .eq('id', editingStudent.id);
          
        if (error) throw error;
      } else {
        // 新規追加
        const { error } = await supabase
          .from('students')
          .insert([{
            name: editingStudent.name,
            furigana: editingStudent.furigana,
            birth_date: editingStudent.birth_date,
            address: editingStudent.address,
            emergency_contact: editingStudent.emergency_contact,
            emergency_relationship: editingStudent.emergency_relationship,
            is_active: true,
            has_rental_bike: false
          }]);
          
        if (error) throw error;
      }
      await fetchStudents();
      setEditingStudent(null);
    } catch (err) {
      console.error("生徒情報更新エラー:", err);
      alert("更新に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = () => {
    if (!editingStudent) return;
    const isAct = editingStudent.is_active;
    const confirmMessage = isAct ? "本当に退会処理を行いますか？" : "この生徒を在籍状態に戻しますか？";
    if (confirm(confirmMessage)) {
      setEditingStudent({ ...editingStudent, is_active: !isAct });
    }
  };

  if (loading) return <div className="p-10 text-white text-center text-xl tracking-widest font-black italic">読み込み中...</div>;

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-white relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 md:mb-10 gap-4">
        <div>
          <p className="text-blue-500 text-sm font-black mb-1 uppercase tracking-widest">F.A.S.T. BMX SCHOOL</p>
          <h1 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
            生徒名簿 <span className="text-slate-700 block md:inline md:ml-2">/ Students</span>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 text-right">
          <div className="text-left sm:text-right">
            <span className="text-slate-400 text-[10px] font-black block mb-2 uppercase tracking-[0.2em]">REGISTERED STUDENTS / 登録数</span>
            <span className="bg-blue-600 px-6 py-2 rounded-xl text-sm font-black shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
              {students.filter(s => s.is_active).length} <span className="text-[10px] ml-1">名</span>
            </span>
          </div>
          <button
            onClick={() => setEditingStudent({ is_active: true })}
            className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-xl text-sm font-black shadow-[0_10px_20px_rgba(22,163,74,0.3)] transition-all flex items-center justify-center gap-2 h-[36px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            生徒追加
          </button>
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
              <th className="p-6 border-b border-slate-700 text-center">レンタルバイク</th>
              <th className="p-6 border-b border-slate-700 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {students.map((s) => (
              <tr key={s.id} className={`group transition-all duration-300 ${s.is_active ? 'hover:bg-blue-900/10' : 'opacity-40 hover:opacity-100 hover:bg-red-900/10'}`}>
                <td className="p-6">
                  <div className="font-bold text-blue-100 text-base">
                    {s.name} {!s.is_active && <span className="ml-2 text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">退会済</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{s.furigana || s.kana || "-"}</div>
                </td>
                <td className="p-6">
                  <span className="text-sm text-slate-300 font-mono font-bold mr-2">{s.birth_date || "-"}</span>
                  {s.birth_date && (
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-800/80 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                      {calculateAge(s.birth_date)} / {calculateGrade(s.birth_date)}
                    </span>
                  )}
                </td>
                <td className="p-6 text-sm text-slate-400 max-w-xs truncate font-medium">{s.address || "-"}</td>
                <td className="p-6">
                  <div className="text-sm text-orange-400 font-mono font-bold tracking-tight">{s.emergency_contact || "-"}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">({s.emergency_relationship || "不明"})</div>
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
                  <button 
                    onClick={() => setEditingStudent({ ...s, furigana: s.furigana || s.kana || "" })}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border border-slate-700 hover:border-slate-600"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-4">
        {students.map((s) => (
          <div key={s.id} className={`bg-slate-900/80 rounded-2xl border ${s.is_active ? 'border-slate-800' : 'border-red-900/50 opacity-60'} p-4 backdrop-blur-sm shadow-xl relative`}>
            {/* 編集ボタン */}
            <button 
              onClick={() => setEditingStudent({ ...s, furigana: s.furigana || s.kana || "" })}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 w-8 h-8 rounded-full flex items-center justify-center border border-slate-700 active:scale-95 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

            {/* ヘッダー: 名前 */}
            <div className="flex items-center justify-between mb-3 pr-10">
              <div>
                <div className="font-bold text-blue-100 text-base items-center flex gap-2">
                  {s.name}
                  {!s.is_active && <span className="text-[9px] bg-red-900/50 text-red-500 px-2 py-0.5 rounded border border-red-500/20 whitespace-nowrap">退会済</span>}
                </div>
                <div className="text-[10px] text-slate-500 font-bold tracking-tighter">{s.furigana || s.kana || "-"}</div>
              </div>
            </div>

            {/* 情報グリッド */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">生年月日</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-300 font-mono font-bold text-xs">{s.birth_date || "-"}</span>
                  {s.birth_date && (
                    <span className="text-[9px] text-slate-400 font-bold bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                      {calculateAge(s.birth_date)} / {calculateGrade(s.birth_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">住所</p>
                <p className="text-slate-300 font-bold text-xs">{s.address || "-"}</p>
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

      {/* 編集モーダル */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/20">
              <h2 className="text-xl font-black italic tracking-tighter text-blue-400">
                {editingStudent.id ? 'EDIT STUDENT' : 'ADD STUDENT'}
              </h2>
              <button 
                onClick={() => setEditingStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mb-1 block">氏名</label>
                  <input 
                    name="name" 
                    value={editingStudent.name || ""} 
                    onChange={handleEditChange} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mb-1 block">フリガナ</label>
                  <input 
                    name="furigana" 
                    value={editingStudent.furigana || ""} 
                    onChange={handleEditChange} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mb-1 block">生年月日</label>
                  <input 
                    type="date"
                    name="birth_date" 
                    value={editingStudent.birth_date || ""} 
                    onChange={handleEditChange} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mb-1 block">住所</label>
                  <input 
                    name="address" 
                    value={editingStudent.address || ""} 
                    onChange={handleEditChange} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mb-1 block">緊急連絡先</label>
                  <input 
                    name="emergency_contact" 
                    value={editingStudent.emergency_contact || ""} 
                    onChange={handleEditChange} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition-colors" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mb-1 block">続柄</label>
                  <input 
                    name="emergency_relationship" 
                    value={editingStudent.emergency_relationship || ""} 
                    onChange={handleEditChange} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  />
                </div>
              </div>

              {/* 退会処理エリア */}
              {editingStudent.id && (
                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white mb-1">在籍の管理</p>
                    <p className="text-[10px] text-slate-500">退会済みにすると名簿一覧などで薄く表示され、登録数に含まれなくなります。</p>
                  </div>
                  <button
                    onClick={handleStatusToggle}
                    className={`ml-4 px-4 py-2 rounded-xl text-xs font-black tracking-widest flex items-center whitespace-nowrap transition-colors border ${
                      editingStudent.is_active 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20' 
                        : 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20'
                    }`}
                  >
                    {editingStudent.is_active ? '退会にする' : '在籍に戻す'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800/50 bg-slate-800/20 flex items-center gap-3">
              <button 
                onClick={() => setEditingStudent(null)}
                className="flex-1 px-5 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-black text-white rounded-xl transition-colors"
                disabled={isSaving}
              >
                キャンセル
              </button>
              <button 
                onClick={saveStudent}
                disabled={isSaving}
                className="flex-1 px-5 py-4 bg-blue-600 hover:bg-blue-500 text-sm font-black text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    保存中...
                  </>
                ) : (
                  '内容を保存'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}