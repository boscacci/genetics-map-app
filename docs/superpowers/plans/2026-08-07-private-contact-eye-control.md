# Private Contact Eye Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-visible private-contact fallback with one compact, accessible eye control that reveals only the public admin-email guidance on demand.

**Architecture:** `ContactDetailsModal` already owns the privacy boundary through `hasPrivateContactDetails`. Add one local boolean state to control guidance visibility and leave existing field-level filtering unchanged. Component tests exercise rendered modal behavior, while CSS supplies the compact visual treatment and mobile touch target.

**Tech Stack:** React 18, TypeScript, Create React App, Jest, React DOM test utilities, CSS.

## Global Constraints

- Render the control only when `hasPrivateContactDetails(specialist)` is true; render it exactly once per modal.
- The control starts collapsed; its `#private-contact-guidance` panel remains in the DOM with `hidden` until expanded and reveals only `Please email contact@globalgeneticsdirectory.org for further information.` with a `mailto:` link.
- Never render, copy, reconstruct, or link to a hidden contact value.
- Use `contact@globalgeneticsdirectory.org` as the only public admin address.
- Preserve existing public links, copy controls, selection fallback, `MapPoint`, Sheet schema, and API data.
- Use no new dependency.

---

### Task 1: Specify the private-details interaction with component regressions

**Files:**
- Modify: `src/ContactDetailsModal.test.js`
- Modify: `tests/filter-layout.test.js`

**Interfaces:**
- Consumes: `ContactDetailsModal` and its existing `specialist: MapPoint` props.
- Produces: regression coverage for `[data-private-contact-toggle]`, `#private-contact-guidance`, and the footer `mailto:` link.

- [x] **Step 1: Write the failing collapsed/expanded private-guidance test**

Replace the current always-visible private-note assertion with this rendered-user-behavior test:

```js
test('reveals one admin guidance panel only after the private-details eye control is activated', () => {
  renderModal(provider({
    email: 'private@example.test',
    phone_work: '+1 555 0199',
    hide_email: 'TRUE',
    hide_phone: 'TRUE',
    hide_institution_address: 'TRUE',
  }));

  const toggle = container.querySelector('[data-private-contact-toggle]');
  expect(toggle).not.toBeNull();
  expect(container.querySelectorAll('[data-private-contact-toggle]')).toHaveLength(1);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  const guidance = container.querySelector('#private-contact-guidance');
  expect(guidance.hidden).toBe(true);
  expect(container.textContent).not.toContain('private@example.test');

  act(() => {
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(guidance.hidden).toBe(false);
  expect(guidance.textContent).toContain('Please email contact@globalgeneticsdirectory.org for further information.');
  expect(guidance.querySelector(`a[href="mailto:${ADMIN_EMAIL}"]`).textContent).toBe(ADMIN_EMAIL);
});
```

This catches realistic bugs where guidance is visible before activation, multiple eye controls appear, or an accidental private value is rendered.

- [x] **Step 2: Add the absence and disclaimer behavior tests**

Add a public-only assertion and update the footer assertion to the approved client copy:

```js
test('does not render private-details guidance when every contact field is public', () => {
  renderModal();

  expect(container.querySelector('[data-private-contact-toggle]')).toBeNull();
  expect(container.querySelector('#private-contact-guidance')).toBeNull();
});

expect(container.textContent).toContain(
  'Disclaimer: We attempt to verify the credentials of every directory participant. If you notice any discrepancy, please email contact@globalgeneticsdirectory.org.',
);
```

- [x] **Step 3: Run the focused test to verify it fails**

Run: `CI=true npm test -- --watchAll=false src/ContactDetailsModal.test.js`

Expected: FAIL because the current modal does not render the eye control or an initially hidden guidance panel.

### Task 2: Implement the privacy-safe control and client disclaimer

