import { Fragment } from 'react';

// Bolds the figures inside a plain-language description — ₹ amounts, percentages
// and counts — so a long sentence stays scannable at a glance. One capturing
// group, so String.split alternates text / match / text …; odd indices are the
// figures to emphasise.
const TOKEN = /(₹[\d.,]+\s?(?:Cr|L|lakh|crore)?|\d+(?:\.\d+)?%|\d[\d,]*)/g;

export function emphasize(text: string): React.ReactNode {
  return text.split(TOKEN).map((part, i) =>
    i % 2 === 1 ? (
      // Weight only (inherit colour) so it reads on any background — the primary
      // insight boxes, the warning funnel note and the dark signal-card text.
      <b key={i} className="font-bold">
        {part}
      </b>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Wraps children: a plain string gets its figures emphasised; anything else
 *  (already-marked-up JSX) passes through untouched. */
export function Emphasize({ children }: { children: React.ReactNode }) {
  return <>{typeof children === 'string' ? emphasize(children) : children}</>;
}
