"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CsvUpload } from "@/components/csv-upload";

export default function ImportPage() {
  const params = useParams<{ weekId: string }>();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Importação de CSVs</h1>
        <Link href={`/weeks/${params.weekId}`} className="text-sm underline">
          Voltar para semana
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CsvUpload kind="entries" weekId={params.weekId} onUploaded={() => {}} />
        <CsvUpload kind="bank" weekId={params.weekId} onUploaded={() => {}} />
      </div>
    </section>
  );
}
