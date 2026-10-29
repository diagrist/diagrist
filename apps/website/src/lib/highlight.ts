import { dgrGrammar } from './dgr-grammar.js';

/** A rule of the grammar as one sticky expression; a `begin`…`end` rule matches up to its end or the line's end. */
const RULES = dgrGrammar.patterns.map((rule) => {
  const inner = (rule.patterns ?? []).map((p) => p.match).join('|');
  const source = rule.match ?? `${rule.begin}(?:${inner}${inner ? '|' : ''}(?!${rule.end}).)*(?:${rule.end}|$)`;
  return { regex: new RegExp(source, 'dy'), name: rule.name, captures: rule.captures };
});

const escaped = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** A scope such as `entity.name.type.dgr` as a class: its first two parts, `dgr-entity-name`. */
const classOf = (scope: string): string => `dgr-${scope.split('.').slice(0, 2).join('-')}`;

const span = (scope: string | undefined, html: string): string =>
  scope === undefined ? html : `<span class="${classOf(scope)}">${html}</span>`;

/** The matched text with each captured group in the class of its scope. */
function painted(match: RegExpExecArray, captures: (typeof RULES)[number]['captures']): string {
  if (captures === undefined || match.indices === undefined) return escaped(match[0]);
  const start = match.index;
  let at = 0;
  let html = '';
  match.indices.forEach((range, group) => {
    const scope = captures[String(group)]?.name;
    if (group === 0 || range === undefined || scope === undefined) return;
    html += escaped(match[0].slice(at, range[0] - start));
    html += span(scope, escaped(match[0].slice(range[0] - start, range[1] - start)));
    at = range[1] - start;
  });
  return html + escaped(match[0].slice(at));
}

/**
 * A `.dgr` source as HTML with classes, read with the grammar the site's code blocks use: at each place the first
 * rule that matches there wins, as in a TextMate grammar.
 */
export function highlight(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      let html = '';
      let at = 0;
      while (at < line.length) {
        const hit = RULES.map((rule) => {
          rule.regex.lastIndex = at;
          const match = rule.regex.exec(line);
          return match !== null && match[0].length > 0 ? { rule, match } : undefined;
        }).find((found) => found !== undefined);
        if (hit === undefined) {
          html += escaped(line[at] ?? '');
          at += 1;
          continue;
        }
        html += span(hit.rule.name, painted(hit.match, hit.rule.captures));
        at += hit.match[0].length;
      }
      return html;
    })
    .join('\n');
}
