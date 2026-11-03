"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Heart, Leaf, LogOut, Settings2, Sparkles } from "lucide-react";
import { SettingsDialog } from "@/components/forms";
import { useStore } from "@/lib/store";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={"brand " + (light ? "brand-light" : "")} aria-label="新&怡 首页">
      <span className="brand-names">
        新<span>&</span>怡<i />
      </span>
      <span className="brand-caption">A LITTLE WORLD OF US</span>
    </Link>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, setPerson, notify, ready } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nav = [
    { href: "/", label: "我们", icon: Heart },
    { href: "/journal", label: "手记", icon: BookOpen },
    { href: "/wishes", label: "愿望", icon: Sparkles },
  ];
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="main-nav" aria-label="主导航">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "active" : ""}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon size={17} strokeWidth={1.6} />
                <span>{label}</span>
                {pathname === href && <i />}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <span className="preview-badge">
              <span />
              本地预览
            </span>
            <button
              className="icon-button settings-button"
              aria-label="打开我们的设置"
              onClick={() => setSettingsOpen(true)}
              disabled={!ready}
            >
              <Settings2 size={19} strokeWidth={1.5} />
            </button>
            <details className="person-menu">
              <summary aria-label="切换预览身份">
                <span className={"avatar " + (data.person === "怡" ? "avatar-yi" : "")}>
                  {data.person}
                </span>
              </summary>
              <div className="person-dropdown">
                <p>当前预览身份 · {data.person}</p>
                <button
                  onClick={(e) => {
                    if (setPerson(data.person === "新" ? "怡" : "新")) notify("已切换预览身份。");
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  切换为「{data.person === "新" ? "怡" : "新"}」
                </button>
                <Link href="/login">
                  <LogOut size={14} />
                  返回登录页
                </Link>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="page-container">{children}</main>
      <footer className="site-footer">
        <div className="footer-top">
          <span>新 & 怡</span>
          <span>
            平凡的日子，因为我们而闪闪发光。
            <Leaf size={14} />
          </span>
        </div>
        <p>
          本地体验版 · 含示例内容 · 新增内容仅保存在当前浏览器，正式账号与云端存储将在下一阶段接入。
        </p>
      </footer>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
