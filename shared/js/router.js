export function parseHash(hash = typeof location !== "undefined" ? location.hash : "#/") {
  const raw = (hash || "#/").replace(/^#/, "") || "/";
  const [pathPart, qs] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  return { path, query };
}

export function matchRoute(path, routes) {
  const parts = path.split("/").filter(Boolean);
  for (const route of routes) {
    const expected = route.path.split("/").filter(Boolean);
    if (expected.length !== parts.length) continue;
    const params = {};
    let ok = true;
    expected.forEach((seg, i) => {
      if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(parts[i]);
      else if (seg !== parts[i]) ok = false;
    });
    if (ok) return { name: route.name, hideTab: !!route.hideTab, params };
  }
  return null;
}
