/**
 * 1. Download metadata about reports from KNoWS pod.
 * 2. Download img folder from Challenges repo: https://github.com/SolidLabResearch/Challenges/tree/main/reports/img
 */

const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const fs = require('fs-extra');
const fetch = require('node-fetch-commonjs');
const {exec} = require("child_process");

const myEngine = new QueryEngine();

generateMarkdownFile();

async function generateMarkdownFile() {
  const reports = await generateReportList();
  const actions = await generateFollowUpActionsList();

  let indexTemplate = await fs.readFile('challenge-report-index-template.md', 'utf8');
  indexTemplate = indexTemplate.replace('{{{LIST_ALL_REPORTS}}}', reports);
  indexTemplate = indexTemplate.replace('{{{LIST_ACTIONS}}}', actions);
  fs.writeFile('../docs/challenge-reports/index.md', indexTemplate);
}

async function generateReportList() {
  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  SELECT * WHERE {
    ?report a schema:Report;
      schema:name ?title. 
  }`, {
    sources: ['https://data.knows.idlab.ugent.be/person/office/solidlab-challenges'],
  });

  const bindings = await bindingsStream.toArray();
  const markdown = generateReportListMarkdown(bindings);

  // Download Markdown files
  for (const binding of bindings) {
    const localUrl = binding.get('report').id.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '../docs/challenge-reports');
    downloadMarkdownFile(binding.get('report').id, localUrl);
  }

  downloadImages();

  return markdown;
}

async function generateFollowUpActionsList() {
  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
  SELECT * WHERE {
    ?action a knows:FollowUpAction;
      knows:report ?report.
      
    ?report schema:name ?title.
  
    OPTIONAL {
      ?action schema:object ?software.
    } 
  }`, {
    sources: ['https://data.knows.idlab.ugent.be/person/office/solidlab-challenges'],
  });

  const bindings = await bindingsStream.toArray();
  const markdown = generateFollowUpActionsListMarkdown(bindings);
  return markdown;
}

function generateReportListMarkdown(bindings) {
  let markdown = '';

  bindings = bindings.map(binding => {
    return {
      localUrl: binding.get('report').id.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '.'),
      title: binding.get('title').value
    }
  });

  bindings.sort((a, b) => {
    if (a.title < b.title) {
      return -1;
    } else if (a.title > b.title) {
      return 1;
    }

    return 0;
  });

  for (const binding of bindings) {
    markdown += `- [${binding.title}](${binding.localUrl})\n`;
  }

  return markdown;
}

function generateFollowUpActionsListMarkdown(bindings) {
  const comunica = [];
  const css = [];
  const solidlabLibJs = [];
  const other = [];

  for (const binding of bindings) {
    const url = binding.get('report').id.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '.');
    const title = binding.get('title').value;

    if (binding.get('software')) {
      const software = binding.get('software').id;

      if (software === 'https://data.knows.idlab.ugent.be/person/office/software#solidlablib-js') {
        solidlabLibJs.push({
          url,
          title
        });
      } else if (software === 'https://data.knows.idlab.ugent.be/person/office/software#comunica') {
        comunica.push({
          url,
          title
        });
      } else if (software === 'https://data.knows.idlab.ugent.be/person/office/software#community-solid-server') {
        css.push({
          url,
          title
        });
      } else {
        other.push({
          url,
          title
        });
      }
    } else {
      other.push({
        url,
        title
      });
    }
  }

  let markdown = generateFollowUpActionSection(css, 'Community Solid Server');
  markdown += generateFollowUpActionSection(comunica, 'Comunica');
  markdown += generateFollowUpActionSection(solidlabLibJs, 'SolidLabLib.js');
  markdown += generateFollowUpActionSection(other, 'Other');

  return markdown;
}

function generateFollowUpActionSection(list, title) {
  // Filter duplicate reports.
  list = list.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.url === value.url
      ))
  );

  let markdown = `### ${title}\n\n`;

  if (list.length === 0) {
    markdown += 'None.\n\n';
  } else {
    list.forEach(item => {
      markdown += `- [${item.title}](${item.url})\n`
    });

    markdown += '\n';
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
