# Live Filter Result Count Design

## Goal

Make the provider-match count visible in the filter panel at desktop and mobile widths, and update that count as a name is typed without moving the map until the person commits the search with Enter/Go.

## Observed problem

The prior result output is rendered after an applied filter but its base CSS sets `display: none`. It is only made visible inside the 900px mobile media query. Desktop users therefore see a populated Name field and Clear button with no on-screen indication of matching providers.

## Approved behavior

- Render the count in the existing filter action row beside Clear at every viewport width.
- Use clear singular, plural, and zero states: `1 matching provider`, `N matching providers`, and `No matching providers`.
- While the Name field contains text, calculate the count from that live text plus any selected country, city, language, and specialty filters.
- Keep `nameSearchQuery` as the map's committed query. Only Enter/Go updates it, filters markers, or invokes map navigation.
- If the Name field is empty, preserve the existing count behavior for applied non-name filters. Do not introduce a count when no filter is active.
- Keep the status as an atomic polite live region and retain Clear in the same action row.

## Implementation shape

`FilterComponent` already centralizes the filtering rules in `filterSpecialists`. Derive a live-count array by calling that helper with `nameInputValue`; retain the existing applied array based on `nameSearchQuery` for `onFilterChange` and map navigation. A small selection function chooses the live array only while the input has text. This gives the preview and applied paths identical matching rules without coupling live typing to map movement.

The result output remains in `.filter-actions`. Its common CSS becomes a compact inline pill at all widths; the mobile rule keeps its existing layout-specific sizing and left alignment. The desktop grid action column grows to hold the count and Clear without overlaying the Name field.

## Tests

- Typing `Megan` immediately displays the plural matching-provider count.
- Typing does not change the array passed to `onFilterChange` or invoke map navigation.
- Pressing Enter applies the same result array to the map.
- Singular and zero-result wording remain correct.
- Static style coverage verifies that the count is not hidden at desktop widths and remains in the action row beside Clear.

## Scope

Modify the filter component, its CSS, focused tests, and implementation documentation only. Do not change Sheet data, public APIs, map navigation semantics, deployment workflow, or dependencies.
