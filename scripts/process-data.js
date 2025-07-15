const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Try multiple possible locations for the CSV file
const possiblePaths = [
  path.join(__dirname, '../../data.csv'),  // Parent directory (local development)
  path.join(__dirname, '../data.csv'),     // Same level as genetics-map-app (GitHub Actions)
  path.join(__dirname, '../../genetics-map-app/data.csv'), // Alternative path
  path.join(process.cwd(), 'data.csv'),    // Current working directory
  path.join(process.cwd(), '../data.csv'), // Parent of current working directory
];

let csvPath = null;
let csvContent = null;

// Try to find the CSV file
for (const testPath of possiblePaths) {
  try {
    if (fs.existsSync(testPath)) {
      csvPath = testPath;
      csvContent = fs.readFileSync(csvPath, 'utf8');
      console.log(`📁 Found data.csv at: ${csvPath}`);
      console.log(`📊 File size: ${csvContent.length} characters`);
      console.log(`📄 First 100 characters: ${csvContent.substring(0, 100)}`);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!csvContent) {
  console.error('❌ Could not find data.csv in any of the expected locations:');
  possiblePaths.forEach(path => console.error(`   - ${path}`));
  console.error('\nPlease ensure data.csv is available in one of these locations.');
  process.exit(1);
}

// Parse CSV with explicit delimiter
const { data, errors } = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  delimiter: ',',  // Explicitly specify comma delimiter
  quoteChar: '"'   // Explicitly specify quote character
});

if (errors.length > 0) {
  console.error('CSV parsing errors:', errors);
  console.error('CSV content preview:', csvContent.substring(0, 500));
  process.exit(1);
}

// Filter specialists with valid coordinates
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

// Create the JavaScript module content
const jsContent = `// Auto-generated from data.csv - DO NOT EDIT MANUALLY
export const specialistsData = ${JSON.stringify(specialists, null, 2)};

export const specialistsCount = ${specialists.length};
`;

// Write to src directory
const outputPath = path.join(__dirname, '../src/specialistsData.ts');
fs.writeFileSync(outputPath, jsContent);

console.log(`✅ Processed ${specialists.length} specialists with valid coordinates`);
console.log(`📁 Data written to: ${outputPath}`); 