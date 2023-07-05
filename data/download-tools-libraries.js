const {QueryEngine} = require("@comunica/query-sparql");
const fs = require("fs-extra");
const myEngine = new QueryEngine();

generateToolsLibrariesList()
async function generateToolsLibrariesList() {
  const bindingsStream = await myEngine.queryBindings(`
  PREFIX schema: <http://schema.org/>
  PREFIX knows: <https://data.knows.idlab.ugent.be/person/office/#>
  
  SELECT * WHERE {
    ?application a schema:SoftwareApplication;
      schema:name ?title;
      schema:description ?description;
      knows:showInSolidLabDocumentationCenter true.
      
    ?repo schema:targetProduct ?application;
      schema:codeRepository ?url.
  }`, {
    sources: ['https://data.knows.idlab.ugent.be/person/office/software',
      'https://data.knows.idlab.ugent.be/person/office/external-software'],
  });

  let bindings = await bindingsStream.toArray();

  bindings = bindings.map(binding => {
    return {
      url: binding.get('url').id,
      title: binding.get('title').value,
      description: binding.get('description').value
    }
  });

  bindings.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();

    if (aTitle < bTitle) {
      return -1;
    } else if (aTitle > bTitle) {
      return 1;
    }

    return 0;
  });

  let markdown = '';

  for (const binding of bindings) {
    markdown += `- [${binding.title}](${binding.url}): ${binding.description}\n`;
  }

  let tutorialsTemplate = await fs.readFile('templates/tools-libraries.md', 'utf8');
  tutorialsTemplate = tutorialsTemplate.replace('{{{LIST_TOOLS_LIBRARIES}}}', markdown);
  fs.writeFile('../docs/tools-libraries.md', tutorialsTemplate);
}
