import Link from "next/link";
import Image from "next/image";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Lincoln Financial home">
      <Image
        className="brand-logo"
        src="/brand/lincoln-financial.png"
        alt="Lincoln Financial"
        width={256}
        height={118}
        priority
      />
    </Link>
  );
}
