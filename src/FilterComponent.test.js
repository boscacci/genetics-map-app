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

  const renderFilter = ({ specialists, onFilterChange }) => {
    act(() => {
      root.render(
        <FilterComponent
          specialists={specialists}
          onFilterChange={onFilterChange}
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

  test('shows the committed name-search result count beside Clear', async () => {
    let latestFiltered = [];
    renderFilter({
      specialists: [
        specialist('Megan', 'A'),
        specialist('Megan', 'B'),
        specialist('Ada', 'Lovelace'),
      ],
      onFilterChange: (filtered) => {
        latestFiltered = filtered;
      },
    });

    const input = container.querySelector('input[aria-label="Search by provider name"]');
    expect(container.querySelector('[data-filter-result-count]')).toBeNull();

    await setInput(input, 'Megan');
    expect(container.querySelector('[data-filter-result-count]')).toBeNull();

    await commitSearch(input);
    let resultCount = container.querySelector('[data-filter-result-count]');
    expect(resultCount).not.toBeNull();
    expect(resultCount.textContent).toBe('2 results');
    expect(latestFiltered).toHaveLength(2);

    await setInput(input, 'Ada');
    await commitSearch(input);
    resultCount = container.querySelector('[data-filter-result-count]');
    expect(resultCount).not.toBeNull();
    expect(resultCount.textContent).toBe('1 result');
    expect(latestFiltered).toHaveLength(1);

    await setInput(input, 'Nobody');
    await commitSearch(input);
    resultCount = container.querySelector('[data-filter-result-count]');
    expect(resultCount).not.toBeNull();
    expect(resultCount.textContent).toBe('No results');
    expect(latestFiltered).toHaveLength(0);
  });
});
