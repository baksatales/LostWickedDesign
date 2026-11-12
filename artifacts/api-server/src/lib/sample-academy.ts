import { HttpError } from "./supabase";
import { requireSampleRole, type SampleIdentity } from "./sample-accounts";

export interface SampleAcademySale {
  id: string;
  date: string;
  course: string;
  learner: string;
  amountPaise: number;
  status: "paid" | "refunded" | "cancelled";
  source: "sample" | "tagmango_import";
}

const seedSales: SampleAcademySale[] = [
  { id: "academy-sample-001", date: "2026-11-02", course: "Shape a soy wax lotus", learner: "Sample learner 001", amountPaise: 180000, status: "paid", source: "sample" },
  { id: "academy-sample-002", date: "2026-11-05", course: "Shape a soy wax lotus", learner: "Sample learner 002", amountPaise: 230000, status: "paid", source: "sample" },
  { id: "academy-sample-003", date: "2026-11-07", course: "Kala Samāgam: a live craft session", learner: "Sample learner 003", amountPaise: 145000, status: "paid", source: "sample" },
];
const sales = new Map<string, SampleAcademySale>(seedSales.map(row => [row.id, row]));
const clone = <T>(value: T): T => structuredClone(value);

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let afterQuote = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else cell += char;
    } else if (afterQuote && char !== "," && char !== "\n" && char !== "\r" && !/\s/.test(char)) {
      throw new HttpError(400, "CSV has characters after a closing quote.");
    } else if (char === '"') {
      if (cell.length) throw new HttpError(400, "CSV has a quote in an unquoted field.");
      quoted = true;
    } else if (char === ",") {
      row.push(cell); cell = ""; afterQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(value => value.trim())) rows.push(row);
      row = []; afterQuote = false;
    } else cell += char;
  }
  if (quoted) throw new HttpError(400, "CSV has an unclosed quoted field.");
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function listSampleAdminAcademySales(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  const rows = [...sales.values()].map(clone).sort((a, b) => b.date.localeCompare(a.date));
  const paid = rows.filter(row => row.status === "paid");
  return {
    sample: true as const,
    sales: rows,
    summary: {
      revenuePaise: paid.reduce((sum, row) => sum + row.amountPaise, 0),
      seatsSold: paid.length,
      refundedCount: rows.filter(row => row.status === "refunded").length,
      importedCount: rows.filter(row => row.source === "tagmango_import").length,
    },
  };
}

export function importSampleAdminAcademyCsv(identity: SampleIdentity, csv: string) {
  requireSampleRole(identity, ["admin"]);
  if (csv.length > 1_000_000) throw new HttpError(413, "CSV must be no larger than 1 MB.");
  const rows = parseCsv(csv);
  if (rows.length < 2 || rows.length > 10_001) throw new HttpError(400, "CSV must contain a header and between 1 and 10,000 sales.");
  const headers = rows[0].map(value => value.trim().toLowerCase());
  const required = ["id", "date", "course", "learner", "amount", "status"];
  if (new Set(headers).size !== headers.length || required.some(header => !headers.includes(header))) {
    throw new HttpError(400, "CSV needs unique columns: id, date, course, learner, amount, status.");
  }
  const indexes = Object.fromEntries(required.map(header => [header, headers.indexOf(header)])) as Record<typeof required[number], number>;
  const staged: SampleAcademySale[] = [];
  const seen = new Set<string>();
  for (const [rowIndex, row] of rows.slice(1).entries()) {
    if (row.length !== headers.length) throw new HttpError(400, `CSV row ${rowIndex + 2} has the wrong number of columns.`);
    const get = (key: typeof required[number]) => row[indexes[key]].trim();
    const id = get("id");
    const date = get("date");
    const course = get("course");
    const learner = get("learner");
    const amount = get("amount");
    const status = get("status").toLowerCase();
    const parsedDate = new Date(`${date}T00:00:00Z`);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === date;
    const validAmount = /^\d{1,8}(?:\.\d{1,2})?$/.test(amount) && Number.isFinite(Number(amount));
    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(id) || seen.has(id) || sales.has(id)) {
      throw new HttpError(400, `CSV row ${rowIndex + 2} has a missing or duplicate sale ID.`);
    }
    if (!validDate || !course || course.length > 200 || !learner || learner.length > 160 ||
        !validAmount || Number(amount) <= 0 || !["paid", "refunded", "cancelled"].includes(status)) {
      throw new HttpError(400, `CSV row ${rowIndex + 2} has invalid date, course, learner, amount, or status.`);
    }
    seen.add(id);
    staged.push({
      id, date, course, learner, amountPaise: Math.round(Number(amount) * 100),
      status: status as SampleAcademySale["status"], source: "tagmango_import",
    });
  }
  staged.forEach(sale => sales.set(sale.id, sale));
  return { imported: staged.length, ...listSampleAdminAcademySales(identity) };
}

export function resetSampleAcademyData() {
  sales.clear();
  seedSales.forEach(sale => sales.set(sale.id, clone(sale)));
}
