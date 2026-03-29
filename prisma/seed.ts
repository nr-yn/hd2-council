import { prisma } from "@platform/db";
import { COMMUNITY_ORG_ID, ADMIN_EMAIL } from "../lib/config";

const CYCLE_ID = "hd2-cycle-seed-1";

const ISSUES: {
  id: string;
  title: string;
  description: string;
  proposedChange: string;
  category: "balance" | "bug" | "qol" | "content";
  submitterEmail: string;
}[] = [
  // ── BALANCE — Controversial nerfs ─────────────────────────────────────────
  {
    id: "issue-breaker-incendiary-nerf",
    title: "Breaker Incendiary over-nerfed in Escalation of Freedom — still not recovered",
    description:
      "The SG-225IE Breaker Incendiary had its magazines cut from 6 to 4 and recoil increased from 28 to 41 in the August 2024 Escalation of Freedom update. Over a year later it still runs dry before the reload window on Difficulty 7+. The nerf was justified by a 30% Terminid session usage rate — but in a co-op PvE game, high usage means a weapon is fun and effective, not that it is broken.",
    proposedChange:
      "Restore magazine count to 6 and reduce recoil to 32 (a modest increase from pre-nerf). If usage-based balancing is the framework, buff the other primary shotguns to be competitive alternatives rather than nerfing the one weapon players enjoy.",
    category: "balance",
    submitterEmail: "democracy.enjoyer@super-earth.gov",
  },
  {
    id: "issue-flamethrower-warbond-nerf",
    title: "Flamethrower armour penetration removed the same week as the fire-themed Warbond launched",
    description:
      "The FLAM-40 Flamethrower lost the ability to penetrate Charger leg armour in the same patch that released the Freedom's Flame Warbond — a premium content drop selling additional flamethrowers. The timing was interpreted by the community as deliberately degrading existing tools to push new paid purchases. 'Not one single person is happy about this change' became the most-upvoted Steam thread of the month.",
    proposedChange:
      "Restore flamethrower leg-armour penetration on Chargers, or define a consistent anti-armour niche for all fire-class weapons and publish it. If fire cannot be a heavy-armour counter, the Warbond marketing copy must be updated accordingly.",
    category: "balance",
    submitterEmail: "pyro.rights@helldivers.net",
  },
  {
    id: "issue-eruptor-double-nerf",
    title: "E-36 Eruptor double-nerfed — shrapnel removed with no meaningful compensation",
    description:
      "The E-36 Eruptor received two successive nerfs: magazine count halved, then all shrapnel removed from its explosion (replaced with +40 flat damage that independent testing showed was a net downgrade). The weapon went from reliably one-shotting Devastators and Bile Spewers — its core identity — to requiring multiple shots with reduced ammo. A community manager called the shrapnel change 'not working as intended' while a game designer said the weapon was 'still absolutely viable' in the same week, creating contradictory public messaging.",
    proposedChange:
      "Restore shrapnel, or increase direct-hit damage by at least 80 (not 40) to genuinely compensate for the crowd-control loss. Restore the magazine count from the first nerf. Commit to one public position on the weapon's intended role.",
    category: "balance",
    submitterEmail: "eruptor.main@gmail.com",
  },
  {
    id: "issue-coyote-stealth-nerf",
    title: "AR-2 Coyote stealth-nerfed via enemy resistance changes not listed in patch notes",
    description:
      "Patch 4.1.0 increased enemy fire resistance by approximately 20% across most Terminid and Automaton units. This was not documented in the patch notes. The AR-2 Coyote — the most-used AR — now requires three shots to trigger fire status on a Warrior instead of two. During the developer livestream for that patch, developers joked on camera that the Coyote 'wasn't nerfed' and wasn't in the notes, while having already shipped the indirect nerf via enemy stat changes.",
    proposedChange:
      "Publish all enemy stat changes — including durability, resistance, and damage multipliers — in the patch notes with explicit before/after values. Revert the fire-buildup penalty on the Coyote or reduce enemy fire resistance to pre-4.1.0 levels.",
    category: "balance",
    submitterEmail: "patch.notes.matter@protonmail.com",
  },
  {
    id: "issue-railgun-safe-mode",
    title: "Railgun Safe Mode still unviable 12+ months after the 2024 nerf",
    description:
      "The Railgun's Safe Mode armour penetration was reduced in early 2024, removing its ability to reliably crack Charger leg armour. It has not received a compensating buff in subsequent patches. It now sits in an awkward position: heavier than primary weapons, requiring a backpack slot, but unable to one-shot the heavy enemies that justify the tradeoffs. The Quasar Cannon outperforms it in nearly every metric while occupying the same niche.",
    proposedChange:
      "Restore Safe Mode heavy armour penetration on direct hits, or introduce a unique mechanic — such as armour stripping that leaves a weak point — that the Quasar cannot replicate. The weapon should have a distinct role, not just be an inferior version of other options.",
    category: "balance",
    submitterEmail: "railgun.enjoyer@super-earth.gov",
  },
  {
    id: "issue-quasar-vs-recoilless",
    title: "Quasar Cannon was nerfed instead of buffing the Recoilless Rifle — wrong direction",
    description:
      "When the Quasar Cannon was identified as outperforming the Recoilless Rifle (same damage, no backpack requirement, infinite ammo), Arrowhead increased the Quasar's cooldown by 50% rather than improving the Recoilless. The Quasar remains the better choice in most scenarios. The Recoilless Rifle's team-reload mechanic — which requires a teammate to sacrifice their backpack slot and stand still for 5 seconds in Difficulty 7+ — is functionally unusable in the game's own difficulty design.",
    proposedChange:
      "Buff the Recoilless Rifle's solo reload speed by 30% and add a bonus shot when team-reload is used (making the cooperation risk worthwhile). Alternatively, give the RR higher single-hit damage than the Quasar to justify its co-op dependency.",
    category: "balance",
    submitterEmail: "recoilless.advocate@gmail.com",
  },
  {
    id: "issue-undocumented-enemy-buffs",
    title: "Patch 4.1.0 shipped undocumented enemy durability increases across most unit types",
    description:
      "Independent community testing after Patch 4.1.0 documented that Berserker arm/leg durability increased from 0% to 30%, Hive Guard fire damage multiplier reduced from 100% to 80%, and most standard enemies received a ~20% body durability increase. None of these changes appeared in the patch notes. Because weapon damage numbers were unchanged, Arrowhead could claim no weapons were nerfed — while all weapons effectively lost 20% damage against most targets.",
    proposedChange:
      "Require a dedicated 'Enemy Stat Changes' section in all patch notes with explicit numerical values. Community spreadsheet maintainers currently do this work for Arrowhead — it should be official. Any enemy resistance or durability change must be classified as an indirect weapon balance change and disclosed.",
    category: "balance",
    submitterEmail: "data.miner@helldivers.community",
  },
  {
    id: "issue-thermite-grenade-weak",
    title: "Thermite Grenade underperforms its paid Warbond pitch — and is bugged in co-op",
    description:
      "The Thermite Grenade from the Democratic Detonation Warbond was marketed as an anti-armour solution. In practice: it bounces off Chargers and Bile Titans instead of sticking, requires weakspot precision that defeats the purpose of a grenade, deals less total damage than the standard Incendiary Grenade against heavy targets, and — critically — its damage-over-time effect only applies to the host player in multiplayer. Other players in the session deal no fire damage.",
    proposedChange:
      "Fix the host-only DoT bug immediately as it is a multiplayer correctness failure. Separately: increase magnetic adhesion to heavy enemy targets so the grenade sticks reliably, and double the base damage over time value. The weapon should meaningfully threaten Charger leg armour.",
    category: "balance",
    submitterEmail: "warbond.buyer@super-earth.gov",
  },
  {
    id: "issue-orbital-smoke-emp-useless",
    title: "Orbital Smoke and Orbital EMP are not viable above Difficulty 5",
    description:
      "The Orbital Smoke has a 3-minute cooldown but provides inconsistent cloud coverage, zero damage, and a shorter duration than the Eagle Smoke. The Orbital EMP has a higher cooldown than the EMS Mortar, smaller effective radius, and only a single activation. Both occupy competitive stratagem slots against options that offer significantly more value. No recent balance patch has addressed either stratagem. They are widely considered non-picks at any difficulty level where optimal loadouts matter.",
    proposedChange:
      "Orbital Smoke: reduce cooldown from 3:00 to 1:30, increase cloud radius by 40%, and add a brief suppression effect on enemies within the cloud. Orbital EMP: increase radius by 50% and reduce cooldown from 3:30 to 2:00 to make it a genuine alternative to the EMS Mortar.",
    category: "balance",
    submitterEmail: "stratagem.analyst@gmail.com",
  },
  {
    id: "issue-illuminate-difficulty-scaling",
    title: "Illuminate faction difficulty scaling exposes high-tier enemies at low difficulty settings",
    description:
      "The Illuminate faction (returned in Patch 6.1.0, March 2026) spawns Overseers and Harvester-equivalent units on Difficulty 3–4, creating a hostile onboarding experience for players encountering the faction for the first time. Terminids and Automatons have clear counter-play tutorials and gradual difficulty ramps. Illuminate has neither. Community reports describe new players leaving the game during Illuminate missions after repeated unexpected wipes.",
    proposedChange:
      "Cap Illuminate enemy tier by difficulty level (no Overseers below Difficulty 5, no Harvesters below Difficulty 7). Add a faction-specific challenge tutorial mission. Publish a difficulty scaling document for all three factions so players know what to expect.",
    category: "balance",
    submitterEmail: "new.player.experience@gmail.com",
  },
  {
    id: "issue-warbond-power-creep-floor",
    title: "Recent Warbonds consistently underperform — paid content is not competitive",
    description:
      "The Masters of Ceremony Warbond (May 2025, 1,000 Super Credits) launched with a marksman rifle that is redundant with free alternatives, the Pyrotech grenade that is weaker than existing incendiaries, and the Reinforced Epaulettes armour perk that reduces limb-break chance — compared to the existing free Servo-Assisted perk which gives +50% limb health and +30% grenade throw range. Players are increasingly reporting they do not feel Warbond purchases represent fair value.",
    proposedChange:
      "Each Warbond must include at least one item that is competitive with the best available option in its category — not necessarily meta-dominant, but not redundant. Introduce an independent balance review process for Warbond weapons before launch, or commit to post-launch buffs within 30 days if a Warbond item is deemed non-viable by the community.",
    category: "balance",
    submitterEmail: "consumer.rights@helldivers.net",
  },
  {
    id: "issue-grenade-pistol-ammo",
    title: "GP-31 Grenade Pistol ammo cut makes it non-viable as a sidearm at high difficulty",
    description:
      "The GP-31 Grenade Pistol had its ammo capacity significantly reduced in the Escalation of Freedom patch. It was one of the most-used sidearms for dealing with Fabricators and Stalker nests without requiring a primary or stratagem. Post-nerf, players report running out of grenades before completing a single objective on Difficulty 8+. The reduction was not accompanied by a damage increase or any compensating change.",
    proposedChange:
      "Increase GP-31 max ammo by 2 grenades (partial restoration), or reduce cooldown on resupply pod grenade replenishment. The weapon's niche — dealing with structures without using primary ammo — should remain viable.",
    category: "balance",
    submitterEmail: "sidearm.user@gmail.com",
  },

  // ── BUGS ──────────────────────────────────────────────────────────────────
  {
    id: "issue-host-migration-crash",
    title: "Host migration crashes the session for remaining players the majority of the time",
    description:
      "When the mission host disconnects, Helldivers 2's peer-to-peer architecture attempts host migration to another player. In practice, this crashes the game for all remaining players in the majority of cases, returning them to their ship with mission progress lost. Players report host migration working correctly 'maybe once' across hundreds of hours of play. This is listed on Arrowhead's official Known Issues page.",
    proposedChange:
      "Implement a reliable host-migration handshake before the connection transfers. If seamless migration is not feasible with the current architecture, add a 'Rejoin Last Mission' button on the main ship screen that restores the player's session within a 5-minute window of a crash.",
    category: "bug",
    submitterEmail: "session.recovery@protonmail.com",
  },
  {
    id: "issue-weapon-audio-cutout",
    title: "Weapon and stratagem audio cuts out completely during heavy combat — ongoing since 2024",
    description:
      "A persistent bug causes all weapon sounds, stratagem audio cues, and enemy vocalisations to go silent mid-mission. The bug is most frequently triggered in explosion-heavy situations. It has been present since early 2024 and remains unresolved as of March 2026. Without weapon audio, players lose critical situational awareness cues. The issue is on Arrowhead's official Known Issues page.",
    proposedChange:
      "Fix the audio channel management bug that triggers the cutout. As an interim measure, add a 'Restart Audio' keybind that resets the audio engine without ending the mission. Audio priority should protect weapon fire and enemy vocalisation cues above ambient and cosmetic sounds.",
    category: "bug",
    submitterEmail: "sound.design.matters@gmail.com",
  },
  {
    id: "issue-charger-footstep-audio",
    title: "Chargers produce no audio footstep cue — players have no warning of approach from behind",
    description:
      "Chargers — one of the most dangerous heavy Terminid enemies — produce no footstep audio when approaching. Players have no auditory warning when a Charger closes from outside their field of view on a loud battlefield. This is a safety-critical gameplay bug that directly causes deaths. Arrowhead acknowledged it as 'long overdue' for a fix in their October 2025 patch roadmap; community reports suggest it was only partially resolved.",
    proposedChange:
      "Add a distinct, loud footstep audio cue to the Charger's charge and approach animations, audible at a minimum of 30 metres. Include a brief ground-shake visual effect for added accessibility. Confirm in patch notes when the fix is considered complete.",
    category: "bug",
    submitterEmail: "charger.survivor@super-earth.gov",
  },
  {
    id: "issue-thermite-dot-bug",
    title: "Thermite Grenade damage-over-time only applies to the host player in co-op",
    description:
      "The Thermite Grenade's fire damage-over-time effect is only calculated on the host player's game instance. Non-host players who throw a Thermite Grenade deal zero fire damage after the initial impact. This makes the Thermite effectively non-functional for 3 of 4 players in a full squad. The bug has been present since the Democratic Detonation Warbond launched.",
    proposedChange:
      "Replicate the DoT calculation from the host to all clients, or switch to a server-authoritative DoT model where the host calculates DoT for all thrown grenades regardless of thrower. This is a correctness bug, not a balance decision — it should be fixed before any tuning discussion.",
    category: "bug",
    submitterEmail: "thermite.tester@gmail.com",
  },

  // ── QOL ───────────────────────────────────────────────────────────────────
  {
    id: "issue-loadout-presets",
    title: "No loadout preset system — players re-select all 8 gear slots before every mission",
    description:
      "Nearly two years after launch, Helldivers 2 has no way to save a loadout. Before every mission, players must manually select: primary weapon, secondary weapon, grenade type, armour, and all four stratagems. For players who swap loadouts by faction or difficulty, this is 8 selections every session. This is the single most consistently requested QoL feature across Reddit, Steam, and community Q&As. Johan Pilestedt acknowledged it directly in a Christmas 2025 community Q&A.",
    proposedChange:
      "Add at least 5 named loadout preset slots to the ship's armoury screen. Each preset saves: primary, secondary, grenade, armour, and all 4 stratagems. Presets should be shareable via a community code string. Promised in the 2026 roadmap — ETA?",
    category: "qol",
    submitterEmail: "loadout.efficiency@gmail.com",
  },
  {
    id: "issue-no-lobby-browser",
    title: "No lobby browser — impossible to filter missions by playstyle or communicate host intent",
    description:
      "Helldivers 2 has no lobby listing. Players join random public missions via Quick Play with no ability to filter by language, mission type, playstyle, or difficulty. Hosts cannot set descriptions ('sample run — no early extract', 'new player friendly', 'speed run') or level restrictions. This results in frequent mid-mission kicks, extraction disputes, and playstyle mismatches. A 'Rejoin Last Mission' option for disconnected players is closely related.",
    proposedChange:
      "Add a lightweight lobby listing page showing open public missions with: mission type, difficulty, host level, player count, and a 32-character freeform host note. No lobby join from this screen is required — Quick Play can remain the default. The host note alone would resolve the majority of friction cases.",
    category: "qol",
    submitterEmail: "lobby.qol@super-earth.gov",
  },
  {
    id: "issue-resupply-minimap-marker",
    title: "Resupply pods do not appear on the minimap after landing",
    description:
      "When a resupply stratagem is called in, the pod does not display a marker on the minimap. In high-chaos fights with multiple stratagems landing simultaneously, teammates frequently cannot locate the resupply pack. This has been a known UX gap since launch and disproportionately affects chaotic Difficulty 9+ missions where coordinated resupply is most critical.",
    proposedChange:
      "Add a temporary minimap marker for resupply pods that persists for 30 seconds after landing and is visible to all squad members. Use the same icon system as objective markers to ensure visual consistency.",
    category: "qol",
    submitterEmail: "minimap.citizen@gmail.com",
  },

  // ── CONTENT ───────────────────────────────────────────────────────────────
  {
    id: "issue-no-free-endgame-progression",
    title: "No long-term free progression track — meaningful new gear is locked behind paid Warbonds",
    description:
      "As of March 2026, there are approximately $170 worth of Premium Warbonds in the game. The only way to access new experimental weapons, stratagems, and armour perks is by purchasing Warbonds. While core options (Recoilless Rifle, Eagle Airstrike, Orbital Precision Strike) are free, the pipeline of new and niche tools is exclusively premium. Players who have 100%-completed all free content have no ongoing progression goal without spending real money.",
    proposedChange:
      "Add a Requisition Slip–funded long-term progression track: a non-premium 'Field Armament' tree where players spend accumulated Requisition Slips on cosmetic variants of existing weapons and a new community-voted stratagem each major patch cycle. This does not require competing with Warbond content — it provides endgame engagement for non-paying veterans.",
    category: "content",
    submitterEmail: "free.player@super-earth.gov",
  },
];

