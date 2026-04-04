const fs = require('fs');

async function build() {
  const { default: stripJsonComments } = await import('strip-json-comments');

  const input = 'syntaxes/xaml.tmLanguage.jsonc';
  const output = 'syntaxes/xaml.tmLanguage.json';

  if (!fs.existsSync(input)) {
    console.error('Input file not found:', input);
    process.exit(1);
  }

  const content = fs.readFileSync(input, 'utf8');
  const clean = stripJsonComments(content);

  fs.writeFileSync(output, clean);

  console.log('Grammar built!');
}

build();
