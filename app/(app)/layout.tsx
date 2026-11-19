import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-56">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-8">{children}</main>
    </div>
  );
}
