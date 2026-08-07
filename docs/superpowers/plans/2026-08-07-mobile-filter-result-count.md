# Mobile Filter Result Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Show the number of applied filter matches inside the mobile filter sheet, above the keyboard and alongside Clear.

**Architecture:** Factor the existing country, city, language, specialty, and committed-name criteria into one filterSpecialists path in FilterComponent. Reuse that array for both the existing onFilterChange map callback and an inline result-status output, so the status cannot disagree with the filtered data passed through onFilterChange.

**Tech Stack:** React 19, TypeScript, Create React App, Jest, React DOM test utilities, CSS.

## Global Constraints

- Keep name filtering committed on Go/Enter; do not filter the map or announce a count while a name is only being typed.
- Show 1 result, N results, or No results only when at least one filter is applied.
- Visually show the status only below the existing 900px mobile breakpoint; preserve the desktop map counter and Clear control.
- Use the exact same filtered array for the result count and onFilterChange.
- Preserve the existing zero-match global-map fallback; the status explicitly reports No results.
- Do not change Sheet data, API data, map navigation rules, public interfaces, or dependencies.

---

### Task 1: Add rendered behavior coverage for the mobile result status

**Files:**
- Create: src/FilterComponent.test.js

**Interfaces:**
- Consumes: FilterComponent props specialists and onFilterChange, plus the Name input with aria-label Search by provider name.
- Produces: regression coverage for data-filter-result-count and the exact filtered array passed to the map callback.

- [x] **Step 1: Write the failing interaction test**

Render the real component with two fictional Megan records and one Ada record. Track the callback result in a local variable rather than asserting on a mock. Confirm typing alone shows no status, then Go/Enter shows the committed count and matching array.

~~~js
test('shows the committed name-search result count beside Clear', async () => {
  let latestFiltered = [];
  renderFilter({
    specialists: [specialist('Megan', 'A'), specialist('Megan', 'B'), specialist('Ada', 'Lovelace')],
    onFilterChange: (filtered) => { latestFiltered = filtered; },
  });

  const input = container.querySelector('input[aria-label="Search by provider name"]');
  await setInput(input, 'Megan');
  expect(container.querySelector('[data-filter-result-count]')).toBeNull();

  await commitSearch(input);
  expect(container.querySelector('[data-filter-result-count]').textContent).toBe('2 results');
  expect(latestFiltered).toHaveLength(2);

  await setInput(input, 'Ada');
  await commitSearch(input);
  expect(container.querySelector('[data-filter-result-count]').textContent).toBe('1 result');

  await setInput(input, 'Nobody');
  await commitSearch(input);
  expect(container.querySelector('[data-filter-result-count]').textContent).toBe('No results');
  expect(latestFiltered).toHaveLength(0);
});
~~~

setInput uses the native HTMLInputElement value setter followed by a bubbling input event inside React act. commitSearch dispatches a bubbling KeyboardEvent with key Enter inside act.

- [x] **Step 2: Run the focused test to verify it fails**

Run: CI=true npm test -- --watchAll=false src/FilterComponent.test.js

Expected: FAIL because FilterComponent currently renders no data-filter-result-count output.

### Task 2: Reuse one filter path and render the mobile status

**Files:**
- Modify: src/FilterComponent.tsx
- Modify: src/FilterComponent.css

**Interfaces:**
- Consumes: selected-filter state and nameSearchQuery committed by Go/Enter.
- Produces: filterSpecialists(...), appliedFilteredSpecialists, hasAppliedFilters, resultCountLabel, and data-filter-result-count.

- [x] **Step 1: Extract the existing criteria into one pure filter helper**

Add a module-local helper that receives the data and current selections, applies the existing criteria in the existing order, and returns the result array.

