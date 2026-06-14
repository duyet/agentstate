import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateProjectFormHeader() {
  return (
    <CardHeader>
      <CardTitle>Create project</CardTitle>
      <CardDescription>Give your project a name. The slug is used in API paths.</CardDescription>
    </CardHeader>
  );
}
