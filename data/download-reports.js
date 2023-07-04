/**
 * 1. Download metadata about reports from KNoWS pod.
 * 2. Download img folder from Challenges repo: https://github.com/SolidLabResearch/Challenges/tree/main/reports/img
 */

const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const fs = require('fs-extra');
const fetch = require('node-fetch-commonjs');
const { exec } = require("child_process");

main();

async function main() {
  const myEngine = new QueryEngine();

  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  SELECT * WHERE {
    ?report a schema:Report;
      schema:name ?title. 
  }`, {
    sources: ['https://data.knows.idlab.ugent.be/person/office/solidlab-challenges'],
  });

  const bindings = await bindingsStream.toArray();
  const markdown = generateList(bindings);
  let indexTemplate = await fs.readFile('challenge-report-index-template.md', 'utf8');
  indexTemplate = indexTemplate.replace('{{{LIST_ALL_REPORTS}}}', markdown);
  fs.writeFile('../docs/challenge-reports/index.md', indexTemplate);

  // Download Markdown files
  for (const binding of bindings) {
    const localUrl = binding.get('report').id.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '../docs/challenge-reports');
    downloadMarkdownFile(binding.get('report').id, localUrl);
  }

  downloadImages();
}

function generateList(bindings) {
  let markdown = '';

  for (const binding of bindings) {
    const localUrl = binding.get('report').id.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '.');
    markdown += `- [${binding.get('title').value}](${localUrl})\n`;
  }

  return markdown;
}

async function downloadMarkdownFile(url, outputPath) {
  url = url.replace('blob', 'raw');
  const response = await fetch(url);
  const markdown = await response.text();
  fs.writeFile(outputPath, markdown);
}

function downloadImages() {
  exec(`rm -rf challenges-git && rm -rf ../docs/challenge-reports/img && mkdir ../docs/challenge-reports/img && git clone https://github.com/SolidLabResearch/Challenges.git challenges-git && cd challenges-git/reports/ && cp -r img/* ../../../docs/challenge-reports/img`);
}
