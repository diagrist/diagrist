import { StreamLanguage, type StringStream } from '@codemirror/language';

/**
 * A small tokenizer for `.dgr` that knows the shape of the language, not its words: the first word of a line is
 * the statement, `name=` an attribute, quoted text a string, `#` a comment. So it fits every kind without a list.
 */
interface State {
  atStart: boolean;
}

function token(stream: StringStream, state: State): string | null {
  if (stream.sol()) state.atStart = true;
  if (stream.eatSpace()) return null;
  const first = state.atStart;
  state.atStart = false;
  if (stream.peek() === '#') {
    stream.skipToEnd();
    return 'comment';
  }
  if (stream.eat('"')) {
    let escaped = false;
    for (let next = stream.next(); next !== undefined; next = stream.next()) {
      if (next === '"' && !escaped) break;
      escaped = !escaped && next === '\\';
    }
    return 'string';
  }
  if (stream.match(/^[-~=.<>|]+>|^<[-~.]+|^\/|^:/)) return 'operator';
  if (stream.match(/^\d+(\.\d+)?/)) return 'number';
  if (stream.match(/^[\p{L}_][\p{L}\p{N}_.-]*(?==)/u)) return 'propertyName';
  if (stream.match(/^[\p{L}_][\p{L}\p{N}_.-]*/u)) return first ? 'keyword' : 'variableName';
  stream.next();
  return null;
}

/** Syntax colours for `.dgr` sources. */
export const dgrLanguage: StreamLanguage<State> = StreamLanguage.define<State>({
  name: 'dgr',
  startState: () => ({ atStart: true }),
  token,
  languageData: { commentTokens: { line: '#' } },
});
