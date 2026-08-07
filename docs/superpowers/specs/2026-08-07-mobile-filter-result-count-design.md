# Mobile Filter Result Count Design

## Goal

Show a clear result count in the open mobile filter sheet, so a person searching by name can confirm the number of matches without dismissing the keyboard or inspecting the map.

## Current behavior and root cause

The map-level specialist counter is desktop-only: `App.tsx` does not render it on mobile and `App.css` hides it below 900px. The mobile filter sheet therefore has no visible result feedback. Name text is intentionally applied when the user presses Go/Enter, not on every keystroke.

## Approved interaction

When at least one filter has been applied, show a compact status on the left side of the mobile filter action row, opposite the existing Clear button:

- `1 result` for one match.
- `N results` for multiple matches.
- `No results` for zero matches.

The status is visually available only at mobile widths, where it stays within the open filter sheet above the on-screen keyboard. Desktop retains its existing map-level navigation counter without a duplicate filter-sheet count.

The count uses the same filtering function that supplies the map, including the committed name query. Typing a name without pressing Go/Enter does not claim that the map has already filtered; pressing Go/Enter updates both the map and the status together.

## Accessibility and styling

Render the status as an `output` with a polite live region and atomic updates. Give it a restrained blue pill treatment, readable contrast, and the same compact action-row height as Clear. Do not turn it into a button or consume input space.

## Scope and constraints

- Modify only the filter component, filter styles, focused regression tests, and implementation documentation.
- Reuse the existing filter criteria for country, city, language, specialty, and name; do not change filtering semantics, map navigation, Sheet data, public API data, or dependencies.
- Extract or reuse one filtering path so the displayed count cannot diverge from the map results.
- Preserve the desktop counter and mobile Clear control.

## Acceptance criteria

1. A committed name search such as `Megan` immediately displays the matching count in the open mobile filter action row.
2. The count updates for all applied filter combinations and correctly distinguishes one, many, and zero results.
3. No result status is shown while no filter is active.
4. The result count uses the same list sent through `onFilterChange` to the map.
5. The status is live-region accessible and only visually shown below the mobile breakpoint.
