import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">AQUIFER</h1>
      <p className="text-muted-foreground max-w-md text-lg text-balance">
        An AI irrigation advisor that tells farmers the minimum water needed.
      </p>
      <Button
        className="bg-[#1E7A9B] hover:bg-[#1A6B88] text-white"
        render={<Link href="/setup" />}
      >
        Get started →
      </Button>
    </main>
  );
}
