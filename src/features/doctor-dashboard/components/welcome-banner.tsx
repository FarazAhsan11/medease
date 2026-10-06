import Link from "next/link";

type WelcomeBannerProps = {
  doctorName: string;
};

export function WelcomeBanner({ doctorName }: WelcomeBannerProps) {
  return (
    <header className="rounded-t-xl bg-teal p-5 text-center text-[19.2px] font-black tracking-[1px] text-white">
      <h1 className="my-[0.67em] text-[2em] font-bold">
        Welcome, Dr. {doctorName}
      </h1>
      <Link
        href="/login"
        className="inline-block rounded-[5px] bg-brand-sky px-5 py-2.5 text-sm font-normal tracking-normal text-link-logout transition-colors hover:bg-brand-sky-hover hover:text-link-logout-hover hover:underline"
      >
        Logout
      </Link>
    </header>
  );
}
