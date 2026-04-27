"use client";
import { useState } from "react";
import { SolveResult } from "@/types";
import PackingViz from "./PackingViz";

interface Props {
  result: SolveResult | null;
  solving: boolean;
}

export default function ResultsPanel({ result, solving }: Props) {
  const [view, setView] = useState<"iso" | "top" | "left" | "right">("iso");

  if (solving) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">...</div>
          <p>Solving... this may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Results will appear here after solving.</p>
      </div>
    );
  }

  if (result.status === "no_fit") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="font-semibold text-amber-800">No fit found</p>
          <p className="text-amber-700 text-sm mt-1">{result.message}</p>
        </div>
      </div>
    );
  }

  if (result.status !== "ok" || !result.overbox || !result.efficiency || !result.placements) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-red-700 text-sm">
        Unexpected error from solver.
      </div>
    );
  }

  const { overbox, efficiency, placements } = result;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-bold text-gray-800 text-lg mb-3">Best Fitting Overbox</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="font-medium text-gray-600">Part Number</div>
          <div className="font-mono font-bold text-blue-700">{overbox.part_number}</div>
          <div className="font-medium text-gray-600">Description</div>
          <div>{overbox.description}</div>
          <div className="font-medium text-gray-600">Internal Dims</div>
          <div className="font-mono">{overbox.inner_cm.L} x {overbox.inner_cm.W} x {overbox.inner_cm.D} cm</div>
          <div className="font-medium text-gray-600">Packing Efficiency</div>
          <div>
            <span className="font-bold text-green-700">{efficiency.percent}%</span>
            <span className="text-gray-500 text-xs ml-2">({efficiency.used_volume_cm3} / {efficiency.box_volume_cm3} cm3)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2 mb-3">
          {(["iso", "top", "left", "right"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-sm font-medium border transition
                ${view === v
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}
            >
              {v === "iso" ? "Isometric" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <PackingViz
          placements={placements}
          binL={overbox.inner_cm.L}
          binW={overbox.inner_cm.W}
          binD={overbox.inner_cm.D}
          view={view}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm">Packed Items</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-2 py-1 text-left">Label</th>
              <th className="border border-gray-200 px-2 py-1 text-right">L</th>
              <th className="border border-gray-200 px-2 py-1 text-right">W</th>
              <th className="border border-gray-200 px-2 py-1 text-right">D</th>
              <th className="border border-gray-200 px-2 py-1 text-right">x</th>
              <th className="border border-gray-200 px-2 py-1 text-right">y</th>
              <th className="border border-gray-200 px-2 py-1 text-right">z</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((p, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                <td className="border border-gray-200 px-2 py-1 font-mono">{p.label}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{p.l}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{p.w}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{p.d}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{p.x}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{p.y}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{p.z}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
