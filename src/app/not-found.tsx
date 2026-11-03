import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>页面未找到</h1>
      <p>返回首页，继续查看我们的记录。</p>
      <Link className="button button-primary" href="/">
        回到首页
      </Link>
    </main>
  );
}
