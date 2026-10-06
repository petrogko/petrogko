/** Route values: a JSON body, reply(status, body), or a function returning either (or throwing). Keys are path+query. */
export function fakeFetch(routes) {
  const calls = [];
  async function impl(url) {
    calls.push(url);
    const path = url.replace(/^https:\/\/[^/]+/, '');
    if (!(path in routes)) throw new Error(`unexpected request ${path}`);
    let route = routes[path];
    if (typeof route === 'function') route = route();
    const { status, body } = route?.__reply ? route : { status: 200, body: route };
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }
  impl.calls = calls;
  return impl;
}

export const reply = (status, body = {}) => ({ __reply: true, status, body });
