import type { MatchRecord } from "@/lib/types";

const CONFIDENCE_BY_TYPE: Record<MatchRecord["matchType"], number> = {
  direct: 1,
  acquirer_fee: 0.95,
  discount: 0.95,
  exception: 1,
  inferred: 0.7,
  unmatched: 0,
  unidentified: 0,
};

export function confidenceForMatchType(type: MatchRecord["matchType"]) {
  return CONFIDENCE_BY_TYPE[type] ?? 0;
}
