import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname, '..');
const inputSpec = resolve(repoRoot, 'contracts/openapi.yaml');
const output = resolve(repoRoot, 'frontend/src/api/generated/schema.ts');

const rubyScript = String.raw`
require 'yaml'

spec = YAML.load_file(ARGV[0])
schemas = spec.fetch('components', {}).fetch('schemas', {})

$cache = {}

def ts_type(schema, root)
  return 'unknown' if schema.nil?
  if schema['$ref']
    name = schema['$ref'].split('/').last
    return "components['schemas']['#{name}']"
  end

  type = schema['type']
  nullable = schema['nullable'] == true

  base = case type
  when 'string' then 'string'
  when 'integer', 'number' then 'number'
  when 'boolean' then 'boolean'
  when 'array'
    item_type = ts_type(schema['items'], root)
    "(#{item_type})[]"
  when 'object', nil
    props = schema['properties'] || {}
    req = schema['required'] || []
    members = props.map do |name, prop_schema|
      opt = req.include?(name) ? '' : '?'
      "  #{name}#{opt}: #{ts_type(prop_schema, root)};"
    end
    if members.empty?
      'Record<string, unknown>'
    else
      "{\n#{members.join("\n")}\n}"
    end
  else
    'unknown'
  end

  nullable ? "(#{base}) | null" : base
end

lines = []
lines << '// Generated from contracts/openapi.yaml. Do not edit manually.'
lines << 'export type components = {'
lines << '  schemas: {'

schemas.each do |name, schema|
  lines << "    #{name}: #{ts_type(schema, schemas)};"
end

lines << '  };'
lines << '};'
puts lines.join("\n")
`;

const generated = execFileSync('ruby', ['-e', rubyScript, inputSpec], { encoding: 'utf8' });
mkdirSync(resolve(repoRoot, 'frontend/src/api/generated'), { recursive: true });
writeFileSync(output, `${generated}\n`);
console.log(`Generated ${output}`);
