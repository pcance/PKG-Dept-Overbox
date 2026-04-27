"use client";
import React, { useMemo } from "react";
import { Placement } from "@/types";

interface Props {
  placements: Placement[];
  binL: number;
  binW: number;
  binD: number;
  view: "iso" | "top" | "left" | "right";
}

const COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

function getColor(i: number) {
  return COLORS[i % COLORS.length];
}

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

function isoProject(x: number, y: number, z: number, scale: number) {
  return {
    sx: (x - y) * COS30 * scale,
    sy: (x + y) * SIN30 * scale - z * scale,
  };
}

export default function PackingViz({ placements, binL, binW, binD, view }: Props) {
  const SVG_W = 480;
  const SVG_H = 400;
  const PAD = 30;

  const sorted = useMemo(() => {
    if (view === "iso") {
      return [...placements].sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));
    }
    return placements;
  }, [placements, view]);

  if (view === "iso") {
    const corners = [
      [0, 0, 0], [binL, 0, 0], [0, binW, 0], [binL, binW, 0],
      [0, 0, binD], [binL, 0, binD], [0, binW, binD], [binL, binW, binD],
    ];
    const projected = corners.map(([x, y, z]) => isoProject(x!, y!, z!, 1));
    const minSx = Math.min(...projected.map((p) => p.sx));
    const maxSx = Math.max(...projected.map((p) => p.sx));
    const minSy = Math.min(...projected.map((p) => p.sy));
    const maxSy = Math.max(...projected.map((p) => p.sy));

    const scaleX = (SVG_W - 2 * PAD) / (maxSx - minSx || 1);
    const scaleY = (SVG_H - 2 * PAD) / (maxSy - minSy || 1);
    const scale = Math.min(scaleX, scaleY);

    const cx = SVG_W / 2 - ((minSx + maxSx) / 2) * scale;
    const cy = SVG_H / 2 - ((minSy + maxSy) / 2) * scale;

    const project = (x: number, y: number, z: number) => {
      const { sx, sy } = isoProject(x, y, z, scale);
      return { sx: sx + cx, sy: sy + cy };
    };

    const isoBox = (
      x: number, y: number, z: number,
      l: number, w: number, d: number,
      color: string, opacity: number, strokeColor: string, strokeW: number
    ) => {
      const c000 = project(x, y, z);
      const c100 = project(x + l, y, z);
      const c010 = project(x, y + w, z);
      const c110 = project(x + l, y + w, z);
      const c001 = project(x, y, z + d);
      const c101 = project(x + l, y, z + d);
      const c011 = project(x, y + w, z + d);
      const c111 = project(x + l, y + w, z + d);

      const pts = (arr: Array<{ sx: number; sy: number }>) =>
        arr.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");

      const topOpacity = Math.min(1, opacity * 1.1);

      return (
        <>
          <polygon
            points={pts([c001, c101, c111, c011])}
            fill={color}
            fillOpacity={topOpacity}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          <polygon
            points={pts([c100, c110, c111, c101])}
            fill={color}
            fillOpacity={opacity * 0.7}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          <polygon
            points={pts([c000, c100, c101, c001])}
            fill={color}
            fillOpacity={opacity * 0.85}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          <line x1={c000.sx} y1={c000.sy} x2={c010.sx} y2={c010.sy} stroke={strokeColor} strokeWidth={strokeW * 0.5} strokeDasharray="3,2" />
          <line x1={c010.sx} y1={c010.sy} x2={c110.sx} y2={c110.sy} stroke={strokeColor} strokeWidth={strokeW * 0.5} strokeDasharray="3,2" />
          <line x1={c010.sx} y1={c010.sy} x2={c011.sx} y2={c011.sy} stroke={strokeColor} strokeWidth={strokeW * 0.5} strokeDasharray="3,2" />
        </>
      );
    };

    const isoLabel = (x: number, y: number, z: number, l: number, w: number, d: number, label: string) => {
      const center = project(x + l / 2, y + w / 2, z + d);
      const maxLen = 10;
      const shortLabel = label.length > maxLen ? label.slice(0, maxLen - 1) + "..." : label;
      return (
        <text
          x={center.sx}
          y={center.sy - 3}
          fontSize="8"
          textAnchor="middle"
          fill="#111"
          fontFamily="monospace"
        >
          {shortLabel}
        </text>
      );
    };

    return (
      <svg width={SVG_W} height={SVG_H} className="border border-gray-200 rounded bg-gray-50">
        {isoBox(0, 0, 0, binL, binW, binD, "#aaa", 0.05, "#555", 1.5)}
        {sorted.map((p, i) => (
          <g key={i}>
            {isoBox(p.x, p.y, p.z, p.l, p.w, p.d, getColor(i), 0.35, "#333", 1)}
            {isoLabel(p.x, p.y, p.z, p.l, p.w, p.d, p.label)}
          </g>
        ))}
      </svg>
    );
  }

  let projFn: (p: Placement) => { rx: number; ry: number; rw: number; rh: number };
  let binW2: number, binH2: number;

  if (view === "top") {
    binW2 = binL;
    binH2 = binW;
    projFn = (p) => ({ rx: p.x, ry: p.y, rw: p.l, rh: p.w });
  } else if (view === "left") {
    binW2 = binW;
    binH2 = binD;
    projFn = (p) => ({ rx: p.y, ry: binD - p.z - p.d, rw: p.w, rh: p.d });
  } else {
    binW2 = binW;
    binH2 = binD;
    projFn = (p) => ({ rx: binW - p.y - p.w, ry: binD - p.z - p.d, rw: p.w, rh: p.d });
  }

  const scaleX = (SVG_W - 2 * PAD) / (binW2 || 1);
  const scaleY = (SVG_H - 2 * PAD) / (binH2 || 1);
  const scale = Math.min(scaleX, scaleY);

  const offX = PAD + ((SVG_W - 2 * PAD) - binW2 * scale) / 2;
  const offY = PAD + ((SVG_H - 2 * PAD) - binH2 * scale) / 2;

  return (
    <svg width={SVG_W} height={SVG_H} className="border border-gray-200 rounded bg-gray-50">
      <rect
        x={offX}
        y={offY}
        width={binW2 * scale}
        height={binH2 * scale}
        fill="#f9f9f9"
        stroke="#555"
        strokeWidth={1.5}
      />
      {placements.map((p, i) => {
        const { rx, ry, rw, rh } = projFn(p);
        const color = getColor(i);
        const px = offX + rx * scale;
        const py = offY + ry * scale;
        const pw = rw * scale;
        const ph = rh * scale;
        const cxCoord = px + pw / 2;
        const cyCoord = py + ph / 2;
        const maxLen = 10;
        const label = p.label.length > maxLen ? p.label.slice(0, maxLen - 1) + "..." : p.label;
        return (
          <g key={i}>
            <rect
              x={px}
              y={py}
              width={pw}
              height={ph}
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              strokeWidth={1.5}
            />
            <text x={cxCoord} y={cyCoord + 4} fontSize="8" textAnchor="middle" fill="#111" fontFamily="monospace">
              {label}
            </text>
          </g>
        );
      })}
      <text x={offX} y={offY - 5} fontSize="9" fill="#888" fontFamily="sans-serif">
        {view === "top" ? `Top (LxW: ${binL}x${binW} cm)` : view === "left" ? `Left (WxD: ${binW}x${binD} cm)` : `Right (WxD: ${binW}x${binD} cm)`}
      </text>
    </svg>
  );
}
