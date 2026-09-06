# DealerPulse — Decisions

> This is my thinking behind DealerPulse. I am open to feedback and happy to change anything.

## 1. What I built and why

I did not want to build just a dashboard. I wanted to give the user enough to
understand the business and then act.

I used a clear menu system — one page for one job — so the screen never gets
crowded. Here is what the user can do on each page:

- **Overview** — see the whole business at a glance, and what needs attention today.
- **Insights** — see what the data means, and what to do next.
- **Bottlenecks** — see stuck deals, open a lead's full journey, and get the next best action.
- **Branches** — see how each branch is doing, with a pipeline forecast.
- **Sales reps** — see how each rep is doing.
- **Deliveries** — see delivery speed, why deliveries slip (delay reasons), and orders still waiting.

On the Overview, I compare branches against each other, not against target.
Against target every branch looks like a failure, which helps no one. The real
target number is still shown on each branch page, so nothing is hidden.

Under the main charts I add one short insight line, so the user gets the point
without reading the whole chart.

The user can drill down: group → branch → sales rep.

I wanted this to be a real product a dealership group can actually use. And a
real tool is not used by one person — the CEO, the branch manager, and the
sales rep are all in this data. So I built a view for each.

## 2. Key product decisions and tradeoffs

**Rank branches against each other, not against target.**
Against target all five look failed. Tradeoff: the label is relative, not
pass/fail. I still show the real target, so nothing is hidden.

**Three views — CEO, branch manager, and sales rep.**
A real tool is not used by one person. So each role sees only what fits their
job — the CEO sees the whole group, a manager sees only their branch, and a rep
sees only their own deals. You switch between them with a "Viewing as" control.
Tradeoff: there is no login yet, so anyone can switch — it shows the idea, but
it is not secure.

**A short takeaway line under the main charts.**
A chart alone makes the user think; a sentence gives the point. Tradeoff: these
are simple rule-based lines, not deep analysis.

**Separate pages, not one big dashboard.**
Cleaner to read. Tradeoff: a few more clicks.

**Split "money at risk" into three buckets: cold, awaiting delivery, and likely dead.**
Cold means going quiet (7+ days). Awaiting delivery means ordered and waiting.
Likely dead means no activity for 60+ days. Each needs a different action.
Tradeoff: more detail on screen, but an honest number instead of one scary total.

**A health score and a next best action on every stuck deal.**
Each open deal gets a simple 0–100 health score (how close to a sale, minus
idle days) and a next step in plain words. Tradeoff: it comes from rules, not a
smart model — but it is fast and clear.

**Set "now" to the last date in the data, not today's date.**
The data ends in December 2025. If I used today's date, every lead would look
idle for months and the cold-lead numbers would be wrong. So I find the latest
activity date in the data and measure everything from there. Tradeoff: the app
shows a fixed "as of" date, which is correct for a fixed dataset.

**All the math lives in the backend.**
One place owns the numbers, so every screen agrees. The frontend just shows
the result.

## 3. Open-ended features I picked

The assignment lists 8 optional features and says not to do all of them. I
picked the ones that help a manager act right away:

- **Lead aging alerts** — the Bottlenecks page flags leads going cold.
- **Conversion funnel** — shows exactly where leads drop off.
- **Forecasting** — a pipeline forecast shows expected cars and revenue still to win.
- **Comparative analytics** — branches and reps ranked against each other.
- **What-if** — a simple slider shows the revenue impact of a small conversion lift.
- **Export** — one-click CSV export on the bottlenecks table.

## 4. What I would build next

- **Login and a protected backend** — guard the API with a token, and make
  sign-in decide your view instead of the "Viewing as" switch.
- **Move data to a database** (SQL / Firebase / Firestore), and let users add
  leads and update a lead's status.
- **Cache data on the front end** — right now every page loads fresh from the
  API each time. I would add caching with a library like TanStack Query, so
  screens open faster and don't re-fetch the same data.
- **An AI chat helper** — build embeddings from the clean data and add an LLM
  agent, so users can just ask questions in plain words.
- **Notifications** — real-time alerts, and push the day's cold leads to the
  manager on their own.

## 5. Interesting patterns in the data

- **Every branch is far below target.** The group delivered 160 cars of a 1,426
  target (11%), and ₹38.9 Cr of ₹313 Cr (12%). All five miss by a similar wide
  gap, so the targets are set too high — it is not that every branch is failing.
- **One branch is much weaker than the rest.** Lakeside delivered only 6 cars.
  The other four are close to each other. So this is one branch's problem, not
  the market.
- **Many leads were never called even once.** 119 of 510 leads (23%) were never
  contacted, and 96% of them were lost — worth ₹27 Cr, about 39% of all lost
  money. This is a free fix: a process problem, not a price problem.
- **The team is slow to make the first call.** The median time to first call is
  about 46 hours, and only 12% of leads get a call within a day.
- **Old stuck deals are mostly not dead leads.** All 15 deals sitting quiet for
  60+ days are orders already placed, waiting for delivery. So that is a
  delivery problem, not sales follow-up.

## 6. Technologies used

- **Next.js + TypeScript + Tailwind** — the frontend and the look.
- **Recharts** — the charts.
- **Python + FastAPI** — the backend that does all the math and serves the API.
- **A JSON file** — the data source for now.
- **Vercel** — deploys the frontend and the Python backend together, in one place.
