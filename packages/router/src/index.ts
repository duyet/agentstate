/**
 * AgentState Router Worker
 *
 * Routes requests to microfrontends via service bindings:
 * - /api/*      → API worker (strips /api prefix)
 * - /v1/*       → API worker (passed through as-is)
 * - /llms.txt   → API worker
 * - /agents.md  → API worker
 * - /*          → Dashboard worker
 */

interface Env {
  API: Fetcher;
  DASHBOARD: Fetcher;
  ROUTES: string;
  ASSET_PREFIXES: string;
}

interface Route {
  path: string;
  binding: string;
  preload?: boolean;
}

interface RoutesConfig {
  routes: Route[];
  smoothTransitions?: boolean;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Parse routes config
    const config: RoutesConfig = JSON.parse(env.ROUTES);
    const assetPrefixes: string[] = JSON.parse(env.ASSET_PREFIXES || '["/_next/"]');

    // Match route by specificity (longer paths first)
    const sortedRoutes = [...config.routes].sort(
      (a, b) => b.path.length - a.path.length,
    );

    let matchedRoute: Route | null = null;
    for (const route of sortedRoutes) {
      if (path === route.path || path.startsWith(route.path + "/") || route.path === "/") {
        matchedRoute = route;
        break;
      }
    }

    if (!matchedRoute) {
      return new Response("Not Found", { status: 404 });
    }

    // Get the target service
    const service = env[matchedRoute.binding as keyof Env] as Fetcher;
    if (!service) {
      return new Response(`Service ${matchedRoute.binding} not found`, { status: 502 });
    }

    // Strip the mount path prefix for prefix routes (not exact matches)
    let targetPath = path;
    const isExactMatch = path === matchedRoute.path;
    if (!isExactMatch && matchedRoute.path !== "/" && path.startsWith(matchedRoute.path)) {
      targetPath = path.slice(matchedRoute.path.length) || "/";
    }

    // Build the forwarded request URL
    const targetUrl = new URL(targetPath + url.search, url.origin);

    // Forward the request
    const response = await service.fetch(
      new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      }),
    );

    // For HTML responses from non-root mounted paths, rewrite asset URLs
    const contentType = response.headers.get("content-type") || "";
    if (
      matchedRoute.path !== "/" &&
      matchedRoute.binding === "DASHBOARD" &&
      contentType.includes("text/html")
    ) {
      return rewriteHtml(response, matchedRoute.path, assetPrefixes, config);
    }

    // For CSS responses, rewrite url() references
    if (
      matchedRoute.path !== "/" &&
      contentType.includes("text/css")
    ) {
      return rewriteCss(response, matchedRoute.path, assetPrefixes);
    }

    // Rewrite redirect headers
    if (response.status >= 300 && response.status < 400 && matchedRoute.path !== "/") {
      const location = response.headers.get("location");
      if (location && location.startsWith("/")) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("location", matchedRoute.path + location);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
    }

    return response;
  },
};

// ---------------------------------------------------------------------------
// HTML Rewriter — prefixes asset paths in HTML attributes
// ---------------------------------------------------------------------------

function rewriteHtml(
  response: Response,
  mountPath: string,
  assetPrefixes: string[],
  config: RoutesConfig,
): Response {
  const rewriter = new HTMLRewriter();

  const attrsToRewrite = ["href", "src", "poster", "action", "srcset"];

  rewriter.on("*", {
    element(el) {
      for (const attr of attrsToRewrite) {
        const value = el.getAttribute(attr);
        if (value && shouldRewrite(value, assetPrefixes)) {
          el.setAttribute(attr, mountPath + value);
        }
      }

      // Handle data-* attributes
      for (const dataAttr of ["data-src", "data-href", "data-background"]) {
        const value = el.getAttribute(dataAttr);
        if (value && shouldRewrite(value, assetPrefixes)) {
          el.setAttribute(dataAttr, mountPath + value);
        }
      }
    },
  });

  // Inject smooth transitions CSS if enabled
  if (config.smoothTransitions) {
    rewriter.on("head", {
      element(el) {
        el.append(
          `<style>
@supports (view-transition-name: none) {
  ::view-transition-old(root), ::view-transition-new(root) {
    animation-duration: 0.3s;
    animation-timing-function: ease-in-out;
  }
  main { view-transition-name: main-content; }
  nav { view-transition-name: navigation; }
}
</style>`,
          { html: true },
        );
      },
    });
  }

  // Inject preload hints for routes with preload: true
  const preloadRoutes = config.routes.filter((r) => r.preload);
  if (preloadRoutes.length > 0) {
    rewriter.on("head", {
      element(el) {
        const speculationRules = {
          prefetch: [{ urls: preloadRoutes.map((r) => r.path) }],
        };
        el.append(
          `<script type="speculationrules">${JSON.stringify(speculationRules)}</script>`,
          { html: true },
        );
      },
    });
  }

  return rewriter.transform(response);
}

function shouldRewrite(value: string, assetPrefixes: string[]): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return assetPrefixes.some((prefix) => value.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// CSS Rewriter — prefixes url() references
// ---------------------------------------------------------------------------

async function rewriteCss(
  response: Response,
  mountPath: string,
  assetPrefixes: string[],
): Promise<Response> {
  let css = await response.text();

  for (const prefix of assetPrefixes) {
    // url(/prefix/...) → url(/mountPath/prefix/...)
    css = css.replaceAll(`url(${prefix}`, `url(${mountPath}${prefix}`);
    css = css.replaceAll(`url("${prefix}`, `url("${mountPath}${prefix}`);
    css = css.replaceAll(`url('${prefix}`, `url('${mountPath}${prefix}`);
  }

  return new Response(css, {
    status: response.status,
    headers: response.headers,
  });
}
