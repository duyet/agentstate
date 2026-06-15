export function CreateProjectFormHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-[15px] font-semibold text-fg">Create project</h2>
      <p className="text-[13px] leading-5 text-fg-3">
        Give your project a name. The slug is used in API paths.
      </p>
    </div>
  );
}
