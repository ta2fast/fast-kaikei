"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    href: "/students",
    emoji: "👤",
    label: "生徒一覧",
    sublabel: "Students",
  },
  {
    href: "/attendance",
    emoji: "📅",
    label: "出欠管理",
    sublabel: "Attendance",
  },
  {
    href: "/fees",
    emoji: "💳",
    label: "月謝管理",
    sublabel: "Fees",
  },
  {
    href: "/accounting",
    emoji: "💰",
    label: "会計管理",
    sublabel: "Accounting",
  },
  {
    href: "/events",
    emoji: "📋",
    label: "イベント情報",
    sublabel: "Events",
  },
  {
    href: "/teachers",
    emoji: "👨‍🏫",
    label: "講師・スタッフ",
    sublabel: "Instructors",
  },
  {
    href: "/settings",
    emoji: "⚙️",
    label: "システム設定",
    sublabel: "Settings",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ヘッダー */}
      <div className="pt-8 md:pt-16 pb-6 md:pb-10 px-6 md:px-10 text-center">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-blue-500 uppercase leading-none mb-1">
          F.A.S.T.
        </h1>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
          BMX School & Team Management
        </p>
      </div>

      {/* メニューリスト */}
      <div className="flex-1 px-4 md:px-10 pb-8 md:pb-16 max-w-lg mx-auto w-full">
        <nav className="space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-5 py-4 md:py-5 rounded-2xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/60 transition-all duration-300 active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <span className="text-base md:text-lg font-black text-white tracking-tight group-hover:text-blue-300 transition-colors">
                    {item.label}
                  </span>
                  <span className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-slate-500 transition-colors">
                    {item.sublabel}
                  </span>
                </div>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-700 group-hover:text-slate-400 group-hover:translate-x-1 transition-all duration-300"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </nav>
      </div>

      {/* フッター */}
      <div className="py-6 border-t border-slate-900 text-center">
        <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.3em]">
          F.A.S.T. Management System v2.0
        </p>
      </div>
    </div>
  );
}