import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ProviderFacts from './ProviderFacts';

global.IS_REACT_ACT_ENVIRONMENT = true;

const provider = (overrides = {}) => ({
  name_first: 'Ada',
  name_last: 'Lovelace',
  email: 'ada@example.test',
  phone_work: '+1 555 0100',
  work_website: 'example.test',
  work_institution: 'Example Hospital',
  job_title: 'Genetic Counselor',
  work_address: '1 Main St',
  language_spoken: 'English, Spanish',
  Latitude: 42,
  Longitude: -71,
  City: 'Boston',
  Country: 'United States',
  interpreter_services: 'TRUE',
  specialties: 'Cancer genetics',
  ...overrides,
});

describe('ProviderFacts', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderFacts = (specialist, variant = 'tooltip') => {
    act(() => {
      root.render(<ProviderFacts specialist={specialist} variant={variant} />);
    });
  };

  test.each(['tooltip', 'popup'])('renders four ordered facts with public values in the %s card', (variant) => {
    renderFacts(provider(), variant);

    const rows = Array.from(container.querySelectorAll('.provider-fact-item'));
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.textContent)).toEqual([
      '📍 Location:Boston, United States',
      '🧬 Specialty:Cancer genetics',
      '🗣️ Languages:English, Spanish',
      '🔄 Interpreter Services:Available',
    ]);
  });

  test.each(['tooltip', 'popup'])('renders Unknown for missing facts in the %s card', (variant) => {
    renderFacts(provider({
      City: 'NaN',
      Country: null,
      specialties: 'undefined',
      language_spoken: 'n/a',
      interpreter_services: undefined,
    }), variant);

    const rows = Array.from(container.querySelectorAll('.provider-fact-item'));
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.textContent)).toEqual([
      '📍 Location:Unknown',
      '🧬 Specialty:Unknown',
      '🗣️ Languages:Unknown',
      '🔄 Interpreter Services:Unknown',
    ]);
    expect(container.textContent).not.toContain('Private');
    expect(container.textContent).not.toContain('👁');
  });
});
