import { describe, expect, it } from "vitest";
import { exportMatchesCsv, exportPrintHtml } from "../lib/report/export";
import type { WeekBundle } from "../lib/types";

const bundle: WeekBundle = {
  week: {
    id: "w1",
    name: "<script>alert(1)</script>",
    startDate: "2026-02-16",
    endDate: "2026-02-22",
    status: "open",
    createdAt: "2026-02-19T00:00:00.000Z",
  },
  entries: [],
  bankRecords: [],
  exceptions: [],
  matches: [
    {
      id: "m1",
      weekId: "w1",
      status: "red",
      matchType: "unmatched",
      notes: "<img src=x onerror=alert(1)>",
      adminNote: "=2+3",
      createdAt: "2026-02-19T00:00:00.000Z",
    },
  ],
};

describe("report export hardening", () => {
  it("escapes HTML for printable export", () => {
    const html = exportPrintHtml(bundle);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("neutralizes CSV formula injection", () => {
    const csv = exportMatchesCsv(bundle);
    expect(csv).toContain("'=2+3");
  });
});
