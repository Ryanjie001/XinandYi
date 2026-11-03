"use client";
import { useState } from "react";
import { Modal } from "./ui";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
export function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const { notify } = useStore();
  return (
    <Modal
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title="修改密码"
      subtitle="修改后，其他设备上的登录会失效。"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
          setError("");
          if (password !== confirm) {
            setError("两次新密码不一致。");
            return;
          }
          setPending(true);
          try {
            const r = await authClient.changePassword({
              currentPassword: current,
              newPassword: password,
              revokeOtherSessions: true,
            });
            if (r.error) {
              setError("修改失败，请检查原密码和新密码后重试。");
              return;
            }
            notify("密码已修改，其他设备已退出。");
            onClose();
          } catch {
            setError("暂时无法连接，请稍后重试。");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="field">
          原密码
          <input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="field">
          新密码
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <p className="field-hint">使用至少 12 位的密码。</p>
        <label className="field">
          再输入一次
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="field-hint danger">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-quiet"
            disabled={pending}
            onClick={onClose}
          >
            取消
          </button>
          <button className="button button-primary" disabled={pending}>
            {pending ? "保存中…" : "保存新密码"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
