"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROPS } from "@/lib/crop-coefficients";
import type { CropId } from "@/lib/types";

interface CropPickerProps {
  value: CropId | undefined;
  onChange: (id: CropId) => void;
}

export function CropPicker({ value, onChange }: CropPickerProps) {
  return (
    <Select
      value={value ?? null}
      onValueChange={(v) => {
        if (v) onChange(v as CropId);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {(val: CropId | null) =>
            val ? CROPS[val].displayName : "Select a crop"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(CROPS).map((crop) => (
          <SelectItem key={crop.id} value={crop.id}>
            {crop.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
