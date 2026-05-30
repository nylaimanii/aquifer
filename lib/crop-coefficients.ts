import type { Crop, CropId } from "./types";

/**
 * FAO-56 reference values (Allen et al., 1998). Single-crop Kc,
 * well-watered conditions. Source: FAO Irrigation and Drainage
 * Paper No. 56, Tables 11 (Kc) + 12 (stage lengths, root depth, p).
 */
export const CROPS: Record<CropId, Crop> = {
  corn: {
    id: "corn",
    displayName: "Corn",
    kc: { initial: 0.3, mid: 1.2, end: 0.6 },
    stageLengthsDays: { initial: 30, development: 40, mid: 50, late: 30 },
    rootDepthM: 1.0,
    depletionFraction: 0.55,
  },
  wheat: {
    id: "wheat",
    displayName: "Wheat",
    kc: { initial: 0.4, mid: 1.15, end: 0.4 },
    stageLengthsDays: { initial: 30, development: 140, mid: 40, late: 30 },
    rootDepthM: 1.5,
    depletionFraction: 0.55,
  },
  soybeans: {
    id: "soybeans",
    displayName: "Soybeans",
    kc: { initial: 0.4, mid: 1.15, end: 0.5 },
    stageLengthsDays: { initial: 20, development: 35, mid: 60, late: 25 },
    rootDepthM: 1.0,
    depletionFraction: 0.5,
  },
  tomato: {
    id: "tomato",
    displayName: "Tomato",
    kc: { initial: 0.6, mid: 1.15, end: 0.8 },
    stageLengthsDays: { initial: 30, development: 40, mid: 40, late: 25 },
    rootDepthM: 1.0,
    depletionFraction: 0.4,
  },
  cotton: {
    id: "cotton",
    displayName: "Cotton",
    kc: { initial: 0.35, mid: 1.18, end: 0.6 },
    stageLengthsDays: { initial: 30, development: 50, mid: 60, late: 55 },
    rootDepthM: 1.3,
    depletionFraction: 0.65,
  },
  almonds: {
    id: "almonds",
    displayName: "Almonds",
    kc: { initial: 0.4, mid: 0.9, end: 0.65 },
    stageLengthsDays: { initial: 20, development: 70, mid: 120, late: 60 },
    rootDepthM: 1.7,
    depletionFraction: 0.4,
  },
  rice: {
    id: "rice",
    displayName: "Rice",
    kc: { initial: 1.05, mid: 1.2, end: 0.9 },
    stageLengthsDays: { initial: 30, development: 30, mid: 60, late: 30 },
    rootDepthM: 0.75,
    depletionFraction: 0.2,
  },
  potato: {
    id: "potato",
    displayName: "Potato",
    kc: { initial: 0.5, mid: 1.15, end: 0.75 },
    stageLengthsDays: { initial: 25, development: 30, mid: 45, late: 30 },
    rootDepthM: 0.5,
    depletionFraction: 0.35,
  },
};
