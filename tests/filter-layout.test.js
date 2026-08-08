const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function cssBlockFrom(filePath, selector) {
  const css = read(filePath);
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing CSS block for ${selector}`);
  const end = css.indexOf('\n}', start);
  assert.notEqual(end, -1, `unterminated CSS block for ${selector}`);
  return css.slice(start, end);
}

function cssBlock(selector) {
  return cssBlockFrom('src/FilterComponent.css', selector);
}

function appCssBlock(selector) {
  return cssBlockFrom('src/App.css', selector);
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

test('filter result count is visible beside Clear at desktop and mobile widths', () => {
  const component = read('src/FilterComponent.tsx');
  const css = read('src/FilterComponent.css');
  const resultCount = cssBlock('.filter-result-count');
  const mobileStart = css.indexOf('@media (max-width: 900px)');
  const mobileCss = css.slice(mobileStart);

  assert.ok(component.indexOf('data-filter-result-count') < component.indexOf('filter-clear-all-btn'));
  assert.match(resultCount, /display:\s*inline-flex\b/);
  assert.match(resultCount, /white-space:\s*nowrap\b/);
  assert.match(mobileCss, /\.filter-result-count\s*\{[^}]*margin-right:\s*auto/s);
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
  const popupDetails = component.indexOf('popup-details');
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

test('specialty rows use the DNA emoji on preview and detail surfaces', () => {
  const component = read('src/MapComponent.tsx');
  const modal = read('src/ContactDetailsModal.tsx');
  const tooltipRenderer = component.indexOf('const renderTooltipContent');
  const popupDetails = component.indexOf('className="popup-details"');
  const modalContent = modal.indexOf('className="contact-modal-content"');

  assert.ok(component.indexOf('🧬 Specialty:', tooltipRenderer) > tooltipRenderer, 'expected DNA specialty label in preview card');
  assert.ok(component.indexOf('🧬 Specialty:', popupDetails) > popupDetails, 'expected DNA specialty label in detail card');
  assert.ok(modal.indexOf('className="contact-icon" aria-hidden="true">🧬</span>', modalContent) > modalContent, 'expected DNA specialty icon in contact details');
  assert.ok(!component.includes('🔬'), 'expected microscope icon to be removed from specialty details');
  assert.ok(!modal.includes('🔬'), 'expected microscope icon to be removed from contact details');
});

test('provider preview and popup detail cards expose the same basic fact rows', () => {
  const component = read('src/MapComponent.tsx');
  const tooltipRenderer = component.indexOf('const renderTooltipContent');
  const tooltipEnd = component.indexOf('Click to contact', tooltipRenderer);
  const popupDetails = component.indexOf('popup-details');
  const popupEnd = component.indexOf('className="contact-me-btn"', popupDetails);
  const tooltipMarkup = component.slice(tooltipRenderer, tooltipEnd);
  const popupMarkup = component.slice(popupDetails, popupEnd);

  ['📍 Location:', '🧬 Specialty:', '🗣️ Languages:', '🔄 Interpreter Services:'].forEach((label) => {
    assert.ok(tooltipMarkup.includes(label), `expected preview card to include ${label}`);
    assert.ok(popupMarkup.includes(label), `expected detail card to include ${label}`);
  });
});

test('contact modal includes languages before interpreter services', () => {
  const modal = read('src/ContactDetailsModal.tsx');
  const modalContent = modal.indexOf('className="contact-modal-content"');
  const languages = modal.indexOf('contact-languages', modalContent);
  const interpreter = modal.indexOf('contact-interpreter-services', modalContent);

  assert.notEqual(modalContent, -1);
  assert.ok(languages > modalContent, 'expected languages in contact modal');
  assert.ok(interpreter > languages, 'expected interpreter services after languages');
});

test('cards use compact fact lists without reserving space for missing specialty rows', () => {
  const component = read('src/MapComponent.tsx');
  const css = read('src/App.css');
  const tooltipRenderer = component.indexOf('const renderTooltipContent');
  const popupDetails = component.indexOf('className="popup-details provider-facts"', tooltipRenderer);

  assert.ok(component.includes('className="provider-facts tooltip-facts"'));
  assert.ok(popupDetails > tooltipRenderer, 'expected popup details to share provider fact list spacing');
  assert.ok(component.includes('provider-fact-item popup-specialties'));
  assert.ok(!component.includes('className="provider-fact-item popup-specialties placeholder"'));

  const facts = appCssBlock('.provider-facts');
  const factItem = appCssBlock('.provider-fact-item');
  const detailLabel = appCssBlock('.provider-fact-label');

  assert.match(facts, /display:\s*grid\b/);
  assert.match(facts, /gap:\s*3px\b/);
  assert.match(factItem, /grid-template-columns:\s*max-content minmax\(0,\s*1fr\)/);
  assert.match(detailLabel, /white-space:\s*nowrap\b/);
  assert.ok(css.includes('.tooltip-facts .provider-fact-item'));
});

test('popup header treats the title as a tight subtitle before the institution', () => {
  const name = appCssBlock('.popup-name');
  const title = appCssBlock('.popup-title');
  const modalTitle = appCssBlock('.contact-modal-title');

  assert.match(name, /margin:\s*0\b/);
  assert.match(name, /line-height:\s*1\.1\b/);
  assert.match(title, /margin-top:\s*-3px\b/);
  assert.match(title, /line-height:\s*1\.1\b/);
  assert.match(title, /margin-bottom:\s*10px\b/);
  assert.match(modalTitle, /margin-top:\s*0\b/);
});

test('contact modal includes interpreter services before direct contact methods', () => {
  const modal = read('src/ContactDetailsModal.tsx');
  const modalContent = modal.indexOf('className="contact-modal-content"');
  const interpreter = modal.indexOf('contact-interpreter-services', modalContent);
  const email = modal.indexOf('mailto:', modalContent);

  assert.notEqual(modalContent, -1);
  assert.ok(interpreter > modalContent, 'expected interpreter services in contact modal');
  assert.ok(email > interpreter, 'expected direct contact methods after interpreter services');
});

test('popup and contact modal show job title as a subtitle under the name', () => {
  const component = read('src/MapComponent.tsx');
  const modal = read('src/ContactDetailsModal.tsx');
  const popupHeader = component.indexOf('className="popup-header"');
  const popupName = component.indexOf('className="popup-name"', popupHeader);
  const popupSubtitle = component.indexOf('className="popup-title"', popupHeader);
  const modalHeader = modal.indexOf('className="contact-modal-header"');
  const modalName = modal.indexOf('{safeName}</h3>', modalHeader);
  const modalSubtitle = modal.indexOf('className="contact-modal-title"', modalHeader);

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

test('contact detail modal has name-only heading, copy controls, and compact private-details guidance', () => {
  const modal = read('src/ContactDetailsModal.tsx');

  assert.match(modal, /<h3[^>]*>\{safeName\}<\/h3>/);
  assert.ok(!modal.includes('Contact {safeName}'));
  ['email', 'phone', 'website', 'address'].forEach((field) => {
    assert.ok(modal.includes(`field="${field}"`), `expected copy control for ${field}`);
  });
  assert.ok(modal.includes('globalgeneticsdirectory@gmail.com'));
  assert.ok(modal.includes('data-private-contact-toggle'));
  assert.ok(modal.includes('aria-controls="private-contact-guidance"'));
  assert.ok(modal.includes('hidden={!privateContactGuidanceVisible}'));
  assert.ok(modal.includes('verification-disclaimer'));
});

test('filter search controls share canonical desktop and mobile type sizes', () => {
  const css = read('src/FilterComponent.css');
  const canonicalStart = css.indexOf('/* Canonical search-field typography */');

  assert.ok(canonicalStart > -1, 'expected one final canonical typography block');
  const canonical = css.slice(canonicalStart);
  assert.match(canonical, /font-size:\s*13px\s*!important/);
  assert.match(canonical, /@media \(max-width:\s*900px\)/);
  assert.match(canonical, /font-size:\s*16px\s*!important/);
});
