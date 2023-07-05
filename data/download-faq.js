/**
 * Download FAQ from KNoWS pod. Still have to be added.
 */

const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const fs = require('fs-extra');

main();

async function main() {
  const myEngine = new QueryEngine();

  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  SELECT * WHERE {
    ?question a schema:Question;
      schema:name ?title;
      schema:acceptedAnswer ?answer.
  }`, {
    sources: ['https://data.knows.idlab.ugent.be/person/office/solid-faq'],
  });

  const bindings = await bindingsStream.toArray();
  const markdown = generateText(bindings);

  let template = await fs.readFile('templates/faq.md', 'utf8');
  template = template.replace('{{{FAQ_TEXT}}}', markdown);
  fs.writeFile('../docs/faq.md', template);
}

function generateText(bindings) {
  let markdown = '';

  for (const binding of bindings) {
    markdown += `## ${binding.get('title').value}\n\n${binding.get('answer').value}\n\n`;
  }

  return markdown;
}
