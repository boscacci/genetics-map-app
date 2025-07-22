function geocodeInstitutionAddresses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const geocoder = Maps.newGeocoder().setLanguage('en');

  Logger.log('Starting geocodeInstitutionAddresses – total rows: ' + (data.length - 1));
  console.log({message:'Start geocoding','totalRows':data.length - 1});

  // Columns: A=0, ..., I=8 ("Interpretation Services" is col 8)
  // We'll write geocoding results to columns J (9), K (10), L (11), M (12)
  // Header row for geocoding columns
  sheet.getRange(1, 10, 1, 4).setValues([['Latitude','Longitude','City','Country']]);

  for (let i = 1; i < data.length; i++) {
    const inst = data[i][5] || '';   // work_institution (col F, index 5)
    const addr = data[i][6] || '';   // work_address (col G, index 6)
    const full = [inst, addr].filter(Boolean).join(', ');
    Logger.log(`Row ${i + 1}: full address "${full}"`);
    console.log({row:i + 1, inst, addr, full});

    let lat = '', lng = '', city = '', country = '';

    if (full) {
      const resp = geocoder.geocode(full);
      Logger.log(`Row ${i + 1}: geocode status = ${resp.status}`);
      console.log({row:i + 1, status: resp.status});
      if (resp.status === 'OK' && resp.results && resp.results[0]) {
        const res = resp.results[0];
        lat = res.geometry.location.lat;
        lng = res.geometry.location.lng;
        Logger.log(`Row ${i + 1}: lat=${lat}, lng=${lng}`);
        console.log({row:i + 1, lat, lng});

        res.address_components.forEach(comp => {
          if (comp.types.includes('locality')) {
            city = comp.short_name;
          } else if (comp.types.includes('country')) {
            country = comp.long_name;
          }
        });
        Logger.log(`Row ${i + 1}: city="${city}", country="${country}"`);
        console.log({row:i + 1, city, country});
      } else {
        Logger.log(`Row ${i + 1}: no result or status not OK`);
      }
      Utilities.sleep(200);
    } else {
      Logger.log(`Row ${i + 1}: full address blank—skipped`);
    }

    // Write geocoding results to columns J-M (10-13), for this row (i+1)
    sheet.getRange(i + 1, 10, 1, 4).setValues([[lat, lng, city, country]]);
  }

  Logger.log('Geocoding complete');
  console.log({message:'Complete'});
}
