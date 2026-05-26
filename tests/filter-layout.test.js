const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function cssBlock(selector) {
  const css = read('src/FilterComponent.css');
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing CSS block for ${selector}`);
  const end = css.indexOf('\n}', start);
  assert.notEqual(end, -1, `unterminated CSS block for ${selector}`);
  return css.slice(start, end);
}

test('filter panel keeps text readable and clear action aligned in flow', () => {
  const component = read('src/FilterComponent.tsx');
  const css = read('src/FilterComponent.css');
  assert.ok(component.includes('className="filter-group name-filter"'));
  assert.ok(component.includes('className="filter-actions"'));
  assert.ok(!css.includes('@media (max-width: 1200px) and (min-width: 901px)'));

  const clearButton = cssBlock('.filter-clear-all-btn');
  assert.ok(!/position:\s*absolute/.test(clearButton));

  const labels = cssBlock('.filter-group label');
  assert.match(labels, /letter-spacing:\s*0\b/);

  const panel = cssBlock('.topright-filter-container');
  assert.ok(!/52px/.test(panel));
});

test('empty filter selects match the name input height', () => {
  const input = cssBlock('.filter-input');
  const select = cssBlock('.react-select__control');
  const valueContainer = cssBlock('.react-select__value-container');
  const css = read('src/FilterComponent.css');

  assert.match(input, /height:\s*36px\b/);
  assert.match(select, /height:\s*36px\s*!important/);
  assert.match(select, /max-height:\s*36px\s*!important/);
  assert.match(valueContainer, /height:\s*100%\s*!important/);
  assert.ok(css.includes('.react-select__control:has(.react-select__multi-value)'));
  assert.ok(css.includes('.react-select__value-container--has-value'));
});

test('marker popup shows specialty before contact action', () => {
  const component = read('src/MapComponent.tsx');
  const popupDetails = component.indexOf('className="popup-details"');
  const specialty = component.indexOf('popup-specialties', popupDetails);
  const contactButton = component.indexOf('className="contact-me-btn"', popupDetails);

  assert.notEqual(popupDetails, -1);
  assert.ok(specialty > popupDetails, 'expected popup specialty row in popup details');
  assert.ok(contactButton > specialty, 'expected specialty to appear before contact button');
});

test('contact modal includes role details before direct contact methods', () => {
  const component = read('src/MapComponent.tsx');
  const modalContent = component.indexOf('className="contact-modal-content"');
  const jobTitle = component.indexOf('contact-job-title', modalContent);
  const interpreter = component.indexOf('contact-interpreter-services', modalContent);
  const email = component.indexOf('mailto:', modalContent);

  assert.notEqual(modalContent, -1);
  assert.ok(jobTitle > modalContent, 'expected job title in contact modal');
  assert.ok(interpreter > jobTitle, 'expected interpreter services after role details');
  assert.ok(email > interpreter, 'expected direct contact methods after role details');
});
