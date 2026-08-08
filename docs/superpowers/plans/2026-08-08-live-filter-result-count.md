# Live Filter Result Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Show a live provider-match count beside Clear at desktop and mobile widths without filtering or recentering the map until Enter/Go commits the name search.

**Architecture:** Keep nameInputValue as the draft query and nameSearchQuery as the map-applied query. Reuse filterSpecialists to derive a live-preview array from the draft query while keeping appliedFilteredSpecialists as the only array passed through onFilterChange and map navigation. Make the existing result output visible at all widths.

**Tech Stack:** React 19, TypeScript, Create React App, Jest with React DOM test utilities, Node test runner, CSS.

## Global Constraints

- The count updates while the Name field is typed; the map changes only when Enter/Go updates nameSearchQuery.
- Count text is exactly 1 matching provider, N matching providers, or No matching providers.
- Show the count beside Clear at desktop and mobile widths; do not use the map-level counter as the feedback surface.
- Preserve filtering rules, Sheet data, public APIs, map navigation behavior after Enter/Go, and dependencies.
- Keep the result output as an atomic polite live region.
- Release only through protected main CI, an annotated SemVer tag, and the production environment workflow. Use the user's explicit break-glass authorization only if a verified release gate blocks the approved release.

---

### Task 1: Add failing regression coverage for the live preview and desktop visibility

**Files:**
- Modify: src/FilterComponent.test.js
- Modify: tests/filter-layout.test.js

**Interfaces:**
- Consumes: FilterComponent props specialists, onFilterChange, and optional onMapNavigation.
- Produces: tests proving draft input changes the result output but does not call map callbacks until Enter.

- [x] **Step 1: Replace the committed-only component test with live-preview coverage**

Extend renderFilter to pass onMapNavigation. Capture callback arrays so the test can distinguish initial render effects, typing, and Enter.

~~~js
test('shows a live name-match count without applying map filters until Enter', async () => {
  const filterCalls = [];
  const navigationCalls = [];
  renderFilter({
    specialists: [
      specialist('Megan', 'A'),
      specialist('Megan', 'B'),
      specialist('Ada', 'Lovelace'),
    ],
    onFilterChange: (filtered) => filterCalls.push(filtered),
    onMapNavigation: (...args) => navigationCalls.push(args),
  });

  const input = container.querySelector('input[aria-label="Search by provider name"]');
  const filterCallsBeforeTyping = filterCalls.length;
  const navigationCallsBeforeTyping = navigationCalls.length;

  await setInput(input, 'Megan');
  expect(container.querySelector('[data-filter-result-count]').textContent)
    .toBe('2 matching providers');
  expect(filterCalls).toHaveLength(filterCallsBeforeTyping);
  expect(navigationCalls).toHaveLength(navigationCallsBeforeTyping);

  await commitSearch(input);
  expect(filterCalls.at(-1)).toHaveLength(2);
  expect(navigationCalls).toHaveLength(navigationCallsBeforeTyping + 1);

  await setInput(input, 'Ada');
  expect(container.querySelector('[data-filter-result-count]').textContent)
    .toBe('1 matching provider');

  await setInput(input, 'Nobody');
  expect(container.querySelector('[data-filter-result-count]').textContent)
    .toBe('No matching providers');
});
~~~

- [x] **Step 2: Add static CSS and markup coverage for desktop visibility**

Add a Node test that asserts the output remains in filter-actions, its base CSS uses inline-flex, and the mobile media rule retains margin-right auto.

~~~js
test('filter result count is visible beside Clear at desktop and mobile widths', () => {
  const component = read('src/FilterComponent.tsx');
  const css = read('src/FilterComponent.css');
  const resultCount = cssBlock('.filter-result-count');
  const mobileStart = css.indexOf('@media (max-width: 900px)');
  const mobileCss = css.slice(mobileStart);

  assert.ok(component.indexOf('data-filter-result-count') < component.indexOf('filter-clear-all-btn'));
  assert.match(resultCount, /display:\s*inline-flex\b/);
  assert.match(resultCount, /white-space:\s*nowrap\b/);
  assert.match(mobileCss, /\.filter-result-count\s*\{[^}]*margin-right:\s*auto/s);
});
~~~

- [x] **Step 3: Run focused tests and confirm the pre-change failures**

Run: CI=true npm test -- --watchAll=false src/FilterComponent.test.js

Run: node --test tests/filter-layout.test.js

Expected: the React test fails because typing currently produces no output, and the static test fails because desktop CSS currently hides the output.

### Task 2: Derive a live preview count and expose it at every viewport width

**Files:**
- Modify: src/FilterComponent.tsx
- Modify: src/FilterComponent.css

**Interfaces:**
- Consumes: nameInputValue, nameSearchQuery, selected-filter arrays, and filterSpecialists.
- Produces: liveFilteredSpecialists, resultCountSpecialists, hasResultCount, resultCountLabel, and visible filter-result-count styling.

