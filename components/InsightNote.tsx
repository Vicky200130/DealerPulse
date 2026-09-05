import { Sparkles } from 'lucide-react';

// The soft "insight" callout used under charts — a sparkle + primary tint,
// matching the Insights page. Shared so every chart's takeaway reads the same.
export function InsightNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-sm bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700">
      <span className="flex h-5 shrink-0 items-center">
        <Sparkles size={14} className="text-primary" />
      </span>
      <span className="leading-5">{children}</span>
    </div>
  );
}
