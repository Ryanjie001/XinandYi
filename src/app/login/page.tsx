"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Heart, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/app-shell";
import { useStore, type Person } from "@/lib/store";

export default function LoginPage() {
  const { data, setPerson, ready } = useStore();
  const [person, selectPerson] = useState<Person | null>(null);
  const router = useRouter();
  const selected = person || data.person;
  return (
    <main className="login-page">
      <section className="login-visual">
        <img className="login-background" src="/images/sea.jpg" alt="温柔海岸，作为示例封面" />
        <div className="login-overlay" />
        <div className="login-brand">
          <Brand light />
        </div>
        <div className="login-poem">
          <p className="eyebrow">EVERY DAY, A LITTLE MORE US.</p>
          <h1>
            把日子，
            <br />
            写成我们。
          </h1>
          <p>
            世界很大，
            <br />
            想和你拥有一个小小的角落。
          </p>
          <span className="login-signature">
            新 & 怡 <Heart size={18} strokeWidth={1} />
          </span>
        </div>
        <span className="login-image-note">示例风景 · 等你换上我们的合照</span>
      </section>
      <section className="login-form-side">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <Link href="/" className="login-skip">
          先看看我们的空间
          <ArrowRight size={15} />
        </Link>
        <div className="login-form">
          <span className="login-heart">
            <Heart size={28} strokeWidth={1.2} />
          </span>
          <p className="eyebrow">WELCOME TO OUR LITTLE WORLD</p>
          <h2>回来啦，想你了。</h2>
          <p className="login-description">那些关于我们的小事，都在这里。</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (setPerson(selected)) router.push("/");
            }}
          >
            <label className="field-label">今天，是谁来写故事？</label>
            <div className="identity-options" role="group" aria-label="选择预览身份">
              {(["新", "怡"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={"identity-option " + (selected === item ? "selected" : "")}
                  aria-pressed={selected === item}
                  onClick={() => selectPerson(item)}
                >
                  <span className={"identity-avatar " + (item === "怡" ? "yi" : "")}>{item}</span>
                  <strong>我是{item}</strong>
                  <span className="identity-radio">{selected === item && <i />}</span>
                </button>
              ))}
            </div>
            <button className="button button-primary login-submit" disabled={!ready}>
              以「{selected}」的身份进入预览
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-preview-note">
            <LockKeyhole size={16} />
            <p>
              <strong>当前为本地页面体验，无需密码。</strong>
              <span>
                正式账号认证和私密访问将在下一阶段接入。
                <br />
                预览内容仅保存在当前浏览器。
              </span>
            </p>
          </div>
        </div>
        <div className="login-bottom">
          ONE LITTLE WORLD. TWO OF US.
          <Heart size={12} />
        </div>
      </section>
    </main>
  );
}
