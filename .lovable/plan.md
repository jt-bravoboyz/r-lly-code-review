

# Fix: Collapse Past R@llys on the R@lly Page

## Problem
On the R@lly page (`Events.tsx`), the "Past R@lly" section is always fully expanded, pushing content down and competing with the primary "Create R@lly" / "Quick R@lly" actions. On screens with many past events, it dominates the page.

## Solution
Wrap the Past R@lly section in a `Collapsible` component (already exists in the project) that starts **collapsed by default**. When expanded, show only the first 3 items with a "Show all" button.

## Changes — Single file: `src/pages/Events.tsx`

1. **Import** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from `lucide-react`.
2. **Add state**: `pastOpen` (default `false`) and `showAllPast` (default `false`).
3. **Wrap** the Past R@lly section in `<Collapsible open={pastOpen} onOpenChange={setPastOpen}>`.
4. **Make the header a trigger**: The "Past R@lly" heading becomes a `CollapsibleTrigger` with a rotating chevron icon.
5. **Limit visible items**: Inside `CollapsibleContent`, show `filteredPast.slice(0, showAllPast ? undefined : 3)`. If more than 3 exist, render a "Show all X past R@llys" button.
6. **No other changes** — create actions, Live Now, and Upcoming sections remain untouched.

