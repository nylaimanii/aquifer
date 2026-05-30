export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">AQUIFER</h1>
      <p className="text-muted-foreground max-w-md text-lg text-balance">
        An AI irrigation advisor that tells farmers the minimum water needed.
      </p>
    </main>
  );
}
