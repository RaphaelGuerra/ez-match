import { describe, expect, it } from "vitest";
import { parsePmsRows } from "../lib/parsers/pms";

describe("PMS parser required fields", () => {
  it("drops rows missing guest_name", () => {
    const rows = [
      { date: "2026-02-17", amount: "100", guest_name: "Joao" },
      { date: "2026-02-18", amount: "150", guest_name: "" },
    ];

    const parsed = parsePmsRows("week-1", rows);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.guestName).toBe("Joao");
  });
});
