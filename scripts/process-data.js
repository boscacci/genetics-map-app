const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const possiblePaths = [
  path.join(__dirname, '../../data.csv'),
  path.join(__dirname, '../data.csv'),
  path.join(__dirname, '../../genetics-map-app/data.csv'),
  path.join(process.cwd(), 'data.csv'),
  path.join(process.cwd(), '../data.csv'),
];

let csvPath = null;
let csvContent = null;

for (const testPath of possiblePaths) {
  try {
    if (fs.existsSync(testPath)) {
      csvPath = testPath;
      csvContent = fs.readFileSync(csvPath, 'utf8');
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!csvContent) {
  console.error('Could not find data.csv');
  process.exit(1);
}

const { data, errors } = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  delimiter: ',',
  quoteChar: '"'
});

if (errors.length > 0) {
  console.error('CSV parsing errors:', errors);
  process.exit(1);
}

const specialists = data.filter(item => {
  return item.Latitude && item.Longitude && 
         !isNaN(item.Latitude) && !isNaN(item.Longitude);
}).map(item => ({
  name_first: item.name_first || '',
  name_last: item.name_last || '',
  email: item.email || '',
  phone_work: item.phone_work || '',
  work_website: item.work_website || '',
  work_institution: item.work_institution || '',
  work_address: item.work_address || '',
  language_spoken: item.language_spoken || '',
  Latitude: parseFloat(item.Latitude),
  Longitude: parseFloat(item.Longitude),
  City: item.City || '',
  Country: item.Country || ''
}));

const jsContent = `// Auto-generated - DO NOT EDIT
export const specialistsData = ${JSON.stringify(specialists, null, 2)};

export const specialistsCount = ${specialists.length};
`;

const outputPath = path.join(__dirname, '../src/specialistsData.ts');
fs.writeFileSync(outputPath, jsContent);

console.log(`Processed ${specialists.length} records`); 