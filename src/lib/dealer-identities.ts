/** Internal only. Names and domains that must never appear on a buyer-facing page. */
export const dealerIdentities = [
  { name: "Arcbarn", domains: ["arcbarn.com"] },
  { name: "Worldwide Power Products", domains: ["wpowerproducts.com"] },
  { name: "USA Decom", domains: ["usadecommissioning.com"] },
  { name: "USA Decommissioning", domains: ["usadecommissioning.com"] },
  { name: "Critical Infrastructure Group", domains: ["cigroup-us.com"] },
  { name: "CI Group", domains: ["cigroup-us.com"] },
  { name: "Midwest Engines & Generators", domains: ["midwest-generators.com"] },
  { name: "Midwest Engines", domains: ["midwest-generators.com"] },
  { name: "Atlas Electric", domains: ["atlaselectricinc.com"] },
  { name: "APASOF", domains: ["apasof.com"] },
  { name: "Turnkey Industries", domains: ["turnkey-industries.com"] },
  { name: "Gruber Power Services", domains: ["gruberpower.com"] },
  { name: "Gruber Power", domains: ["gruberpower.com"] },
  { name: "The FAR Bazaar", domains: ["thefarbazaar.com"] },
  { name: "FAR Bazaar", domains: ["thefarbazaar.com"] },
  { name: "Proven Performer", domains: ["provenperformer.com"] },
  { name: "Data Center Equipment Sales", domains: ["dces.com"] },
  { name: "DCES", domains: ["dces.com", "machineryhost.com"] },
  { name: "Pacific Northwest Power", domains: ["pnwpower.com"] },
  { name: "In Stock Equipment", domains: ["instockequipment.com"] },
  { name: "Gentel Power", domains: ["gentelpower.com"] },
  { name: "Machinio", domains: ["machinio.com"] },
  { name: "Surplus Record", domains: ["surplusrecord.com"] },
  { name: "MachineryTrader", domains: ["machinerytrader.com"] },
  { name: "IronPlanet", domains: ["ironplanet.com"] },
  { name: "Ritchie Bros", domains: ["rbauction.com"] },
  { name: "GovDeals", domains: ["govdeals.com"] },
  { name: "AllSurplus", domains: ["allsurplus.com"] },
  { name: "Bid on Equipment", domains: ["bid-on-equipment.com"] },
  { name: "Power Generation Enterprises", domains: ["powergenenterprises.com"] },
  { name: "T&R Electric", domains: ["t-r.com"] },
] as const;

export const dealerNames = [...new Set(dealerIdentities.map((item) => item.name))].sort((a, b) => b.length - a.length);

export const dealerDomains = [...new Set(dealerIdentities.flatMap((item) => item.domains))];
