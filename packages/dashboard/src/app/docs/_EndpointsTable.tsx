import { endpoints, methodColor } from "./_endpoints-data";

export function EndpointsTable() {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Endpoints
      </h2>
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full" aria-label="API endpoints">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium w-16">
                Method
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium">
                Endpoint
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground font-medium hidden sm:table-cell">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr
                key={`${ep.method}-${ep.path}`}
                className={`${
                  endpoints.indexOf(ep) < endpoints.length - 1 ? "border-b border-border" : ""
                } hover:bg-muted/20 transition-colors`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`font-mono text-xs font-bold ${methodColor[ep.method] ?? "text-foreground"}`}
                  >
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <code className="font-mono text-xs text-foreground/85 break-all">{ep.path}</code>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground">{ep.description}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
