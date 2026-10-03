import Image from "next/image";

export function LincAvatar() {
  return (
    <span className="linc-avatar" aria-hidden="true">
      <Image
        src="/brand/lincoln-financial.png"
        alt=""
        width={256}
        height={118}
      />
    </span>
  );
}
