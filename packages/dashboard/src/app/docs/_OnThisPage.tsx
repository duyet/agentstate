import { ON_THIS_PAGE } from "./_docs-data";

export function OnThisPage() {
  return (
    <aside
      aria-label="On this page"
      className="sticky top-[88px] hidden xl:block"
    >
      <div className="as-label mb-2.5 block text-[10px]">ON THIS PAGE</div>
      <div className="flex flex-col gap-[7px] border-l border-border pl-3">
        {ON_THIS_PAGE.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </div>
    </aside>
  );
}
