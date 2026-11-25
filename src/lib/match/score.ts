import { voltagesCompatible } from "@/lib/inventory/normalize";
import type { EquipmentNeed, MatchCandidate, MatchHit } from "@/lib/match/types";

const transformerWords = ["pad-mount", "padmount", "substation", "dry-type", "dry type", "cast resin"];

function numberOf(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function ratingPair(need: EquipmentNeed, candidate: MatchCandidate) {
  const pairs: Array<{ need: number; have: number; label: string }> = [];
  const needKva = numberOf(need.kva);
  const needKw = numberOf(need.kw);
  const needAmps = numberOf(need.amps);
  const haveKva = numberOf(candidate.kva) ?? (candidate.ratingUnit === "kVA" ? numberOf(candidate.ratingValue) : null);
  const haveKw = numberOf(candidate.kw) ?? (candidate.ratingUnit === "kW" ? numberOf(candidate.ratingValue) : null);
  const haveAmps = numberOf(candidate.amps) ?? (candidate.ratingUnit === "A" ? numberOf(candidate.ratingValue) : null);
  if (needKva && haveKva) pairs.push({ need: needKva, have: haveKva, label: "kVA" });
  if (needKw && haveKw) pairs.push({ need: needKw, have: haveKw, label: "kW" });
  if (needAmps && haveAmps) pairs.push({ need: needAmps, have: haveAmps, label: "A" });
  if (pairs.length === 0 && needKw && haveKva) pairs.push({ need: needKw, have: haveKva, label: "kW compared with kVA" });
  if (pairs.length === 0 && needKva && haveKw) pairs.push({ need: needKva, have: haveKw, label: "kVA compared with kW" });
  return pairs[0] ?? null;
}

function configurationNote(need: EquipmentNeed, candidate: MatchCandidate) {
  const wanted = `${need.configuration ?? ""} ${need.label} ${need.notes}`.toLowerCase();
  const listed = `${candidate.sourceCategory ?? ""} ${candidate.title}`.toLowerCase();
  const wantedKind = transformerWords.find((word) => wanted.includes(word));
  const listedKind = transformerWords.find((word) => listed.includes(word));
  if (!wantedKind || !listedKind) return 0;
  return wantedKind === listedKind ? 5 : -6;
}

/**
 * Score one inventory row against one requested line.
 * Category agreement dominates. A different category cannot outrank a real category hit.
 */
export function scoreCandidate(need: EquipmentNeed, candidate: MatchCandidate): MatchHit {
  const reasons: string[] = [];
  let score = 0;
  const categoryMatch = Boolean(need.category) && need.category === candidate.category;

  if (!need.category) {
    reasons.push("No category was extracted, so category was not scored.");
  } else if (categoryMatch) {
    score += 35;
    reasons.push("Category matches.");
  } else {
    reasons.push("Category does not match.");
  }

  const needVoltage = need.voltage || "";
  const haveVoltage = [candidate.voltageText, candidate.voltageClass, candidate.ratingText, candidate.title]
    .filter(Boolean)
    .join(" ");
  if (needVoltage && haveVoltage && voltagesCompatible(needVoltage, haveVoltage)) {
    score += 25;
    reasons.push("Voltage is compatible.");
  } else if (needVoltage && haveVoltage) {
    reasons.push("Voltage does not line up.");
  } else {
    reasons.push("Voltage was not stated on one side.");
    score += 4;
  }

  const pair = ratingPair(need, candidate);
  if (pair) {
    const delta = Math.abs(pair.need - pair.have) / pair.need;
    if (delta <= 0.15) {
      score += 25;
      reasons.push(`Rating is within 15% (${pair.label}).`);
    } else if (delta <= 0.35) {
      score += 12;
      reasons.push(`Rating is within 35% (${pair.label}).`);
    } else {
      reasons.push(`Rating is outside the usual band (${pair.label}).`);
    }
  } else {
    reasons.push("No shared rating unit to compare.");
    score += 3;
  }

  if (need.quantity && candidate.quantity) {
    if (candidate.quantity >= need.quantity) {
      score += 5;
      reasons.push("Quantity on hand covers the request.");
    } else {
      score += 1;
      reasons.push("Quantity on hand is short of the request.");
    }
  }

  if (need.manufacturer) {
    const wanted = need.manufacturer.toLowerCase();
    const have = `${candidate.manufacturer} ${candidate.title}`.toLowerCase();
    if (have.includes(wanted)) {
      score += 5;
      reasons.push("Manufacturer matches the preference.");
    } else {
      reasons.push("Manufacturer preference was not found on this listing.");
    }
  }

  if (need.phase && candidate.phase) {
    if (need.phase === candidate.phase) {
      score += 5;
      reasons.push("Phase matches.");
    } else {
      score -= 5;
      reasons.push("Phase conflicts.");
    }
  }

  const configuration = configurationNote(need, candidate);
  if (configuration > 0) reasons.push("Transformer type matches (pad-mount, substation, or dry-type).");
  if (configuration < 0) reasons.push("Transformer type differs (pad-mount, substation, or dry-type).");
  score += configuration;

  if (need.category && !categoryMatch) score = Math.min(score, 24);

  return {
    candidate,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
  };
}

export function rankMatches(need: EquipmentNeed, candidates: MatchCandidate[], limit = 8): MatchHit[] {
  return candidates
    .map((candidate) => scoreCandidate(need, candidate))
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, limit);
}
