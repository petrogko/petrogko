const NAME = /^[A-Za-z_][\w.:-]*$/;
const ATTRS = /^(?:\s+[A-Za-z_][\w.:-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*\s*$/;
const BAD_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

/** Returns null when `xml` is well-formed, otherwise a short description of the first problem found. */
export function findXmlError(xml) {
  const src = xml.replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  let roots = 0;
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const text = src.slice(i, lt === -1 ? src.length : lt);
    if (BAD_AMP.test(text)) return `bare "&" in text near "${text.trim().slice(0, 40)}"`;
    if (lt === -1) break;
    const gt = src.indexOf('>', lt);
    if (gt === -1) return 'unterminated tag';
    const raw = src.slice(lt + 1, gt);
    i = gt + 1;
    if (raw.startsWith('?') || raw.startsWith('!')) continue;
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim();
      const open = stack.pop();
      if (open !== name) return `expected </${open ?? '(none)'}> but found </${name}>`;
      continue;
    }
    const selfClosing = raw.endsWith('/');
    const body = selfClosing ? raw.slice(0, -1) : raw;
    const name = body.match(/^\S+/)?.[0] ?? '';
    if (!NAME.test(name)) return `invalid tag name "${name}"`;
    const attrs = body.slice(name.length);
    if (!ATTRS.test(attrs)) return `malformed attributes on <${name}>`;
    if (BAD_AMP.test(attrs)) return `bare "&" in attributes of <${name}>`;
    const names = [...attrs.replace(/"[^"]*"|'[^']*'/g, '""').matchAll(/([A-Za-z_][\w.:-]*)\s*=/g)].map(m => m[1]);
    if (new Set(names).size !== names.length) return `duplicate attribute on <${name}>`;
    if (stack.length === 0) {
      roots += 1;
      if (roots > 1) return 'more than one root element';
    }
    if (!selfClosing) stack.push(name);
  }
  if (stack.length) return `unclosed <${stack.at(-1)}>`;
  return roots === 1 ? null : 'no root element';
}
