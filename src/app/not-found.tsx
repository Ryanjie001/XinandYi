import Link from "next/link";
import { Heart } from "lucide-react";
export default function NotFound() {
  return (
    <main className="not-found">
      <Heart size={34} strokeWidth={1.2} />
      <p className="eyebrow">A LITTLE DETOUR</p>
      <h1>这一页，还没写到。</h1>
      <p>先回到我们的小世界吧。</p>
      <Link className="button button-primary" href="/">
        回到首页
      </Link>
    </main>
  );
}
