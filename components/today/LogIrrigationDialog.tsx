"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFarmStore } from "@/state/farm-store";
import { shortDate } from "@/lib/format-date";

const ACCENT = "bg-[#1E7A9B] hover:bg-[#1A6B88] text-white";
const MAX_MM = 200;
const LITERS_PER_MM_PER_ACRE = 4047;

/** Row with "last irrigation" status + a button that opens the log dialog. */
export function LogIrrigationDialog() {
  const [open, setOpen] = useState(false);
  const [mm, setMm] = useState("");

  const farm = useFarmStore((s) => s.farm);
  const areaAcres = useFarmStore((s) => s.farm?.areaAcres ?? 0);
  const lastIrrigation = useFarmStore((s) => {
    const withIrr = s.history.filter((h) => h.irrigationMm > 0);
    return withIrr.length ? withIrr[withIrr.length - 1] : null;
  });

  if (!farm) return null;

  const parsed = parseFloat(mm) || 0;
  const tooHigh = parsed > MAX_MM;
  const canSubmit = parsed > 0 && !tooHigh;

  function handleSubmit() {
    if (parsed <= 0 || parsed > MAX_MM) return;
    useFarmStore.getState().logIrrigation(parsed);
    toast.success("Irrigation logged", {
      description: `Added ${parsed} mm to soil. Recommendation updated.`,
    });
    setMm("");
    setOpen(false);
  }

  const lastLabel = lastIrrigation
    ? `Last irrigation: ${lastIrrigation.irrigationMm} mm on ${shortDate(lastIrrigation.date)}`
    : "No irrigation logged yet.";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <span className="text-sm text-slate-500">{lastLabel}</span>

      <Button className={ACCENT} onClick={() => setOpen(true)}>
        Log irrigation
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log irrigation</DialogTitle>
            <DialogDescription>
              How much water did you apply today? We&apos;ll update your soil
              moisture and recompute today&apos;s recommendation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="mm">Amount applied (mm)</Label>
              <Input
                id="mm"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={mm}
                onChange={(e) => setMm(e.target.value)}
                placeholder="e.g. 8.5"
              />
              {parsed > 0 && !tooHigh && areaAcres > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  ≈{" "}
                  {Math.round(
                    parsed * LITERS_PER_MM_PER_ACRE * areaAcres,
                  ).toLocaleString()}{" "}
                  L over {areaAcres} acres
                </p>
              )}
              {tooHigh && (
                <p className="mt-1 text-xs text-red-600">
                  Amount seems high — max {MAX_MM}mm per single log.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className={ACCENT} disabled={!canSubmit} onClick={handleSubmit}>
              Log {parsed > 0 ? `${parsed} mm` : "irrigation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