- [x] **Step 1: Derive the draft-query array without altering the applied array**

Add a memoized live array using nameInputValue. Keep appliedFilteredSpecialists based on nameSearchQuery; it remains the only input to applyFilters and getRemainingSpecialists.

~~~tsx
const liveFilteredSpecialists = useMemo(
  () => filterSpecialists(
    specialists,
    selectedCountries,
    selectedCities,
    selectedLanguages,
    selectedSpecialties,
    nameInputValue,
  ),
  [
    specialists,
    selectedCountries,
    selectedCities,
    selectedLanguages,
    selectedSpecialties,
    nameInputValue,
  ],
);

const hasLiveNameQuery = nameInputValue.trim().length > 0;
const resultCountSpecialists = hasLiveNameQuery
  ? liveFilteredSpecialists
  : appliedFilteredSpecialists;
const hasResultCount = hasLiveNameQuery || hasAppliedFilters;
~~~

- [x] **Step 2: Produce the exact provider-oriented output copy**

Calculate labels from resultCountSpecialists and render the existing output when hasResultCount is true. Do not add nameInputValue to the filter-application effect or call onFilterChange from onChange.

~~~tsx
const resultCountLabel = resultCountSpecialists.length === 0
  ? 'No matching providers'
  : resultCountSpecialists.length === 1
    ? '1 matching provider'
    : String(resultCountSpecialists.length) + ' matching providers';
~~~

- [x] **Step 3: Make the output visible at desktop and retain mobile alignment**

Move shared compact-pill styles to the base selector. Add action-row alignment and spacing. Keep only the mobile left-push layout override in the media query.

~~~css
.filter-actions {
  align-self: end;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 84px;
}

.filter-result-count {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #b9dbf3;
  border-radius: 999px;
  background: #eef8ff;
  color: #1565c0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .filter-result-count {
    margin-right: auto;
  }
}
~~~

- [x] **Step 4: Run focused tests and confirm green behavior**

Run: CI=true npm test -- --watchAll=false src/FilterComponent.test.js

Run: node --test tests/filter-layout.test.js

Expected: live plural, singular, and zero copy passes; callback and navigation counts remain unchanged while typing; desktop CSS no longer hides the output.

- [x] **Step 5: Commit the implementation checkpoint**

~~~bash
git add src/FilterComponent.tsx src/FilterComponent.css src/FilterComponent.test.js tests/filter-layout.test.js
git commit -m "feat: show live filter result counts"
~~~

- [x] **Step 6: Keep desktop actions out of a constrained sixth grid column**

The added non-wrapping count would make the former five-filter-plus-action grid exceed the
760px desktop panel. Keep the five filter tracks and span the count/Clear action row across
the full grid. The regression test requires both the five-track grid and the full-span action
row; it was observed red before the CSS change and green afterward.

### Task 3: Validate, publish, and verify the production release

**Files:**
- Modify: docs/superpowers/plans/2026-08-08-live-filter-result-count.md

**Interfaces:**
- Consumes: protected GitHub main, CI workflow, and tag-only Sync and Deploy workflow.
- Produces: a reviewed main SHA, annotated SemVer release tag, and verified GitHub Pages publication.

- [x] **Step 1: Run the complete credential-free local suite**

~~~bash
npm run test:scripts
CI=true npm test -- --watchAll=false
npx tsc --noEmit
GENERATE_SOURCEMAP=false ./node_modules/.bin/react-scripts build
git diff --check
~~~

Expected: every command exits zero. The direct react-scripts build does not load a local secret file.

- [ ] **Step 2: Commit the completed plan and push the feature branch**

Mark completed plan items, then run:

~~~bash
git add docs/superpowers/plans/2026-08-08-live-filter-result-count.md
git commit -m "docs: record live filter count implementation"
git push -u origin codex/visible-filter-result-count
~~~

- [ ] **Step 3: Create and merge the release PR after required checks**

Create a ready PR from codex/visible-filter-result-count to main with the exact test commands in its body. Wait for protected Node and Python checks to pass, confirm the PR is mergeable and clean, then merge with rebase to preserve linear history. Fetch origin/main and record its new SHA.

- [ ] **Step 4: Tag and promote the exact validated main SHA**

Wait for the main push CI run to succeed. Choose the next available SemVer patch tag after v0.2.0, create an annotated tag pointing at that exact SHA, and push only that tag. Monitor Sync and Deploy through its production environment gate. Use the user's explicit break-glass authorization only if the production gate or an authorized deployment control blocks the release; never bypass failed tests or alter Sheet data outside the workflow.

- [ ] **Step 5: Verify the deployed artifact without exposing directory data**

Confirm the workflow conclusion is success, the production deployment state is success, the dereferenced release tag equals the validated main SHA, and the new gh-pages commit records that SHA. Request only the public app shell and static bundle; assert the bundle contains data-filter-result-count and matching providers, without retrieving provider data. Report the Squarespace embed status separately if it remains authenticated.
