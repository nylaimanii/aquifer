import { FarmForm } from "@/components/setup/FarmForm";

export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Set up your farm</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Drop a pin where your field is. We&apos;ll pull weather and soil
          underneath the pin.
        </p>
      </div>
      <FarmForm />
    </main>
  );
}
