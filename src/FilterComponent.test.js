import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FilterComponent from './FilterComponent';

global.IS_REACT_ACT_ENVIRONMENT = true;

const specialist = (nameFirst, nameLast) => ({
  name_first: nameFirst,
  name_last: nameLast,
  email: `${nameFirst.toLowerCase()}@example.test`,
  phone_work: '+1 555 0100',
  work_website: 'example.test',
  work_institution: 'Example Hospital',
  job_title: 'Genetic Counselor',
  work_address: '1 Main St',
  language_spoken: 'English',
  Latitude: 42,
  Longitude: -71,
  City: 'Boston',
  Country: 'United States',
  interpreter_services: 'TRUE',
  specialties: 'Cancer genetics',
});

describe('FilterComponent', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'table').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  const renderFilter = ({ specialists, onFilterChange, onMapNavigation }) => {
    act(() => {
      root.render(
        <FilterComponent
          specialists={specialists}
          onFilterChange={onFilterChange}
          onMapNavigation={onMapNavigation}
        />,
      );
    });
  };

  const setInput = async (input, value) => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set;

    await act(async () => {
      valueSetter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const commitSearch = async (input) => {
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter',
      }));
    });
  };

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
    const resultCount = container.querySelector('[data-filter-result-count]');
    expect(resultCount).not.toBeNull();
    expect(resultCount.getAttribute('aria-live')).toBe('polite');
    expect(resultCount.getAttribute('aria-atomic')).toBe('true');
    expect(resultCount.textContent)
      .toBe('2 matching providers');
    expect(filterCalls).toHaveLength(filterCallsBeforeTyping);
    expect(navigationCalls).toHaveLength(navigationCallsBeforeTyping);

    await commitSearch(input);
    expect(filterCalls.at(-1)).toHaveLength(2);
    expect(navigationCalls).toHaveLength(navigationCallsBeforeTyping + 1);
    expect(resultCount.textContent).toBe('2 matching providers');

    await setInput(input, 'Ada');
    expect(container.querySelector('[data-filter-result-count]').textContent)
      .toBe('1 matching provider');

    await setInput(input, 'Nobody');
    expect(container.querySelector('[data-filter-result-count]').textContent)
      .toBe('No matching providers');
  });
});
