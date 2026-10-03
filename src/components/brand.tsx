import Link from "next/link";
import { Sprout } from "lucide-react";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Steady home">
      <span className="brand-symbol">
        <Sprout size={21} strokeWidth={1.8} />
      </span>
      steady<span className="brand-period">.</span>
    </Link>
  );
}
