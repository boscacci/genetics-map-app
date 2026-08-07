# Private Contact Eye Control Design

## Goal

Make the existing private-contact fallback compact until a user asks for it, while keeping all suppressed provider contact information private.

## Approved interaction

When `hasPrivateContactDetails(specialist)` is true, the details modal renders one compact "Private details" button with an eye icon. It is initially collapsed. Activating the button toggles a guidance panel that says, "Please email globalgeneticsdirectory@gmail.com for further information." The visible email is a `mailto:` link.

The control is rendered once per modal even when several contact fields are hidden. It never reveals, reconstructs, copies, or places suppressed email, phone, address, or website values in the DOM.

## Accessibility and mobile behavior

The button has an accessible name, exposes its expanded state with `aria-expanded`, and identifies its panel with `aria-controls`. It receives a visible keyboard focus ring and has a 44px minimum touch target on mobile. Existing public contact links, copy controls, and selectable text remain unchanged.

## Disclaimer copy

The modal footer uses the client-guided, grammar-normalized copy:

> Disclaimer: We attempt to verify the credentials of every directory participant. If you notice any discrepancy, please email globalgeneticsdirectory@gmail.com.

The address remains a visible `mailto:` link. `globalgeneticsdirectory@gmail.com` is the only public admin address in this UI.

## Scope and constraints

- Modify only the contact-details modal, its styles, component tests, and this implementation documentation.
- Reuse the existing `hasPrivateContactDetails` privacy boundary; do not change Sheet data, public API data, `MapPoint`, or contact-field filtering.
- Do not add dependencies.
- Add deterministic regression coverage for collapsed state, toggle behavior, one-control behavior, public-data suppression, and revised disclaimer link/copy.

## Acceptance criteria

1. A provider with hidden or null-like contact data sees one collapsed eye control and no visible admin guidance initially.
2. Activating that control shows only the admin-email guidance and correctly updates `aria-expanded`.
3. Multiple hidden fields still produce one control, and private provider values are absent from the rendered modal.
4. Providers with only public contact data do not receive the private-details control.
5. The footer contains the approved disclaimer and a `mailto:globalgeneticsdirectory@gmail.com` link.