**Files:**
- Modify: `src/ContactDetailsModal.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `showPrivateContactNote: boolean`, `ADMIN_EMAIL`, existing modal DOM, and CSS conventions.
- Produces: `privateContactGuidanceVisible` state and the `data-private-contact-toggle` / `private-contact-guidance` DOM contract from Task 1.

- [x] **Step 1: Add one local disclosure state and replace the old always-visible note**

Add the state alongside `copyStatuses`:

```tsx
const [privateContactGuidanceVisible, setPrivateContactGuidanceVisible] = useState(false);
```

Replace `.private-contact-note` with this conditional markup:

```tsx
{showPrivateContactNote && (
  <div className="private-contact-details">
    <button
      type="button"
      className="private-contact-toggle"
      data-private-contact-toggle
      aria-expanded={privateContactGuidanceVisible}
      aria-controls="private-contact-guidance"
      onClick={() => setPrivateContactGuidanceVisible((visible) => !visible)}
    >
      <span aria-hidden="true">👁</span>
      <span>Private details</span>
    </button>
    <div
      id="private-contact-guidance"
      className="private-contact-guidance"
      role="status"
      hidden={!privateContactGuidanceVisible}
    >
      Please email <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a> for further information.
    </div>
  </div>
)}
```

- [x] **Step 2: Replace the footer with the approved, grammar-normalized disclaimer**

Render the footer text as:

```tsx
Disclaimer: We attempt to verify the credentials of every directory participant.
{' '}If you notice any discrepancy, please email{' '}
<a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a>.
```

- [x] **Step 3: Add compact, accessible styling**

Replace the old `.private-contact-note` rules with styles that preserve the existing palette, add a visible `:focus-visible` outline, and provide `min-height: 44px` for the button. Style `.private-contact-guidance` as the existing muted amber guidance panel, and extend the shared link-color selector to `.private-contact-guidance a`.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `CI=true npm test -- --watchAll=false src/ContactDetailsModal.test.js`

Expected: PASS with the new interaction and existing public-contact copy tests.

### Task 3: Validate the change and prepare a reviewable branch

**Files:**
- Modify: `docs/superpowers/specs/2026-08-07-private-contact-eye-control-design.md`
- Modify: `docs/superpowers/plans/2026-08-07-private-contact-eye-control.md`
- Modify: `src/ContactDetailsModal.tsx`
- Modify: `src/ContactDetailsModal.test.js`
- Modify: `src/App.css`
- Modify: `tests/filter-layout.test.js`

**Interfaces:**
- Consumes: the final test-covered component and existing repository scripts.
- Produces: a clean, reviewable branch with a deterministic verification record.

- [x] **Step 1: Run the required validation suite**

Run:

```bash
npm run test:scripts
CI=true npm test -- --watchAll=false
npx tsc --noEmit
GENERATE_SOURCEMAP=false ./node_modules/.bin/react-scripts build
git diff --check
```

Expected: every command exits zero; the production build creates `build/` only as ignored output.

Browser-validation note: the local environment has no Playwright package or CLI and no Chromium/Chrome executable. The implementation does not add a test dependency; run the desktop and 390px mobile modal interaction during CI or release validation where that runtime is available.

- [x] **Step 2: Inspect the final diff and status**

Run:

```bash
git diff --check
git status --short
git diff -- src/ContactDetailsModal.tsx src/ContactDetailsModal.test.js src/App.css
```

Expected: only scoped modal, CSS, regression-test, and documentation changes are present; no secret, provider, or generated build file is staged.

- [x] **Step 3: Commit the implementation**

Run:

```bash
git add src/ContactDetailsModal.tsx src/ContactDetailsModal.test.js src/App.css tests/filter-layout.test.js docs/superpowers/specs/2026-08-07-private-contact-eye-control-design.md docs/superpowers/plans/2026-08-07-private-contact-eye-control.md
git commit -m "feat: add private contact eye control"
```

Expected: the feature branch contains a test-backed implementation commit ready for review. Do not push, create a pull request, merge, tag, or deploy without a new user authorization.
