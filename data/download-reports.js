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

  let indexTemplate = await fs.readFile('templates/challenge-report-index.md', 'utf8');
  indexTemplate = indexTemplate.replace('{{{LIST_ALL_REPORTS}}}', reports);
  indexTemplate = indexTemplate.replace('{{{LIST_ACTIONS}}}', actions);
  await fs.ensureDir('../docs/challenge-reports');
  fs.writeFile('../docs/challenge-reports/index.md', indexTemplate);
}

async function generateReportList() {
  const creatorDataSources = await getReportDataSources();
  const sources = [
    'https://data.knows.idlab.ugent.be/person/office/solidlab-challenges',
    'https://data.knows.idlab.ugent.be/person/office/employees-extra'].concat(creatorDataSources);
  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
  SELECT ?report ?title ?challenge ?date ?solution ?solutionCreator(SAMPLE(?challengeCreator) as ?challengeCreatorName) (SAMPLE(?reportCreator) as ?reportCreatorName) (SAMPLE(?solutionCreator) as ?solutionCreatorName) WHERE {
    ?report a schema:Report;
            schema:name ?title;
            schema:creator [schema:name ?reportCreator];
            schema:dateCreated ?date;
            schema:about ?challenge.
    
    ?challenge schema:creator [schema:name ?challengeCreator];
        knows:solution ?solution.
    
    ?solution schema:creator [schema:name ?solutionCreator].
  } GROUP BY ?report ?title ?date ?solution ?challenge ?solutionCreator`, {
    sources
  });

  const bindings = await bindingsStream.toArray();
  const reports = mergeDuplicateReports(bindings);
  const markdown = generateReportListMarkdown(reports);

  // Download Markdown files
  for (const report of reports) {
    const localUrl = report.permalink.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '../docs/challenge-reports');
    downloadMarkdownFile(report.permalink, localUrl, report.permalink, {
      challenge: report.challengeCreators,
      solution: report.solutionCreators,
      report: report.reportCreators
    });
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

function generateReportListMarkdown(reports) {
  let markdown = '';

  reports.sort((a, b) => {
    if (a.title < b.title) {
      return -1;
    } else if (a.title > b.title) {
      return 1;
    }

    return 0;
  });

  for (const report of reports) {
    markdown += `- [${report.title}](${report.localUrl}) (${report.date}, [permalink](${report.permalink}))\n`;
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

async function downloadMarkdownFile(url, outputPath, permalink, creators) {
  url = url.replace('blob', 'raw');
  const response = await fetch(url);
  let markdown = await response.text();
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i ++) {
    if (lines[i].startsWith('# ')) {
      lines[i] += ` ([permalink](${permalink}))`;
      break;
    }
  }

  markdown = lines.join('\n');
  markdown +=
    `\n## Contributors
     
- Challenge: ${creators.challenge.join(', ')}
- Solution: ${creators.solution.join(', ')}
- Report: ${creators.report.join(', ')}`;

  fs.writeFile(outputPath, markdown);
}

function downloadImages() {
  exec(`rm -rf challenges-git && rm -rf ../docs/challenge-reports/img && mkdir ../docs/challenge-reports/img && git clone https://github.com/SolidLabResearch/Challenges.git challenges-git && cd challenges-git/reports/ && cp -r img/* ../../../docs/challenge-reports/img`);
}

async function getReportDataSources() {
  let bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
  SELECT DISTINCT ?creator WHERE {
    ?report a schema:Report.
    
    {?report schema:creator ?creator.}
    UNION
    {?report schema:about [schema:creator ?creator]}
    UNION
    {?report schema:about [knows:solution [schema:creator ?creator]]}
  } `, {
    sources: [
      'https://data.knows.idlab.ugent.be/person/office/solidlab-challenges']
  });

  const bindings = await bindingsStream.toArray();
  const results = bindings.map(b => b.get('creator').id);
  return results;
}

function mergeDuplicateReports(bindings) {
  const reports = {};
  const reportIds = [];

  for (const binding of bindings) {
    const id = binding.get('report').id;

    if (reportIds.includes(id)) {
      const report = reports[id];

      if (!report.challengeCreators.includes(binding.get('challengeCreatorName').value)) {
        report.challengeCreators.push(binding.get('challengeCreatorName').value);
      }

      if (!report.reportCreators.includes(binding.get('reportCreatorName').value)) {
        report.reportCreators.push(binding.get('reportCreatorName').value);
      }

      if (!report.solutionCreators.includes(binding.get('solutionCreatorName').value)) {
        report.solutionCreators.push(binding.get('solutionCreatorName').value);
      }

      if (!report.solutions.includes(binding.get('solution').id)) {
        report.solutions.push(binding.get('solution').id);
      }
    } else {
      reportIds.push(id);
      reports[id] = {
        permalink: id,
        localUrl: id.replace('https://github.com/SolidLabResearch/Challenges/blob/main/reports', '.'),
        title: binding.get('title').value,
        date: binding.get('date').value,
        challenge: binding.get('challenge').id,
        solutions: [binding.get('solution').id],
        challengeCreators: [binding.get('challengeCreatorName').value],
        reportCreators: [binding.get('reportCreatorName').value],
        solutionCreators: [binding.get('solutionCreatorName').value]
      };
    }
  }

  return Object.values(reports);
}
