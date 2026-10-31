import type { Profile, Request } from "./types";

/**
 * KrackedDevs, the sample profile for judges. Built from public facts on
 * krackeddevs.com (read 31 Oct 2026). Stage, team size and what they are
 * looking for are our assumptions for the demo.
 */
export const KD_PROFILE: Profile = {
  id: "sample-kd",
  name: "KrackedDevs",
  oneLiner: "Malaysia's builder ecosystem: a community, a school and a product lab, run by builders.",
  about:
    "Where Malaysia comes to build. KD runs guilds, weekly classes, hackathons and bounties, the AI Builder School and KD Labs, a 25-seat programme that turns projects into startups. It works with companies and government to turn talent into shipped work.",
  country: "MY",
  sectors: ["edtech", "devtools", "ai"],
  stage: "seed",
  teamSize: 11,
  website: "https://krackeddevs.com",
  logo: "/kd/logo.png",
  banner: "/kd/banner.jpg",
  accent: "#22d41b",
  highlights: [
    { value: "3,744", label: "Builders" },
    { value: "594", label: "Projects shipped" },
    { value: "26", label: "Guilds" },
    { value: "29", label: "Events run" },
  ],
  source: "sample",
};

export const KD_REQUEST: Request = {
  needs: ["funding", "pilot-partner", "market-entry", "cloud-credits"],
  targetMarkets: ["SG", "ID", "VN"],
  ask: "Take KD Labs regional",
  notes: "Partners and funding to run KD Labs and the AI Builder School in Singapore, Jakarta and Ho Chi Minh City, plus cloud credits for builders.",
};

/** Two more sample companies, used on the landing page only. */
export const BUDI: { profile: Profile; request: Request } = {
  profile: {
    id: "sample-budi",
    name: "PadiGuard",
    oneLiner: "Phone-photo AI that warns rice farmers about pests before they spread.",
    country: "ID",
    sectors: ["agritech", "ai"],
    stage: "pre-seed",
    teamSize: 2,
    source: "sample",
  },
  request: { needs: ["funding", "pilot-partner"], targetMarkets: ["MY", "VN"] },
};

export const LINH: { profile: Profile; request: Request } = {
  profile: {
    id: "sample-linh",
    name: "Kipay",
    oneLiner: "Payroll and micro-savings for factory workers.",
    country: "VN",
    sectors: ["fintech", "saas"],
    stage: "seed",
    teamSize: 9,
    source: "sample",
  },
  request: { needs: ["funding", "market-entry"], targetMarkets: ["TH", "PH"] },
};
