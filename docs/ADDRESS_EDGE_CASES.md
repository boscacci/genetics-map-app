# Address Formatter Edge Cases

This note captures known drawbacks of the current hybrid address formatter in `src/MapComponent.tsx`.

## How it works

- It keeps useful free-text detail from `work_address`.
- It removes fragments that appear to duplicate structured Google-derived fields:
  - `address_street`
  - `City`
  - `address_state`
  - `address_zip`
  - `Country`
- It then appends the clean structured line.

## Known drawbacks

- Token-based matching is heuristic, not semantic.
- Country aliases are only partially covered (`USA`, `US`, `U.S.A.`, `UK`, etc.).
- State/province abbreviations can still be inconsistent with long-form participant text.
- Non-comma-separated free-text addresses are harder to de-duplicate cleanly.
- Some venue/building names may contain location words that are actually meaningful and should remain.
- Some locations legitimately repeat terms, and the formatter may over-trim or under-trim.
- If Google returns sparse structured components, the formatter falls back to more of the participant-entered text.

## Example cases to watch

- `MSR North tower, 7th floor, Strand Life sciences, Nagavara, Bengaluru, Karnataka, India`
  - Risk: `Karnataka` and `KA` may both appear if the strings do not normalize cleanly enough.

- `Children's Hospital at Montefiore Division of Genetic Medicine Bronx, NY 10467`
  - Risk: `Bronx` may still appear inside the venue fragment even when the structured line also includes `The Bronx, NY 10467`.

- `Reading Pa, USA`
  - Risk: `Reading` is ambiguous because it can be a city name or part of a more descriptive fragment.

- `Av. Contreras 300. Av. Contreras 300San Jerónimo Lídice, La Magdalena Contreras, 10200 Ciudad de México, CDMX, Mexico`
  - Risk: malformed punctuation or merged tokens can prevent clean fragment splitting.

## If this proves too fragile

The cleaner long-term option is to render two explicit lines:

- `participant_address_detail`
- `google_structured_address`

That avoids hiding useful detail while making the structured location unambiguous.
