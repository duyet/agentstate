import { ON_THIS_PAGE } from "./docs-data";

export function OnThisPage() {
  return (
    <aside aria-label="On this page" className="sticky top-[88px] hidden xl:block">
      <div className="as-label mb-2.5 block text-[10px]">ON THIS PAGE</div>
      <div className="flex flex-col gap-[7px] border-l border-edge pl-3">
        {ON_THIS_PAGE.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-[12.5px] text-fg-4 transition-colors hover:text-fg"
          >
            {label}
          </a>
        ))}
      </div>
    </aside>
  );
}
