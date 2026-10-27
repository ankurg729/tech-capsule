import type { CodeLanguage } from '@techcapsule/contracts';

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'type'
  | 'punctuation'
  | 'property';

export interface Token {
  type: TokenType;
  text: string;
}

interface Rule {
  type: TokenType;
  /** Must use the sticky (`y`) flag so it only matches at the current position. */
  re: RegExp;
}

const words = (list: string[], flags = 'y') => new RegExp(`\\b(?:${list.join('|')})\\b`, flags);

const DOUBLE_QUOTED = /"(?:\\.|[^\\"\n])*"/y;
const SINGLE_QUOTED = /'(?:\\.|[^\\'\n])*'/y;
const NUMBER = /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y;
const PUNCTUATION = /[{}()[\];,.:<>=+\-*/!?&|%^~@]+/y;

const JS_KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'new', 'class', 'extends', 'import', 'from', 'export', 'default',
  'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of',
  'this', 'super', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum',
  'implements', 'readonly', 'as', 'satisfies', 'keyof', 'void', 'yield', 'static', 'public',
  'private', 'protected', 'delete',
]; // prettier-ignore

const PY_KEYWORDS = [
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'import',
  'from', 'as', 'class', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'lambda', 'pass',
  'break', 'continue', 'async', 'await', 'None', 'True', 'False', 'self', 'global', 'nonlocal',
]; // prettier-ignore

const BASH_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'case', 'esac',
  'function', 'return', 'export', 'local', 'echo', 'cd', 'sudo', 'set', 'unset', 'source',
]; // prettier-ignore

const DOCKER_INSTRUCTIONS = [
  'FROM', 'RUN', 'CMD', 'ENTRYPOINT', 'COPY', 'ADD', 'WORKDIR', 'ENV', 'ARG', 'EXPOSE', 'USER',
  'VOLUME', 'LABEL', 'HEALTHCHECK', 'SHELL', 'ONBUILD', 'STOPSIGNAL', 'AS',
]; // prettier-ignore

const jsRules: Rule[] = [
  { type: 'comment', re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//y },
  { type: 'string', re: /`(?:\\[\s\S]|[^\\`])*`/y },
  { type: 'string', re: DOUBLE_QUOTED },
  { type: 'string', re: SINGLE_QUOTED },
  { type: 'number', re: NUMBER },
  { type: 'keyword', re: words(JS_KEYWORDS) },
  { type: 'type', re: /\b[A-Z][A-Za-z0-9_]*\b/y },
  { type: 'function', re: /\b[A-Za-z_$][\w$]*(?=\s*\()/y },
  { type: 'punctuation', re: PUNCTUATION },
];

const RULES: Record<CodeLanguage, Rule[]> = {
  javascript: jsRules,
  typescript: jsRules,
  json: [
    { type: 'property', re: /"(?:\\.|[^\\"\n])*"(?=\s*:)/y },
    { type: 'string', re: DOUBLE_QUOTED },
    { type: 'number', re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y },
    { type: 'keyword', re: words(['true', 'false', 'null']) },
    { type: 'punctuation', re: /[{}[\],:]/y },
  ],
  python: [
    { type: 'comment', re: /#[^\n]*/y },
    { type: 'string', re: /"""[\s\S]*?"""|'''[\s\S]*?'''/y },
    { type: 'string', re: DOUBLE_QUOTED },
    { type: 'string', re: SINGLE_QUOTED },
    { type: 'number', re: NUMBER },
    { type: 'keyword', re: words(PY_KEYWORDS) },
    { type: 'type', re: /\b[A-Z][A-Za-z0-9_]*\b/y },
    { type: 'function', re: /\b[A-Za-z_]\w*(?=\s*\()/y },
    { type: 'punctuation', re: PUNCTUATION },
  ],
  bash: [
    { type: 'comment', re: /(?<![\w$])#[^\n]*/y },
    { type: 'string', re: DOUBLE_QUOTED },
    { type: 'string', re: SINGLE_QUOTED },
    { type: 'property', re: /\$\{[^}\n]*\}|\$[A-Za-z_]\w*|\$\d/y },
    { type: 'type', re: /(?<![\w-])--?[A-Za-z][\w-]*/y },
    { type: 'keyword', re: words(BASH_KEYWORDS) },
    { type: 'number', re: NUMBER },
    { type: 'punctuation', re: /[|&;<>()=\\]+/y },
  ],
  yaml: [
    { type: 'comment', re: /#[^\n]*/y },
    { type: 'property', re: /[\w.\-/]+(?=\s*:(?:\s|$))/y },
    { type: 'string', re: DOUBLE_QUOTED },
    { type: 'string', re: SINGLE_QUOTED },
    { type: 'keyword', re: words(['true', 'false', 'null', 'yes', 'no']) },
    { type: 'number', re: NUMBER },
    { type: 'punctuation', re: /[:\-|>[\]{},]/y },
  ],
  dockerfile: [
    { type: 'comment', re: /#[^\n]*/y },
    { type: 'keyword', re: words(DOCKER_INSTRUCTIONS, 'yi') },
    { type: 'string', re: DOUBLE_QUOTED },
    { type: 'string', re: SINGLE_QUOTED },
    { type: 'property', re: /\$\{[^}\n]*\}|\$[A-Za-z_]\w*/y },
    { type: 'type', re: /(?<![\w-])--?[A-Za-z][\w-]*/y },
    { type: 'number', re: NUMBER },
    { type: 'punctuation', re: /[[\],=&|\\]+/y },
  ],
  text: [],
};

const FALLBACK = /[A-Za-z_$][\w$]*|\s+|[\s\S]/y;

/** Small, dependency-free tokenizer for read-only syntax highlighting of lesson code. */
export function tokenize(code: string, language: CodeLanguage): Token[] {
  const rules = RULES[language] ?? [];
  const tokens: Token[] = [];
  const push = (type: TokenType, text: string) => {
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type) prev.text += text;
    else tokens.push({ type, text });
  };

  let pos = 0;
  while (pos < code.length) {
    let matched = false;
    for (const rule of rules) {
      rule.re.lastIndex = pos;
      const m = rule.re.exec(code);
      if (m && m[0].length > 0) {
        push(rule.type, m[0]);
        pos += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      FALLBACK.lastIndex = pos;
      const m = FALLBACK.exec(code);
      const text = m?.[0] ?? code.charAt(pos);
      push('plain', text);
      pos += text.length;
    }
  }
  return tokens;
}
