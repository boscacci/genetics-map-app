import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ContactDetailsModal from './ContactDetailsModal';

global.IS_REACT_ACT_ENVIRONMENT = true;

const ADMIN_EMAIL = 'contact@globalgeneticsdirectory.org';

const provider = (overrides = {}) => ({
  name_first: 'Ada',
  name_last: 'Lovelace',
  email: 'ada@example.test',
  phone_work: '+1 555 0100',
  work_website: 'example.test/profile',
  work_institution: 'Example Hospital',
  job_title: 'Genetic Counselor',
  work_address: 'Suite 4',
  language_spoken: 'English, Spanish',
  Latitude: 42,
  Longitude: -71,
  City: 'Boston',
  Country: 'United States',
  address_street: '1 Main St',
  address_state: 'MA',
  address_zip: '02110',
  interpreter_services: 'TRUE',
  specialties: 'Cancer genetics',
  ...overrides,
});

describe('ContactDetailsModal', () => {
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
    jest.restoreAllMocks();
  });

  const renderModal = (specialist = provider()) => {
    act(() => {
      root.render(<ContactDetailsModal specialist={specialist} onClose={() => {}} />);
    });
  };

  test('uses the provider name as the heading and includes the client disclaimer', () => {
    renderModal();

    expect(container.querySelector('.contact-modal-header h3').textContent).toBe('Ada Lovelace');
    expect(container.textContent).not.toContain('Contact Ada Lovelace');
    expect(container.textContent).toContain('Interpreter services: Available');
    expect(container.textContent).toContain(
      'Disclaimer: We attempt to verify the credentials of every directory participant. If you notice any discrepancy, please email contact@globalgeneticsdirectory.org.',
    );

    const adminLink = container.querySelector(`a[href="mailto:${ADMIN_EMAIL}"]`);
    expect(adminLink).not.toBeNull();
    expect(adminLink.textContent).toBe(ADMIN_EMAIL);
  });

  test('copies each public contact field and reports success accurately', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderModal();

    const expectedValues = {
      email: 'ada@example.test',
      phone: '+1 555 0100',
      website: 'example.test/profile',
      address: 'Suite 4\n1 Main St, Boston, MA 02110, United States',
    };

    for (const [field, value] of Object.entries(expectedValues)) {
      const button = container.querySelector(`[data-copy-field="${field}"]`);
      expect(button).not.toBeNull();
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(writeText).toHaveBeenLastCalledWith(value);
      expect(button.textContent).toBe('Copied');
    }
  });

  test('falls back to selectable text without claiming clipboard success', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    const addRange = jest.fn();
    const removeAllRanges = jest.fn();
    jest.spyOn(window, 'getSelection').mockReturnValue({ addRange, removeAllRanges });
    renderModal();

    const button = container.querySelector('[data-copy-field="email"]');
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(button.textContent).toBe('Select text');
    expect(removeAllRanges).toHaveBeenCalled();
    expect(addRange).toHaveBeenCalled();
  });

  test('reveals one admin guidance panel only after the private-details eye control is activated', () => {
    renderModal(provider({
      email: 'private@example.test',
      phone_work: '+1 555 0199',
      hide_email: 'TRUE',
      hide_phone: 'TRUE',
      hide_institution_address: 'TRUE',
    }));

    expect(container.textContent).not.toContain('private@example.test');
    expect(container.textContent).not.toContain('+1 555 0199');
    expect(container.querySelector('[data-copy-field="email"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="phone"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="address"]')).toBeNull();

    const toggle = container.querySelector('[data-private-contact-toggle]');
    expect(toggle).not.toBeNull();
    expect(container.querySelectorAll('[data-private-contact-toggle]')).toHaveLength(1);
    expect(toggle.textContent).toContain('👁');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('private-contact-guidance');
    const guidance = container.querySelector('#private-contact-guidance');
    expect(guidance).not.toBeNull();
    expect(guidance.hidden).toBe(true);

    act(() => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(guidance.hidden).toBe(false);
    expect(guidance.textContent).toContain(
      'Please email contact@globalgeneticsdirectory.org for further information.',
    );
    const guidanceLink = guidance.querySelector(`a[href="mailto:${ADMIN_EMAIL}"]`);
    expect(guidanceLink).not.toBeNull();
    expect(guidanceLink.textContent).toBe(ADMIN_EMAIL);

    act(() => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(guidance.hidden).toBe(true);
  });

  test('does not expose the retired public Gmail address', () => {
    renderModal(provider({ hide_email: 'TRUE' }));

    expect(container.textContent).not.toContain('globalgeneticsdirectory@gmail.com');
    expect(container.querySelector('a[href="mailto:globalgeneticsdirectory@gmail.com"]')).toBeNull();
  });

  test('does not render private-details guidance when every contact field is public', () => {
    renderModal();

    expect(container.querySelector('[data-private-contact-toggle]')).toBeNull();
    expect(container.querySelector('#private-contact-guidance')).toBeNull();
  });

  test('shows the same eight fields for a sparse provider, each marked Unknown instead of omitted', () => {
    renderModal(provider({
      work_institution: '',
      specialties: '',
      language_spoken: '',
      interpreter_services: undefined,
      email: '',
      phone_work: '',
      work_website: '',
      work_address: '',
      address_street: '',
      address_state: '',
      address_zip: '',
      City: '',
      Country: '',
    }));

    const rows = container.querySelectorAll('.contact-modal-content .contact-item');
    expect(rows).toHaveLength(8);
    expect(container.textContent).toContain('Interpreter services: Unknown');
    expect(container.querySelectorAll('.contact-text-unknown')).toHaveLength(8);
    expect(container.querySelector('[data-copy-field="email"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="phone"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="website"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="address"]')).toBeNull();
    expect(container.textContent).not.toContain('Private');
  });

  test('marks every privacy-flagged field as Private in place, without shrinking the field count', () => {
    renderModal(provider({
      hide_workinstitution: 'TRUE',
      hide_email: 'TRUE',
      hide_phone: 'TRUE',
      hide_institution_address: 'TRUE',
    }));

    const rows = container.querySelectorAll('.contact-modal-content .contact-item');
    expect(rows).toHaveLength(8);
    expect(container.querySelectorAll('.contact-text-private')).toHaveLength(4);
    expect(container.textContent).not.toContain('ada@example.test');
    expect(container.textContent).not.toContain('+1 555 0100');
    expect(container.textContent).not.toContain('Example Hospital');
    expect(container.querySelector('[data-copy-field="email"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="phone"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="address"]')).toBeNull();
  });

  test('suppresses null-like contact values without constructing links', () => {
    renderModal(provider({
      email: 'NaN',
      phone_work: Number.NaN,
      work_website: 'undefined',
    }));

    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('undefined');
    expect(container.querySelector('[data-copy-field="email"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="phone"]')).toBeNull();
    expect(container.querySelector('[data-copy-field="website"]')).toBeNull();
    expect(container.querySelectorAll('[data-private-contact-toggle]')).toHaveLength(1);
    const guidance = container.querySelector('#private-contact-guidance');
    expect(guidance).not.toBeNull();
    expect(guidance.hidden).toBe(true);
  });
});
