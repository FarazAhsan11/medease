import Image from "next/image";
import Link from "next/link";

export function AccountLink() {
  return (
    <Link href="/register" className="flex items-center text-link-default">
      <Image
        src="/images/user-icon.png"
        alt=""
        width={40}
        height={40}
        className="mr-2 size-10"
      />
      <span className="flex flex-col">
        <span className="mb-1 text-xs">Login or Register</span>
        <span className="text-base font-semibold">Patient Account</span>
      </span>
    </Link>
  );
}
