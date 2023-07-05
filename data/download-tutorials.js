const {QueryEngine} = require("@comunica/query-sparql");
const fs = require("fs-extra");
const myEngine = new QueryEngine();

generateTutorialList()
async function generateTutorialList() {
  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
  
  SELECT * WHERE {
    ?tutorial a schema:HowTo;
      schema:name ?title;
      schema:description ?description;
      knows:showInSolidLabDocumentationCenter true
  }`, {
    sources: ['https://data.knows.idlab.ugent.be/person/office/tutorials'],
  });

  const bindings = await bindingsStream.toArray();
  let markdown = '';

  for (const binding of bindings) {
    markdown += `- [${binding.get('title').value}](${binding.get('tutorial').id}): ${binding.get('description').value}\n`;
  }

  let tutorialsTemplate = await fs.readFile('templates/tutorials.md', 'utf8');
  tutorialsTemplate = tutorialsTemplate.replace('{{{LIST_TUTORIALS}}}', markdown);
  fs.writeFile('../docs/tutorials.md', tutorialsTemplate);
}
