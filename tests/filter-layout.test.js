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

test('initial provider tooltip shows specialty before contact prompt', () => {
  const component = read('src/MapComponent.tsx');
  const tooltipRenderer = component.indexOf('const renderTooltipContent');
  const specialty = component.indexOf('tooltip-specialties', tooltipRenderer);
  const contactPrompt = component.indexOf('Click to contact', tooltipRenderer);

  assert.notEqual(tooltipRenderer, -1);
  assert.ok(specialty > tooltipRenderer, 'expected specialty in the first provider tooltip');
  assert.ok(contactPrompt > specialty, 'expected specialty before the contact prompt');
});

test('contact modal includes interpreter services before direct contact methods', () => {
  const component = read('src/MapComponent.tsx');
  const modalContent = component.indexOf('className="contact-modal-content"');
  const interpreter = component.indexOf('contact-interpreter-services', modalContent);
  const email = component.indexOf('mailto:', modalContent);

  assert.notEqual(modalContent, -1);
  assert.ok(interpreter > modalContent, 'expected interpreter services in contact modal');
  assert.ok(email > interpreter, 'expected direct contact methods after interpreter services');
});

test('popup and contact modal show job title as a subtitle under the name', () => {
  const component = read('src/MapComponent.tsx');
  const popupHeader = component.indexOf('className="popup-header"');
  const popupName = component.indexOf('className="popup-name"', popupHeader);
  const popupSubtitle = component.indexOf('className="popup-title"', popupHeader);
  const modalHeader = component.indexOf('className="contact-modal-header"');
  const modalName = component.indexOf('Contact {safeName}', modalHeader);
  const modalSubtitle = component.indexOf('className="contact-modal-title"', modalHeader);

  assert.ok(popupName > popupHeader, 'expected popup name in header');
  assert.ok(popupSubtitle > popupName, 'expected popup title subtitle under the name');
  assert.ok(modalName > modalHeader, 'expected contact modal name in header');
  assert.ok(modalSubtitle > modalName, 'expected contact modal title subtitle under the name');
});

test('interpreter services are shown even when the Sheet value is false or unknown', () => {
  const component = read('src/MapComponent.tsx');

  assert.ok(component.includes('formatInterpreterServices'));
  assert.ok(component.includes('const interpreterServicesText = formatInterpreterServices(specialist.interpreter_services);'));
  assert.ok(!component.includes('const interpreterAvailable = isFlagTrue(specialist.interpreter_services);'));
  assert.ok(component.includes('{interpreterServicesText}'));
});
