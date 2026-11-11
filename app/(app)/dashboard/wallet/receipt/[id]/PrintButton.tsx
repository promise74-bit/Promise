'use client';
export default function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-xl bg-[#0757d5] px-5 py-3 text-sm font-bold text-white print:hidden">Print / Save as PDF</button>;
}
