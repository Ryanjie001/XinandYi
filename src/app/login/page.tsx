"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { PEOPLE } from "@/lib/types";
import { useStore, type Person } from "@/lib/store";

export default function LoginPage() {
  const { data } = useStore();
  const [person, selectPerson] = useState<Person | null>(null);
  const [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const router = useRouter(),
    selected = person || data.person;
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <Brand />
        </div>
        <div className="login-poem">
          <p>属于我们的记录</p>
          <h1>
            我们的
            <br />
            生活记录。
          </h1>
        </div>
        <span className="login-image-note">新与怡的共同空间</span>
      </section>
      <section className="login-form-side">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <Link href="/" className="login-skip">
          返回我们的空间
          <ArrowRight size={14} />
        </Link>
        <div className="login-form">
          <p className="eyebrow">新 & 怡</p>
          <h2>欢迎回来。</h2>
          <p className="login-description">登录后查看记录。</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending) return;
              setPending(true);
              setError("");
              try {
                const r = await authClient.signIn.email({
                  email: PEOPLE[selected].email,
                  password,
                  rememberMe: true,
                });
                if (r.error) {
                  setError(
                    r.error.status === 429
                      ? "尝试次数较多，请一分钟后重试。"
                      : "账号或密码不正确，请再试一次。",
                  );
                  return;
                }
                setPassword("");
                router.replace("/");
                router.refresh();
              } catch {
                setError("暂时无法连接，请稍后重试。");
              } finally {
                setPending(false);
              }
            }}
          >
            <label className="field-label">选择账号</label>
            <div className="identity-options" role="group" aria-label="选择账号">
              {(["新", "怡"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={"identity-option " + (selected === item ? "selected" : "")}
                  aria-pressed={selected === item}
                  onClick={() => selectPerson(item)}
                >
                  <span>{item}</span>
                  {selected === item && <Check size={15} />}
                </button>
              ))}
            </div>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={PEOPLE[selected].email}
              readOnly
              hidden
            />
            <label className="field login-password">
              密码
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入你的密码"
              />
            </label>
            {error && (
              <p className="field-hint danger" role="alert">
                {error}
              </p>
            )}
            <button className="button button-primary login-submit" disabled={pending}>
              {pending ? "正在登录…" : "登录"}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="login-private-note">
            <LockKeyhole size={14} />
            仅对新与怡开放
          </p>
        </div>
        <div className="login-bottom">新 & 怡</div>
      </section>
      <a className="login-icp" href="http://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
        蜀ICP备2026067306号-1
      </a>
    </main>
  );
}
