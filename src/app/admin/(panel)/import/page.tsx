import { CsvImporter } from "@/components/admin/CsvImporter";
import { getSports } from "@/lib/data";

export default async function ImportPage() {
  const sports = await getSports();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-4xl font-extrabold uppercase tracking-wide">Import players</h1>
      <p className="mb-5 text-muted">Upload a CSV to add many players at once. Imported players start as <strong>Available</strong>.</p>
      <CsvImporter sports={sports} />
    </div>
  );
}
