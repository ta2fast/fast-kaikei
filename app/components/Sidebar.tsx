"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "👤 生徒一覧", short: "Students" },
  { href: "/attendance", label: "📅 出欠管理", short: "Attendance" },
  { href: "/fees", label: "💳 月謝管理", short: "Fees" },
  { href: "/accounting", label: "💰 会計管理", short: "Accounting" },
  { href: "/teachers", label: "👨‍🏫 講師・スタッフ", short: "Teachers" },
  { href: "/settings", label: "⚙️ システム設定", short: "Settings" },
];

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* モバイルヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-[60] md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-white active:scale-90 transition-transform"
          aria-label="メニューを開く"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h2 className="text-sm font-black italic tracking-tighter text-blue-500 uppercase">F.A.S.T.</h2>
        <div className="w-10 h-10" /> {/* Spacer for centering */}
      </div>

      {/* モバイルオーバーレイ */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* サイドバー / モバイルドロワー */}
      <aside className={`
        w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col fixed h-full z-[80]
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black italic tracking-tighter text-blue-500 uppercase">F.A.S.T. Dashboard</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Management v2.0</p>
          </div>
          {/* モバイル閉じるボタン */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white active:scale-90 transition-all"
            aria-label="メニューを閉じる"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 space-y-3">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black transition-all duration-300 group ${
                  isActive
                    ? 'text-white bg-blue-600/20 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="tracking-tight">{item.label}</span>
                <span className="text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 transition-opacity text-slate-500">
                  {item.short}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">AD</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-200 truncate uppercase tracking-widest">Administrator</p>
              <p className="text-[8px] font-bold text-slate-500 truncate">master@fast-bmx.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
