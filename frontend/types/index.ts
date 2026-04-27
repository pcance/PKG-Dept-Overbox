export interface ResolvedDims {
  description: string;
  length: number;
  width: number;
  depth: number;
}

export interface ItemRow {
  id: number;
  mode: "pn" | "manual";
  pn: string;
  length: string | number;
  width: string | number;
  depth: string | number;
  quantity: number;
  resolved: ResolvedDims | null;
  error: string | null;
}

export interface Placement {
  label: string;
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  d: number;
}

export interface SolveResult {
  status: "ok" | "no_fit" | "error";
  message?: string;
  checked_overboxes?: number;
  overbox?: {
    part_number: string;
    description: string;
    inner_cm: { L: number; W: number; D: number };
  };
  efficiency?: {
    used_volume_cm3: number;
    box_volume_cm3: number;
    percent: number;
  };
  placements?: Placement[];
}
