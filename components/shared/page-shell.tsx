import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
      <p className="text-zinc-400">{description}</p>
    </div>
  );
}

type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardContent className="py-12 text-center text-sm text-zinc-500">
        {message}
      </CardContent>
    </Card>
  );
}

type DataTableProps = {
  title: string;
  headers: string[];
  rows: string[][];
};

export function DataTable({ title, headers, rows }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState message={`No ${title.toLowerCase()} found. Add records in Supabase or through the app.`} />
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              {headers.map((header) => (
                <th key={header} className="px-2 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-zinc-800/60 text-zinc-300 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
