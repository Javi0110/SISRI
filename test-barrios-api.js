// A simple test script for the barrios search API
// Run with: node test-barrios-api.js

const fetch = require('node-fetch');

async function testBarriosSearch() {
  try {
    // Test searching with a municipio ID but no search term
    console.log('Testing empty search term...');
    const emptySearchResponse = await fetch('http://localhost:3000/api/barrios/search?term=&municipioId=1');
    const emptySearchResults = await emptySearchResponse.json();
    console.log(`Empty search returned ${emptySearchResults.length} results`);
    console.log(emptySearchResults);

    // Test searching with a partial term
    console.log('\nTesting partial search term...');
    const partialSearchResponse = await fetch('http://localhost:3000/api/barrios/search?term=Sa&municipioId=1');
    const partialSearchResults = await partialSearchResponse.json();
    console.log(`Partial search returned ${partialSearchResults.length} results`);
    console.log(partialSearchResults);

    // Test searching with a full term
    console.log('\nTesting full search term...');
    const fullSearchResponse = await fetch('http://localhost:3000/api/barrios/search?term=Sabana&municipioId=1');
    const fullSearchResults = await fullSearchResponse.json();
    console.log(`Full search returned ${fullSearchResults.length} results`);
    console.log(fullSearchResults);

  } catch (error) {
    console.error('Error running test:', error);
  }
}

testBarriosSearch(); 