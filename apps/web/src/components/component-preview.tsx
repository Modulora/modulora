import { useState } from "react";
import type { CatalogItem } from "@/data/catalog";

/** Static catalog preview; interactive mode mirrors the future sandbox contract. */
export function ComponentPreview({
  item,
  className,
  theme = "light",
  interactive = false,
}: {
  item: CatalogItem;
  className?: string;
  theme?: "light" | "dark";
  interactive?: boolean;
}) {
  const dark = theme === "dark";
  return (
    <div
      className={`${className ?? ""} relative aspect-[4/3] overflow-hidden rounded-sm border ${
        dark
          ? "border-white/10 bg-[#111] text-[#f4f4f5]"
          : "border-black/10 bg-[#f5f5f3] text-[#171717]"
      }`}
    >
      {item.name === "calendar" ? (
        <CalendarPreview dark={dark} interactive={interactive} />
      ) : (
        <TablePreview dark={dark} interactive={interactive} />
      )}
    </div>
  );
}

function CalendarPreview({ dark, interactive }: { dark: boolean; interactive: boolean }) {
  const [selected, setSelected] = useState(11);
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className={`w-52 rounded-xl border p-3 shadow-sm ${dark ? "border-white/10 bg-[#1b1b1b]" : "border-black/10 bg-white"}`}>
        <div className="mb-3 flex items-center justify-between text-[11px] font-medium">
          <span>July 2026</span>
          <span className={dark ? "text-white/55" : "text-black/50"}>‹  ›</span>
        </div>
        <div className={`grid grid-cols-7 gap-1 text-center text-[8px] ${dark ? "text-white/40" : "text-black/45"}`}>
          {"SMTWTFS".split("").map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[9px]">
          {Array.from({ length: 31 }, (_, index) => {
            const day = index + 1;
            const selectedDay = selected === day;
            const className = `rounded py-1 transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
              selectedDay
                ? dark ? "bg-white text-black" : "bg-black text-white"
                : dark ? "hover:bg-white/10" : "hover:bg-black/5"
            }`;
            return interactive ? (
              <button key={day} type="button" className={className} onClick={() => setSelected(day)}>{day}</button>
            ) : (
              <span key={day} className={className}>{day}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TablePreview({ dark, interactive }: { dark: boolean; interactive: boolean }) {
  const [rows, setRows] = useState(["Acme Inc.", "Northstar", "Monocle", "Linear"]);
  const surface = dark ? "border-white/10 bg-[#1b1b1b]" : "border-black/10 bg-white";
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className={`w-full max-w-md overflow-hidden rounded-lg border shadow-sm ${surface}`}>
        <div className={`flex items-center justify-between border-b px-3 py-2 text-[10px] font-medium ${dark ? "border-white/10" : "border-black/10"}`}>
          <span>Customers</span>
          <button
            type="button"
            disabled={!interactive}
            onClick={() => setRows((current) => [...current, `Customer ${current.length + 1}`])}
            className={`rounded px-2 py-1 text-[9px] transition-transform duration-150 active:scale-[0.96] ${dark ? "bg-white text-black" : "bg-black text-white"}`}
          >
            Add
          </button>
        </div>
        {rows.slice(0, 6).map((name, index) => (
          <div key={`${name}-${index}`} className={`grid grid-cols-[1fr_5rem_4rem] border-b px-3 py-2 text-[9px] ${dark ? "border-white/5" : "border-black/5"}`}>
            <span>{name}</span><span className={dark ? "text-white/55" : "text-black/50"}>{index % 2 ? "Active" : "Trial"}</span><span className="text-right">${(index + 1) * 240}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