async function main() {
  console.log("Seeding HD2 Council...");

  // 1. Upsert community organisation
  await prisma.organisation.upsert({
    where: { id: COMMUNITY_ORG_ID },
    create: {
      id: COMMUNITY_ORG_ID,
      name: "Helldivers 2 Community",
      orgType: "community",
      jurisdiction: "GLOBAL",
      legalForm: "informal",
    },
    update: {},
  });
  console.log("Organisation upserted:", COMMUNITY_ORG_ID);

  // 2. Upsert open meeting (voting cycle)
  await prisma.meeting.upsert({
    where: { id: CYCLE_ID },
    create: {
      id: CYCLE_ID,
      organisationId: COMMUNITY_ORG_ID,
      meetingType: "council",
      title: "Voting Cycle — Season 1",
      date: new Date(),
      status: "pending",
    },
    update: {},
  });
  console.log("Meeting upserted:", CYCLE_ID);

  // 3. Upsert admin person
  await prisma.person.upsert({
    where: { email: ADMIN_EMAIL },
    create: { name: "Council Admin", email: ADMIN_EMAIL },
    update: {},
  });

  // 4. Seed issues as AgendaItem + approved Motion — votes start at zero
  for (let i = 0; i < ISSUES.length; i++) {
    const issue = ISSUES[i];

    await prisma.person.upsert({
      where: { email: issue.submitterEmail },
      create: { name: issue.submitterEmail.split("@")[0], email: issue.submitterEmail },
      update: {},
    });

    const agendaItem = await prisma.agendaItem.upsert({
      where: { id: issue.id },
      create: {
        id: issue.id,
        meetingId: CYCLE_ID,
        orderIndex: i + 1,
        title: issue.title,
        description: issue.description,
        category: "decision",
        requiresResolution: true,
      },
      update: {
        title: issue.title,
        description: issue.description,
        orderIndex: i + 1,
      },
    });

    const specialNotes = JSON.stringify({
      submitterEmail: issue.submitterEmail,
      proposedChange: issue.proposedChange,
    });

    const existingMotion = await prisma.motion.findFirst({
      where: { agendaItemId: agendaItem.id, outcome: "passed" },
    });

    if (existingMotion) {
      await prisma.motion.update({
        where: { id: existingMotion.id },
        data: {
          specialNotes,
          votesFor: 0,
          votesAgainst: 0,
          votesAbstain: 0,
        },
      });
    } else {
      await prisma.motion.create({
        data: {
          agendaItemId: agendaItem.id,
          motionText: `That this issue be accepted into the voting cycle: "${issue.title}"`,
          motionType: "ordinary",
          resolutionType: issue.category,
          outcome: "passed",
          votesFor: 0,
          votesAgainst: 0,
          votesAbstain: 0,
          specialNotes,
        },
      });
    }

    console.log(`  [${i + 1}/${ISSUES.length}] ${issue.title.slice(0, 70)}…`);
  }

  console.log("\nSeed complete. 20 real HD2 community issues loaded — votes reset to zero.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