~~~tsx
const filterSpecialists = (
  specialists: MapPoint[],
  selectedCountries: string[],
  selectedCities: string[],
  selectedLanguages: string[],
  selectedSpecialties: string[],
  nameSearchQuery: string,
): MapPoint[] => {
  let filtered = [...specialists];

  if (selectedCountries.length > 0) {
    filtered = filtered.filter((specialist) =>
      Boolean(specialist.Country) && selectedCountries.includes(specialist.Country!),
    );
  }
  if (selectedCities.length > 0) {
    filtered = filtered.filter((specialist) =>
      Boolean(specialist.City) && selectedCities.includes(specialist.City!),
    );
  }
  if (selectedLanguages.length > 0) {
    filtered = filtered.filter((specialist) => {
      if (!specialist.language_spoken) return false;
      const languages = specialist.language_spoken
        .split(/,|;|\sand\s|\s+/)
        .map((language) => cleanLanguageString(language))
        .filter(Boolean);
      return selectedLanguages.some((selectedLanguage) =>
        languages.some((language) => language.toLowerCase().includes(selectedLanguage.toLowerCase())),
      );
    });
  }
  if (selectedSpecialties.length > 0) {
    filtered = filtered.filter((specialist) => {
      if (!specialist.specialties) return false;
      const specialties = getSpecialtyBuckets(specialist.specialties);
      return selectedSpecialties.some((selectedSpecialty) => specialties.includes(selectedSpecialty));
    });
  }
  if (nameSearchQuery.trim()) {
    const query = nameSearchQuery.trim().toLowerCase();
    filtered = filtered.filter((specialist) => {
      const fullName = `${specialist.name_first || ''} ${specialist.name_last || ''}`.trim().toLowerCase();
      return Boolean(fullName) && fullName.includes(query);
    });
  }

  return filtered;
};
~~~

Derive one memoized array and reuse it in getRemainingSpecialists and applyFilters.

~~~tsx
const appliedFilteredSpecialists = useMemo(
  () => filterSpecialists(
    specialists,
    selectedCountries,
    selectedCities,
    selectedLanguages,
    selectedSpecialties,
    nameSearchQuery,
  ),
  [specialists, selectedCountries, selectedCities, selectedLanguages, selectedSpecialties, nameSearchQuery],
);
~~~

- [x] **Step 2: Derive and render the status in the existing action row**

~~~tsx
const hasAppliedFilters = selectedCountries.length > 0
  || selectedCities.length > 0
  || selectedLanguages.length > 0
  || selectedSpecialties.length > 0
  || nameSearchQuery.trim().length > 0;
const resultCountLabel = appliedFilteredSpecialists.length === 0
  ? 'No results'
  : appliedFilteredSpecialists.length === 1
    ? '1 result'
    : String(appliedFilteredSpecialists.length) + ' results';
~~~

Insert this before the Clear button.

~~~tsx
{hasAppliedFilters && (
  <output
    className="filter-result-count"
    data-filter-result-count
    aria-live="polite"
    aria-atomic="true"
  >
    {resultCountLabel}
  </output>
)}
~~~

- [x] **Step 3: Style the status for the mobile action row**

Keep .filter-result-count visually hidden at desktop widths. Inside the existing @media (max-width: 900px) block, display it as a non-interactive blue pill with margin-right: auto, min-height: 32px, readable text, and white-space: nowrap. This keeps Clear at the right edge and makes the count visible above the keyboard.

- [x] **Step 4: Run the focused test to verify it passes**

Run: CI=true npm test -- --watchAll=false src/FilterComponent.test.js

Expected: PASS for two, one, and zero committed name-search results; typing alone remains status-free.

### Task 3: Validate and preserve the branch for integration

**Files:**
- Modify: docs/superpowers/specs/2026-08-07-mobile-filter-result-count-design.md
- Create: docs/superpowers/plans/2026-08-07-mobile-filter-result-count.md
- Modify: src/FilterComponent.tsx
- Modify: src/FilterComponent.css
- Create: src/FilterComponent.test.js

**Interfaces:**
- Consumes: existing Node and React validation commands.
- Produces: a clean, test-backed feature branch that remains unpushed until requested.

- [x] **Step 1: Run the full credential-free validation suite**

Run: npm run test:scripts; CI=true npm test -- --watchAll=false; npx tsc --noEmit; GENERATE_SOURCEMAP=false ./node_modules/.bin/react-scripts build; git diff --check.

Expected: every command exits zero; generated build output remains ignored.

Browser-validation note: this checkout has no Playwright package or browser executable. Do not add a dependency for this focused change; exercise the mobile filter sheet at a 390px viewport during CI or release validation where Playwright is available.

- [x] **Step 2: Inspect and commit only the scoped changes**

Run: git diff --check; git status --short; git add src/FilterComponent.tsx src/FilterComponent.css src/FilterComponent.test.js docs/superpowers/specs/2026-08-07-mobile-filter-result-count-design.md docs/superpowers/plans/2026-08-07-mobile-filter-result-count.md; git commit -m "feat: show mobile filter result counts".

Expected: a local feature commit that does not push, merge, tag, or deploy without new user authorization.
