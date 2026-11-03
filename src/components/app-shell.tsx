"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Heart, LogOut, Settings2, ListChecks, Images, Mail } from "lucide-react";
import { PasswordDialog } from "@/components/password-dialog";
import { SettingsDialog } from "@/components/forms";
import { useStore } from "@/lib/store";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={"brand " + (light ? "brand-light" : "")} aria-label="新&怡 首页">
      新<span>&</span>怡
    </Link>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    data,
    signOut,
    ready,
    saving,
    error,
    refresh,
    legacy,
    importLegacy,
    exportLegacy,
    dismissLegacy,
  } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false);
  const nav = [
    { href: "/", label: "我们", icon: Heart },
    { href: "/journal", label: "手记", icon: BookOpen },
    { href: "/albums", label: "相册", icon: Images },
    { href: "/letters", label: "信件", icon: Mail },
    { href: "/wishes", label: "愿望", icon: ListChecks },
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
                <Icon size={18} strokeWidth={1.5} />
                <span>{label}</span>
                {href === "/journal" &&
                  data.memories.some((memory) => (memory.unreadComments || 0) > 0) && (
                    <span className="nav-unread" aria-label="有新留言" />
                  )}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button settings-button"
              aria-label="打开我们的设置"
              onClick={() => setSettingsOpen(true)}
              disabled={!ready}
            >
              <Settings2 size={19} strokeWidth={1.5} />
            </button>
            <details className="person-menu">
              <summary aria-label="账号菜单">
                <span className="avatar">{data.person}</span>
              </summary>
              <div className="person-dropdown">
                <p>当前账号 · {data.person}</p>
                <button
                  onClick={(e) => {
                    setPasswordOpen(true);
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  修改密码
                </button>
                <button onClick={() => void signOut()}>
                  <LogOut size={14} />
                  退出 / 切换账号
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="page-container">
        {error && (
          <div className="service-notice" role="alert">
            <span>{error}</span>
            <button className="text-button" onClick={() => void refresh()}>
              重新连接
            </button>
          </div>
        )}
        {legacy && (
          <div className="service-notice">
            <span>发现浏览器中的旧记录，可导入到我们的空间。</span>
            <div className="notice-actions">
              <button
                className="text-button"
                disabled={saving || !ready}
                onClick={() => void importLegacy()}
              >
                {saving ? "导入中…" : "导入记录"}
              </button>
              <button className="text-button" onClick={exportLegacy}>
                下载备份
              </button>
              <button className="text-button muted" onClick={dismissLegacy}>
                稍后
              </button>
            </div>
          </div>
        )}
        <div className="page-transition" key={pathname}>{children}</div>
      </main>
      <footer className={pathname === "/" ? "site-footer site-footer-home" : "site-footer"}>
        <span>新 & 怡</span>
        {pathname === "/" && (
          <a href="http://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            蜀ICP备2026067306号-1
          </a>
        )}
        <span>生活记录</span>
      </footer>
      {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
