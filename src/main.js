const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const menuOverlay = document.getElementById("menu-overlay");
const endOverlay = document.getElementById("end-overlay");
const endTitle = document.getElementById("end-title");
const endCopy = document.getElementById("end-copy");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const openEncyclopediaBtn = document.getElementById("open-encyclopedia-btn");
const encyclopediaOverlay = document.getElementById("encyclopedia-overlay");
const closeEncyclopediaBtn = document.getElementById("close-encyclopedia-btn");
const encyclopediaTitle = document.getElementById("encyclopedia-title");
const encyclopediaList = document.getElementById("encyclopedia-list");
const encyclopediaTabs = Array.from(document.querySelectorAll(".encyclopedia-tab[data-encyclopedia-tab]"));
const mapModeCopy = document.getElementById("map-mode-copy");
const mapOptionButtons = Array.from(document.querySelectorAll(".map-option[data-map-mode]"));

const GRID_COLS = 27;
const GRID_ROWS = 20;
const TILE_SIZE = 27;
const TILE_STEP = 29;
const TILE_HEIGHT = 6;
const TILE_DEPTH = 4;
const GRID_DRAW_WIDTH = (GRID_COLS - 1) * TILE_STEP + TILE_SIZE + TILE_DEPTH;
const GRID_ORIGIN_X = Math.round((canvas.width - GRID_DRAW_WIDTH) * 0.5);
const GRID_ORIGIN_Y = 136;

const SMALL_ENEMY_FOOTPRINT = 1;
const LARGE_ENEMY_FOOTPRINT = 2;
const LARGE_ENEMY_AREA = LARGE_ENEMY_FOOTPRINT * LARGE_ENEMY_FOOTPRINT;
const ANCHOR_COLS = GRID_COLS - LARGE_ENEMY_FOOTPRINT + 1;
const ANCHOR_ROWS = GRID_ROWS - LARGE_ENEMY_FOOTPRINT + 1;

const MAP_MODES = ["empty", "random"];
const EMPTY_MAP_SPAWN = { c: 0, r: Math.floor((GRID_ROWS - LARGE_ENEMY_FOOTPRINT) * 0.5) };
const EMPTY_MAP_GOAL = { c: ANCHOR_COLS - 1, r: Math.floor((GRID_ROWS - LARGE_ENEMY_FOOTPRINT) * 0.5) };

const WAVES = [
  { count: 8, hp: 70, speed: 58, reward: 12, spawnGap: 0.9 },
  { count: 11, hp: 95, speed: 64, reward: 13, spawnGap: 0.82 },
  { count: 14, hp: 125, speed: 70, reward: 15, spawnGap: 0.75 },
  { count: 18, hp: 165, speed: 76, reward: 17, spawnGap: 0.68 },
  { count: 22, hp: 220, speed: 84, reward: 20, spawnGap: 0.6 }
];

const WAVE_BREAK_SECONDS = 2.7;
const MAX_SIMULTANEOUS_WAVES = 2;
const EARLY_CALL_MAX_BONUS_RATIO = 0.45;
const SETTINGS_STORAGE_KEY = "voxeltd.settings.v1";
const RANDOM_PATH_MAX_ATTEMPTS = 40;
const RANDOM_PATH_ROW_SPAN_MIN = Math.max(6, Math.floor(ANCHOR_ROWS * 0.45));
const RANDOM_PATH_UNIQUE_ROWS_MIN = Math.max(7, Math.floor(ANCHOR_ROWS * 0.5));
const RANDOM_PATH_TURN_MIN = 8;
const RANDOM_PATH_TURN_MAX = 18;
const ENEMY_MELEE_RANGE_PAD = 2;
const ENEMY_LABEL_MODE = "off";
const PLACEMENT_REASONS = {
  NONE: "none",
  OUT_OF_BOUNDS_FOOTPRINT: "out_of_bounds_footprint",
  ON_ROAD: "on_road",
  ON_ENDPOINT: "on_endpoint",
  OVERLAP_TOWER: "overlap_tower",
  OVERLAP_ENEMY: "overlap_enemy",
  LAUNCH_OUT_OF_BOUNDS: "launch_out_of_bounds",
  LAUNCH_OVERLAP_TOWER: "launch_overlap_tower",
  NO_LARGE_PATH: "no_large_path"
};

const ENEMY_TYPES = [
  {
    id: "raider",
    name: "Raider",
    short: "R",
    hpScale: 1,
    speedScale: 1,
    rewardScale: 1,
    radius: 14,
    footprint: SMALL_ENEMY_FOOTPRINT,
    palette: { top: "#d95f61", side: "#7a262a", front: "#932f34", stroke: "#ffd6d6" },
    damageMult: { kinetic: 1, frost: 1, explosive: 1, electric: 1 },
    slowResist: 1,
    slowDurationMult: 1,
    armorFlat: 0,
    regenPerSec: 0,
    shieldMax: 0,
    shieldRegenPerSec: 0,
    burstInterval: 0,
    burstDuration: 0,
    burstMultiplier: 1
  },
  {
    id: "sprinter",
    name: "Sprinter",
    short: "S",
    hpScale: 0.62,
    speedScale: 1.48,
    rewardScale: 0.9,
    radius: 12,
    footprint: SMALL_ENEMY_FOOTPRINT,
    palette: { top: "#ff8d65", side: "#9a3f21", front: "#ba5730", stroke: "#ffe0d2" },
    damageMult: { kinetic: 0.95, frost: 1.18, explosive: 1, electric: 1.05 },
    slowResist: 0.82,
    slowDurationMult: 0.85,
    armorFlat: 0,
    regenPerSec: 0,
    shieldMax: 0,
    shieldRegenPerSec: 0,
    burstInterval: 2.3,
    burstDuration: 0.55,
    burstMultiplier: 1.55
  },
  {
    id: "bulwark",
    name: "Bulwark",
    short: "B",
    hpScale: 2.1,
    speedScale: 0.74,
    rewardScale: 1.35,
    radius: 16,
    footprint: SMALL_ENEMY_FOOTPRINT,
    palette: { top: "#b96560", side: "#663029", front: "#7f3c33", stroke: "#ffddd5" },
    damageMult: { kinetic: 0.62, frost: 0.9, explosive: 1.08, electric: 1.14 },
    slowResist: 0.9,
    slowDurationMult: 0.88,
    armorFlat: 3.6,
    regenPerSec: 0,
    shieldMax: 0,
    shieldRegenPerSec: 0,
    burstInterval: 0,
    burstDuration: 0,
    burstMultiplier: 1
  },
  {
    id: "glacial",
    name: "Glacial",
    short: "G",
    hpScale: 1.3,
    speedScale: 0.96,
    rewardScale: 1.2,
    radius: 14,
    footprint: SMALL_ENEMY_FOOTPRINT,
    palette: { top: "#8fc8ff", side: "#2f5f8b", front: "#3f7cae", stroke: "#def4ff" },
    damageMult: { kinetic: 1.08, frost: 0.32, explosive: 0.96, electric: 1 },
    slowResist: 0.24,
    slowDurationMult: 0.35,
    armorFlat: 0,
    regenPerSec: 3.8,
    shieldMax: 0,
    shieldRegenPerSec: 0,
    burstInterval: 0,
    burstDuration: 0,
    burstMultiplier: 1
  },
  {
    id: "capacitor",
    name: "Capacitor",
    short: "C",
    hpScale: 1.14,
    speedScale: 1.04,
    rewardScale: 1.32,
    radius: 14,
    footprint: SMALL_ENEMY_FOOTPRINT,
    palette: { top: "#b2a8ff", side: "#5a3ca0", front: "#6e4cbe", stroke: "#f2edff" },
    damageMult: { kinetic: 0.98, frost: 1, explosive: 1.2, electric: 0.42 },
    slowResist: 1,
    slowDurationMult: 1,
    armorFlat: 0,
    regenPerSec: 0,
    shieldMax: 34,
    shieldRegenPerSec: 6.2,
    burstInterval: 0,
    burstDuration: 0,
    burstMultiplier: 1
  },
  {
    id: "giant",
    name: "Giant",
    short: "G!",
    hpScale: 3.55,
    speedScale: 0.52,
    rewardScale: 2.7,
    radius: 28,
    footprint: LARGE_ENEMY_FOOTPRINT,
    palette: { top: "#d27a68", side: "#6a3024", front: "#854030", stroke: "#ffdccc" },
    damageMult: { kinetic: 0.82, frost: 0.9, explosive: 1.14, electric: 1 },
    slowResist: 0.72,
    slowDurationMult: 0.8,
    armorFlat: 4.8,
    regenPerSec: 3.2,
    shieldMax: 0,
    shieldRegenPerSec: 0,
    burstInterval: 0,
    burstDuration: 0,
    burstMultiplier: 1
  }
];

const ENEMY_VISUAL_DEFAULTS = {
  raider: {
    visualId: "raider",
    visualScale: 1,
    silhouetteBias: "forward_brute",
    accentColor: "#f2a09f",
    motionProfile: "raider_sway"
  },
  sprinter: {
    visualId: "sprinter",
    visualScale: 0.94,
    silhouetteBias: "wedge_runner",
    accentColor: "#ffd3b8",
    motionProfile: "sprinter_stride"
  },
  bulwark: {
    visualId: "bulwark",
    visualScale: 1.1,
    silhouetteBias: "shield_block",
    accentColor: "#efc2ba",
    motionProfile: "bulwark_stomp"
  },
  glacial: {
    visualId: "glacial",
    visualScale: 1.03,
    silhouetteBias: "shard_back",
    accentColor: "#dff2ff",
    motionProfile: "glacial_shimmer"
  },
  capacitor: {
    visualId: "capacitor",
    visualScale: 1.04,
    silhouetteBias: "coil_core",
    accentColor: "#efe6ff",
    motionProfile: "capacitor_pulse"
  },
  giant: {
    visualId: "giant",
    visualScale: 1.2,
    silhouetteBias: "fortress_hulk",
    accentColor: "#ffdccc",
    motionProfile: "giant_heavy"
  }
};

for (const enemyType of ENEMY_TYPES) {
  const visualDefaults = ENEMY_VISUAL_DEFAULTS[enemyType.id] || {};
  enemyType.visualId = enemyType.visualId || visualDefaults.visualId || enemyType.id;
  enemyType.visualScale = Number.isFinite(enemyType.visualScale) ? enemyType.visualScale : visualDefaults.visualScale || 1;
  enemyType.silhouetteBias = enemyType.silhouetteBias || visualDefaults.silhouetteBias || "core";
  enemyType.accentColor = enemyType.accentColor || visualDefaults.accentColor || enemyType.palette.stroke;
  enemyType.motionProfile = enemyType.motionProfile || visualDefaults.motionProfile || "steady";
}

const ENEMY_TYPE_BY_ID = Object.fromEntries(ENEMY_TYPES.map((enemyType) => [enemyType.id, enemyType]));

const TOWER_TYPES = [
  {
    id: "cannon",
    name: "Cannon",
    short: "Single",
    key: "1",
    cost: 50,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 170,
    fireRate: 0.7,
    damage: 30,
    projectileSpeed: 320,
    projectileKind: "bullet",
    defaultAimAngle: -0.25,
    turnSpeed: 6.2,
    muzzleLength: 24,
    colors: {
      top: "#8ec7f0",
      side: "#366390",
      front: "#4a79a8",
      stroke: "#d9efff",
      accent: "#23496f"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 170,
        fireRate: 0.7,
        damage: 30,
        projectileSpeed: 320,
        projectileKind: "bullet",
        turnSpeed: 6.2,
        muzzleLength: 24,
        pierceCount: 0
      },
      {
        label: "Medium",
        upgradeCost: 72,
        range: 188,
        fireRate: 0.58,
        damage: 42,
        projectileSpeed: 350,
        projectileKind: "bullet",
        turnSpeed: 6.6,
        muzzleLength: 25,
        pierceCount: 0
      },
      {
        label: "Advanced",
        upgradeCost: 168,
        range: 208,
        fireRate: 0.5,
        damage: 56,
        projectileSpeed: 385,
        projectileKind: "bullet",
        turnSpeed: 7,
        muzzleLength: 27,
        pierceCount: 1
      }
    ]
  },
  {
    id: "frost",
    name: "Ice",
    short: "Freeze",
    key: "2",
    cost: 60,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 168,
    fireRate: 0.95,
    damage: 10,
    projectileSpeed: 285,
    projectileKind: "frost",
    freezeDuration: 2.2,
    defaultAimAngle: -0.75,
    turnSpeed: 5.8,
    muzzleLength: 19,
    colors: {
      top: "#9ce8ff",
      side: "#2f7e9a",
      front: "#3d96b4",
      stroke: "#e0f9ff",
      accent: "#4fc7f8"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 168,
        fireRate: 0.95,
        damage: 10,
        projectileSpeed: 285,
        projectileKind: "frost",
        freezeDuration: 2.2,
        turnSpeed: 5.8,
        muzzleLength: 19,
        frostBurstRadius: 0
      },
      {
        label: "Medium",
        upgradeCost: 92,
        range: 182,
        fireRate: 0.84,
        damage: 14,
        projectileSpeed: 300,
        projectileKind: "frost",
        freezeDuration: 2.6,
        turnSpeed: 6.1,
        muzzleLength: 20,
        frostBurstRadius: 0
      },
      {
        label: "Advanced",
        upgradeCost: 198,
        range: 196,
        fireRate: 0.76,
        damage: 18,
        projectileSpeed: 318,
        projectileKind: "frost",
        freezeDuration: 3,
        turnSpeed: 6.5,
        muzzleLength: 22,
        frostBurstRadius: 44
      }
    ]
  },
  {
    id: "mortar",
    name: "Mortar",
    short: "AoE",
    key: "3",
    cost: 85,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 210,
    fireRate: 1.45,
    damage: 24,
    projectileSpeed: 230,
    projectileKind: "mortar",
    aoeRadius: 68,
    defaultAimAngle: -0.4,
    turnSpeed: 4.2,
    muzzleLength: 16,
    colors: {
      top: "#f0b887",
      side: "#8f5c33",
      front: "#a76d3e",
      stroke: "#ffe9d5",
      accent: "#6d3c15"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 210,
        fireRate: 1.45,
        damage: 24,
        projectileSpeed: 230,
        projectileKind: "mortar",
        aoeRadius: 68,
        turnSpeed: 4.2,
        muzzleLength: 16,
        clusterCount: 0,
        clusterDamage: 0,
        clusterRadius: 0
      },
      {
        label: "Medium",
        upgradeCost: 124,
        range: 224,
        fireRate: 1.24,
        damage: 34,
        projectileSpeed: 245,
        projectileKind: "mortar",
        aoeRadius: 84,
        turnSpeed: 4.6,
        muzzleLength: 17,
        clusterCount: 0,
        clusterDamage: 0,
        clusterRadius: 0
      },
      {
        label: "Advanced",
        upgradeCost: 252,
        range: 238,
        fireRate: 1.08,
        damage: 44,
        projectileSpeed: 260,
        projectileKind: "mortar",
        aoeRadius: 102,
        turnSpeed: 5,
        muzzleLength: 18,
        clusterCount: 2,
        clusterDamage: 18,
        clusterRadius: 38
      }
    ]
  },
  {
    id: "tesla",
    name: "Tesla",
    short: "Chain",
    key: "4",
    cost: 95,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 165,
    fireRate: 1.08,
    damage: 22,
    projectileKind: "chain",
    chainJumps: 3,
    chainRange: 128,
    defaultAimAngle: -0.2,
    turnSpeed: 7.1,
    muzzleLength: 18,
    colors: {
      top: "#cab8ff",
      side: "#5a3ca0",
      front: "#6e4cbe",
      stroke: "#f2edff",
      accent: "#9ad7ff"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 165,
        fireRate: 1.08,
        damage: 22,
        projectileKind: "chain",
        chainJumps: 3,
        chainRange: 128,
        turnSpeed: 7.1,
        muzzleLength: 18,
        shockDps: 0,
        shockDuration: 0
      },
      {
        label: "Medium",
        upgradeCost: 138,
        range: 178,
        fireRate: 0.96,
        damage: 29,
        projectileKind: "chain",
        chainJumps: 4,
        chainRange: 148,
        turnSpeed: 7.5,
        muzzleLength: 19,
        shockDps: 0,
        shockDuration: 0
      },
      {
        label: "Advanced",
        upgradeCost: 286,
        range: 192,
        fireRate: 0.86,
        damage: 35,
        projectileKind: "chain",
        chainJumps: 5,
        chainRange: 168,
        turnSpeed: 8,
        muzzleLength: 20,
        shockDps: 16,
        shockDuration: 1.4
      }
    ]
  },
  {
    id: "slime",
    name: "Slime",
    short: "Trail Slow",
    key: "5",
    cost: 70,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 174,
    fireRate: 0.78,
    damage: 9,
    projectileSpeed: 250,
    projectileKind: "slime",
    slowFactor: 0.7,
    slimePatchSlowFactor: 0.78,
    slimeTrailDuration: 3.5,
    defaultAimAngle: -0.65,
    turnSpeed: 5.7,
    muzzleLength: 18,
    colors: {
      top: "#9ddf6b",
      side: "#3f6f28",
      front: "#5a9a3d",
      stroke: "#e4f7d1",
      accent: "#c7ff73"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 174,
        fireRate: 0.78,
        damage: 9,
        projectileSpeed: 250,
        projectileKind: "slime",
        slowFactor: 0.7,
        slimePatchSlowFactor: 0.78,
        slimeTrailDuration: 3.5,
        turnSpeed: 5.7,
        muzzleLength: 18,
        slimeSpread: 0
      },
      {
        label: "Medium",
        upgradeCost: 102,
        range: 188,
        fireRate: 0.7,
        damage: 13,
        projectileSpeed: 265,
        projectileKind: "slime",
        slowFactor: 0.64,
        slimePatchSlowFactor: 0.72,
        slimeTrailDuration: 3.8,
        turnSpeed: 6,
        muzzleLength: 19,
        slimeSpread: 0
      },
      {
        label: "Advanced",
        upgradeCost: 224,
        range: 202,
        fireRate: 0.62,
        damage: 18,
        projectileSpeed: 278,
        projectileKind: "slime",
        slowFactor: 0.58,
        slimePatchSlowFactor: 0.66,
        slimeTrailDuration: 4.2,
        turnSpeed: 6.3,
        muzzleLength: 20,
        slimeSpread: 1
      }
    ]
  },
  {
    id: "flame",
    name: "Flamethrower",
    short: "Beam",
    key: "6",
    cost: 110,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 150,
    fireRate: 0.2,
    damage: 0,
    projectileKind: "flame_beam",
    beamLengthTiles: 4,
    beamDuration: 3,
    beamCooldown: 2.4,
    beamDps: 58,
    beamWidth: 10,
    defaultAimAngle: -0.3,
    turnSpeed: 6.8,
    muzzleLength: 20,
    colors: {
      top: "#ffbc6d",
      side: "#9b4f22",
      front: "#bf6529",
      stroke: "#ffe4b6",
      accent: "#ff7d3e"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 150,
        fireRate: 0.2,
        damage: 0,
        projectileKind: "flame_beam",
        beamLengthTiles: 4,
        beamDuration: 3,
        beamCooldown: 2.4,
        beamDps: 58,
        beamWidth: 10,
        turnSpeed: 6.8,
        muzzleLength: 20
      },
      {
        label: "Medium",
        upgradeCost: 142,
        range: 162,
        fireRate: 0.2,
        damage: 0,
        projectileKind: "flame_beam",
        beamLengthTiles: 4,
        beamDuration: 3,
        beamCooldown: 2.2,
        beamDps: 74,
        beamWidth: 11,
        turnSpeed: 7.2,
        muzzleLength: 21
      },
      {
        label: "Advanced",
        upgradeCost: 304,
        range: 176,
        fireRate: 0.2,
        damage: 0,
        projectileKind: "flame_beam",
        beamLengthTiles: 4,
        beamDuration: 3,
        beamCooldown: 2,
        beamDps: 92,
        beamWidth: 12.5,
        turnSpeed: 7.6,
        muzzleLength: 22
      }
    ]
  },
  {
    id: "barracks",
    name: "Barracks",
    short: "Militia",
    key: "7",
    cost: 130,
    footprint: 1,
    supportsRotation: false,
    placementKind: "standard",
    range: 0,
    fireRate: 1,
    damage: 0,
    projectileKind: "barracks_spawn",
    defaultAimAngle: 0,
    turnSpeed: 4,
    muzzleLength: 14,
    colors: {
      top: "#d2a47d",
      side: "#6c3f24",
      front: "#8a5230",
      stroke: "#ffe7cf",
      accent: "#3f2417"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 0,
        fireRate: 1,
        damage: 0,
        projectileKind: "barracks_spawn",
        defenderCount: 3,
        defenderHp: 120,
        defenderDamage: 16,
        defenderAttackInterval: 0.9,
        defenderRespawn: 10.7,
        defenderMoveSpeed: 86,
        defenderLeashTiles: 4
      },
      {
        label: "Medium",
        upgradeCost: 156,
        range: 0,
        fireRate: 1,
        damage: 0,
        projectileKind: "barracks_spawn",
        defenderCount: 3,
        defenderHp: 170,
        defenderDamage: 22,
        defenderAttackInterval: 0.78,
        defenderRespawn: 10.7,
        defenderMoveSpeed: 90,
        defenderLeashTiles: 4
      },
      {
        label: "Advanced",
        upgradeCost: 286,
        range: 0,
        fireRate: 1,
        damage: 0,
        projectileKind: "barracks_spawn",
        defenderCount: 3,
        defenderHp: 225,
        defenderDamage: 30,
        defenderAttackInterval: 0.66,
        defenderRespawn: 10.7,
        defenderMoveSpeed: 94,
        defenderLeashTiles: 4
      }
    ]
  },
  {
    id: "defender",
    name: "Defender",
    short: "Guardian",
    key: "8",
    cost: 185,
    footprint: 2,
    supportsRotation: true,
    placementKind: "rotatable_gate",
    range: 0,
    fireRate: 1,
    damage: 0,
    projectileKind: "guardian_spawn",
    defaultAimAngle: 0,
    turnSpeed: 4,
    muzzleLength: 18,
    colors: {
      top: "#bfa0d9",
      side: "#4e356c",
      front: "#674889",
      stroke: "#e9ddf7",
      accent: "#9fc8ff"
    },
    upgradeTiers: [
      {
        label: "Basic",
        upgradeCost: 0,
        range: 0,
        fireRate: 1,
        damage: 0,
        projectileKind: "guardian_spawn",
        guardianHp: 620,
        guardianDamage: 58,
        guardianAttackInterval: 1.15,
        guardianRespawn: 14,
        guardianMoveSpeed: 72,
        guardianStunDuration: 1,
        guardianStunRadiusTiles: 2.2
      },
      {
        label: "Medium",
        upgradeCost: 220,
        range: 0,
        fireRate: 1,
        damage: 0,
        projectileKind: "guardian_spawn",
        guardianHp: 840,
        guardianDamage: 74,
        guardianAttackInterval: 1,
        guardianRespawn: 14,
        guardianMoveSpeed: 75,
        guardianStunDuration: 1,
        guardianStunRadiusTiles: 2.4
      },
      {
        label: "Advanced",
        upgradeCost: 360,
        range: 0,
        fireRate: 1,
        damage: 0,
        projectileKind: "guardian_spawn",
        guardianHp: 1080,
        guardianDamage: 95,
        guardianAttackInterval: 0.88,
        guardianRespawn: 14,
        guardianMoveSpeed: 78,
        guardianStunDuration: 1,
        guardianStunRadiusTiles: 2.6
      }
    ]
  }
];

const TOWER_VISUAL_DEFAULTS = {
  cannon: {
    visualId: "cannon_carriage",
    baseProfile: "carriage",
    tierVisuals: ["brace", "reinforced"],
    muzzleProfile: "heavy_barrel",
    accentColor: "#8dd3ff"
  },
  frost: {
    visualId: "ice_crystal",
    baseProfile: "prism_core",
    tierVisuals: ["ring_shards", "crown_shards"],
    muzzleProfile: "frost_emitter",
    accentColor: "#b8f2ff"
  },
  mortar: {
    visualId: "mortar_siege",
    baseProfile: "siege_bowl",
    tierVisuals: ["stabilizers", "segmented_frame"],
    muzzleProfile: "tube",
    accentColor: "#ffd8b2"
  },
  tesla: {
    visualId: "tesla_coil",
    baseProfile: "coil_mast",
    tierVisuals: ["side_coils", "halo_nodes"],
    muzzleProfile: "arc_tip",
    accentColor: "#d6d0ff"
  },
  slime: {
    visualId: "slime_vat",
    baseProfile: "pressurized_vat",
    tierVisuals: ["dual_tank", "overflow_channels"],
    muzzleProfile: "goo_nozzle",
    accentColor: "#d8ff92"
  },
  flame: {
    visualId: "flame_rig",
    baseProfile: "fuel_pair",
    tierVisuals: ["wide_tanks", "heat_shroud"],
    muzzleProfile: "burner_nozzle",
    accentColor: "#ffc083"
  },
  barracks: {
    visualId: "barracks_keep",
    baseProfile: "fort_hall",
    tierVisuals: ["watch_post", "battlement_crest"],
    muzzleProfile: "gate",
    accentColor: "#f2d0a8"
  },
  defender: {
    visualId: "guardian_bunker",
    baseProfile: "gate_bunker",
    tierVisuals: ["reinforced_gate", "parapet_core"],
    muzzleProfile: "directional_gate",
    accentColor: "#d9c3f4"
  }
};

for (const towerType of TOWER_TYPES) {
  const visualDefaults = TOWER_VISUAL_DEFAULTS[towerType.id] || {};
  towerType.visualId = towerType.visualId || visualDefaults.visualId || towerType.id;
  towerType.baseProfile = towerType.baseProfile || visualDefaults.baseProfile || "standard";
  towerType.tierVisuals = towerType.tierVisuals || visualDefaults.tierVisuals || ["medium", "advanced"];
  towerType.muzzleProfile = towerType.muzzleProfile || visualDefaults.muzzleProfile || "default";
  towerType.accentColor = towerType.accentColor || visualDefaults.accentColor || towerType.colors.accent;
}

const TOWER_IDS = TOWER_TYPES.map((tower) => tower.id);
const TOWER_TYPE_BY_ID = Object.fromEntries(TOWER_TYPES.map((tower) => [tower.id, tower]));

const state = {
  mode: "menu",
  paused: false,
  towers: [],
  enemies: [],
  projectiles: [],
  defenders: [],
  slimePatches: [],
  shotFx: [],
  explosionFx: [],
  lightningFx: [],
  combatStats: {
    shotsByType: {},
    chainHits: 0,
    slowApplications: 0,
    splashHits: 0,
    freezeApplications: 0,
    slimeApplications: 0,
    defenderKills: 0
  },
  baseHealth: 24,
  credits: 240,
  score: 0,
  nextWaveNumber: 1,
  activeWaves: [],
  waveBreakTimer: 1.7,
  waveBreakDuration: 1.7,
  awaitingFirstWaveStart: true,
  hoveredCell: null,
  selectedTowerId: "cannon",
  buildPlacementArmed: false,
  placementRotation: {},
  lastPlaceAttempt: null,
  selectedPlacedTowerId: null,
  confirmAction: null,
  settingsOpen: false,
  settings: {
    showGridAlways: false
  },
  encyclopediaOpen: false,
  encyclopediaTab: "towers",
  encyclopediaPauseRestore: null,
  earlyCallBonusLast: 0,
  earlyCallFlash: 0,
  hudMessage: "",
  hudMessageTimer: 0,
  selectedMapMode: "empty",
  map: null,
  lanePathCache: {
    cells: [],
    dirty: true,
    refreshTimer: 0
  },
  backgroundDecor: [],
  simClock: 0,
  towerSeq: 1,
  enemySeq: 1,
  defenderSeq: 1,
  lastManualAdvanceAt: 0
};

const pointer = { x: 0, y: 0 };

function gridToTopLeft(c, r) {
  return {
    x: GRID_ORIGIN_X + c * TILE_STEP,
    y: GRID_ORIGIN_Y + r * TILE_STEP
  };
}

function gridToCenter(c, r) {
  const topLeft = gridToTopLeft(c, r);
  return {
    x: topLeft.x + TILE_SIZE * 0.5,
    y: topLeft.y - TILE_HEIGHT + TILE_SIZE * 0.5
  };
}

function gridToFootprintCenter(c, r, footprint = SMALL_ENEMY_FOOTPRINT) {
  const base = gridToCenter(c, r);
  const offset = (footprint - 1) * TILE_STEP * 0.5;
  return {
    x: base.x + offset,
    y: base.y + offset
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed.showGridAlways === "boolean") {
      state.settings.showGridAlways = parsed.showGridAlways;
    }
  } catch {
    // Keep defaults when settings fail to parse.
  }
}

function saveSettings() {
  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        showGridAlways: Boolean(state.settings.showGridAlways)
      })
    );
  } catch {
    // Ignore storage failures.
  }
}

function cellKey(c, r) {
  return `${c},${r}`;
}

function sameCell(a, b) {
  return a && b && a.c === b.c && a.r === b.r;
}

function worldToNearestCell(x, y) {
  const originCenterX = GRID_ORIGIN_X + TILE_SIZE * 0.5;
  const originCenterY = GRID_ORIGIN_Y - TILE_HEIGHT + TILE_SIZE * 0.5;
  const c = clamp(Math.round((x - originCenterX) / TILE_STEP), 0, GRID_COLS - 1);
  const r = clamp(Math.round((y - originCenterY) / TILE_STEP), 0, GRID_ROWS - 1);
  return { c, r };
}

function worldToNearestAnchor(x, y, footprint = SMALL_ENEMY_FOOTPRINT) {
  const anchorOffset = (footprint - 1) * TILE_STEP * 0.5;
  const originCenterX = GRID_ORIGIN_X + TILE_SIZE * 0.5 + anchorOffset;
  const originCenterY = GRID_ORIGIN_Y - TILE_HEIGHT + TILE_SIZE * 0.5 + anchorOffset;
  const c = clamp(Math.round((x - originCenterX) / TILE_STEP), 0, GRID_COLS - footprint);
  const r = clamp(Math.round((y - originCenterY) / TILE_STEP), 0, GRID_ROWS - footprint);
  return { c, r };
}

function getTowerFootprintByTypeId(typeId) {
  const type = TOWER_TYPE_BY_ID[typeId];
  return type && Number.isFinite(type.footprint) ? type.footprint : 1;
}

function getTowerFootprint(tower) {
  return tower && Number.isFinite(tower.footprint) ? tower.footprint : getTowerFootprintByTypeId(tower?.typeId);
}

function getFootprintCells(anchorCell, footprint) {
  const cells = [];
  if (!anchorCell) {
    return cells;
  }
  iterateFootprintCells(anchorCell, footprint, (c, r) => {
    cells.push({ c, r });
  });
  return cells;
}

function forEachTowerFootprintCell(tower, callback) {
  const footprint = getTowerFootprint(tower);
  iterateFootprintCells({ c: tower.c, r: tower.r }, footprint, callback);
}

function footprintsOverlap(anchorA, footprintA, anchorB, footprintB) {
  const aRight = anchorA.c + footprintA;
  const aBottom = anchorA.r + footprintA;
  const bRight = anchorB.c + footprintB;
  const bBottom = anchorB.r + footprintB;
  return !(aRight <= anchorB.c || bRight <= anchorA.c || aBottom <= anchorB.r || bBottom <= anchorA.r);
}

function iterateFootprintCells(anchorCell, footprint, callback) {
  for (let dr = 0; dr < footprint; dr += 1) {
    for (let dc = 0; dc < footprint; dc += 1) {
      callback(anchorCell.c + dc, anchorCell.r + dr);
    }
  }
}

function isCellInBoundsForFootprint(cell, footprint) {
  return cell.c >= 0 && cell.r >= 0 && cell.c <= GRID_COLS - footprint && cell.r <= GRID_ROWS - footprint;
}

function isFootprintBlocked(cell, blockedSet, footprint) {
  if (!isCellInBoundsForFootprint(cell, footprint)) {
    return true;
  }
  let blocked = false;
  iterateFootprintCells(cell, footprint, (c, r) => {
    if (!blocked && blockedSet.has(cellKey(c, r))) {
      blocked = true;
    }
  });
  return blocked;
}

function cellWithinFootprint(cell, anchorCell, footprint) {
  if (!cell || !anchorCell) {
    return false;
  }
  return (
    cell.c >= anchorCell.c &&
    cell.c < anchorCell.c + footprint &&
    cell.r >= anchorCell.r &&
    cell.r < anchorCell.r + footprint
  );
}

function expandPathToFootprintSet(path, footprint) {
  const output = new Set();
  for (const anchor of path) {
    iterateFootprintCells(anchor, footprint, (c, r) => {
      if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
        output.add(cellKey(c, r));
      }
    });
  }
  return output;
}

function getBoardBounds() {
  const left = GRID_ORIGIN_X;
  const top = GRID_ORIGIN_Y - TILE_HEIGHT;
  const right = GRID_ORIGIN_X + (GRID_COLS - 1) * TILE_STEP + TILE_SIZE + TILE_DEPTH;
  const bottom = GRID_ORIGIN_Y + (GRID_ROWS - 1) * TILE_STEP + TILE_SIZE + TILE_DEPTH;
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function hashNoise(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453123;
  return n - Math.floor(n);
}

function generateBackgroundDecor() {
  const bounds = getBoardBounds();
  const items = [];
  const minY = 96;
  const maxY = canvas.height - 106;

  for (let y = minY; y <= maxY; y += 26) {
    for (let x = 20; x <= canvas.width - 20; x += 28) {
      const insideBoard =
        x > bounds.left - 14 && x < bounds.right + 14 && y > bounds.top - 14 && y < bounds.bottom + 12;
      if (insideBoard) {
        continue;
      }

      const dx = x < bounds.left ? bounds.left - x : x > bounds.right ? x - bounds.right : 0;
      const dy = y < bounds.top ? bounds.top - y : y > bounds.bottom ? y - bounds.bottom : 0;
      const dist = Math.hypot(dx, dy);
      const transition = clamp((dist - 6) / 130, 0, 1);
      const n1 = hashNoise(x * 0.071, y * 0.063, 1);
      const n2 = hashNoise(x * 0.082, y * 0.057, 2);
      const n3 = hashNoise(x * 0.055, y * 0.088, 3);

      const treeChance = 0.02 + transition * 0.28;
      const rockChance = 0.015 + transition * 0.11;
      const jitterX = (n2 - 0.5) * 12;
      const jitterY = (n3 - 0.5) * 10;

      if (n1 < treeChance) {
        items.push({
          kind: "tree",
          x: x + jitterX,
          y: y + jitterY,
          scale: 0.68 + transition * 0.95 + n2 * 0.25,
          tone: n3
        });
        continue;
      }

      if (n2 < rockChance) {
        items.push({
          kind: "rock",
          x: x + jitterX,
          y: y + jitterY,
          scale: 0.62 + transition * 0.88 + n3 * 0.2,
          tone: n1
        });
      }
    }
  }

  items.sort((a, b) => a.y - b.y);
  state.backgroundDecor = items;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(source) {
  const output = [...source];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function pickDistinctItems(source, count) {
  return shuffleArray(source).slice(0, count);
}

function getEnemyPoolForWave(waveNumber) {
  if (waveNumber <= 1) {
    return ["raider"];
  }
  if (waveNumber === 2) {
    return ["sprinter"];
  }
  if (waveNumber === 3) {
    return ["raider", "sprinter", "bulwark", "giant"];
  }
  if (waveNumber === 4) {
    return ["raider", "sprinter", "bulwark", "glacial", "giant"];
  }
  return ENEMY_TYPES.map((enemyType) => enemyType.id);
}

function getGiantSpawnIndices(waveNumber, count) {
  if (count <= 0 || waveNumber < 3) {
    return [];
  }

  let indices = [];
  if (waveNumber === 3) {
    indices = [count - 1];
  } else if (waveNumber === 4) {
    indices = [Math.floor(count * 0.5), count - 1];
  } else if (waveNumber >= 5) {
    indices = [Math.floor(count * 0.2), Math.floor(count * 0.45), Math.floor(count * 0.7), count - 1];
  }

  return [...new Set(indices.map((index) => clamp(index, 0, count - 1)))].sort((a, b) => a - b);
}

function buildWaveSpawnPlan(waveNumber, count) {
  const pool = getEnemyPoolForWave(waveNumber);
  const giantIndices = new Set(getGiantSpawnIndices(waveNumber, count));
  const basePool = pool.filter((typeId) => typeId !== "giant");
  const nonGiantCount = Math.max(0, count - giantIndices.size);

  let nonGiantPlan = [];
  if (basePool.length <= 1) {
    nonGiantPlan = Array.from({ length: nonGiantCount }, () => basePool[0] || "raider");
  } else {
    const maxMixSize = Math.min(giantIndices.size > 0 ? 3 : 4, basePool.length);
    const minMixSize = Math.min(2, maxMixSize);
    const mixSize = randomInt(minMixSize, maxMixSize);
    const chosenTypes = pickDistinctItems(basePool, mixSize);
    nonGiantPlan = [...chosenTypes];
    while (nonGiantPlan.length < nonGiantCount) {
      nonGiantPlan.push(chosenTypes[randomInt(0, chosenTypes.length - 1)]);
    }
    nonGiantPlan = shuffleArray(nonGiantPlan).slice(0, nonGiantCount);
  }

  const plan = Array.from({ length: count }, () => basePool[0] || "raider");
  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    if (giantIndices.has(i)) {
      plan[i] = "giant";
      continue;
    }
    plan[i] = nonGiantPlan[cursor] || basePool[0] || "raider";
    cursor += 1;
  }

  return plan;
}

function uniqueConsecutiveCells(path) {
  const output = [];
  for (const cell of path) {
    const prev = output[output.length - 1];
    if (!prev || prev.c !== cell.c || prev.r !== cell.r) {
      output.push(cell);
    }
  }
  return output;
}

function clampToAnchorRow(row) {
  return clamp(row, 1, Math.max(1, ANCHOR_ROWS - 2));
}

function buildPathFromWaypoints(waypoints) {
  const path = [waypoints[0]];
  let current = { ...waypoints[0] };

  for (let i = 1; i < waypoints.length; i += 1) {
    const target = waypoints[i];
    while (current.c !== target.c || current.r !== target.r) {
      const dc = target.c - current.c;
      const dr = target.r - current.r;
      const stepHorizontal = dc > 0 && (Math.abs(dr) === 0 || Math.random() < 0.66);
      if (stepHorizontal) {
        current.c += 1;
      } else if (dr !== 0) {
        current.r += Math.sign(dr);
      } else {
        current.c += Math.sign(dc);
      }
      path.push({ c: current.c, r: current.r });

      const residualRowDelta = target.r - current.r;
      if (current.c < target.c && residualRowDelta !== 0 && Math.random() < 0.11) {
        current.r = clampToAnchorRow(current.r + Math.sign(residualRowDelta));
        path.push({ c: current.c, r: current.r });
      }
    }
  }

  return uniqueConsecutiveCells(path);
}

function countPathTurns(path) {
  if (!path || path.length < 3) {
    return 0;
  }
  let turns = 0;
  let prevDir = null;
  for (let i = 1; i < path.length; i += 1) {
    const step = {
      dc: clamp(path[i].c - path[i - 1].c, -1, 1),
      dr: clamp(path[i].r - path[i - 1].r, -1, 1)
    };
    if (!prevDir) {
      prevDir = step;
      continue;
    }
    if (step.dc !== prevDir.dc || step.dr !== prevDir.dr) {
      turns += 1;
      prevDir = step;
    }
  }
  return turns;
}

function scoreRandomPath(path) {
  const rows = path.map((cell) => cell.r);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const uniqueRows = new Set(rows).size;
  const turnCount = countPathTurns(path);
  const rowSpan = maxRow - minRow;
  const rowSpanScore = clamp(rowSpan / Math.max(1, RANDOM_PATH_ROW_SPAN_MIN), 0, 1);
  const uniqueRowScore = clamp(uniqueRows / Math.max(1, RANDOM_PATH_UNIQUE_ROWS_MIN), 0, 1);
  const turnScore =
    turnCount < RANDOM_PATH_TURN_MIN
      ? turnCount / RANDOM_PATH_TURN_MIN
      : turnCount > RANDOM_PATH_TURN_MAX
        ? RANDOM_PATH_TURN_MAX / turnCount
        : 1;

  return {
    rowSpan,
    uniqueRows,
    turnCount,
    qualityPassed:
      rowSpan >= RANDOM_PATH_ROW_SPAN_MIN &&
      uniqueRows >= RANDOM_PATH_UNIQUE_ROWS_MIN &&
      turnCount >= RANDOM_PATH_TURN_MIN &&
      turnCount <= RANDOM_PATH_TURN_MAX,
    score: rowSpanScore * 4 + uniqueRowScore * 3 + turnScore * 3
  };
}

function generateWaypointRows() {
  const minRow = 1;
  const maxRow = Math.max(minRow, ANCHOR_ROWS - 2);
  const center = Math.floor((minRow + maxRow) * 0.5);
  const maxOffset = Math.max(4, Math.floor((maxRow - minRow) * 0.42));
  const startDirection = Math.random() < 0.5 ? -1 : 1;
  const rows = [];
  let previous = clampToAnchorRow(center + startDirection * randomInt(2, maxOffset - 1));
  rows.push(previous);

  for (let i = 1; i <= 3; i += 1) {
    const direction = i % 2 === 0 ? startDirection : -startDirection;
    const offset = randomInt(3, maxOffset);
    const jitter = randomInt(-1, 1);
    let candidate = clampToAnchorRow(center + direction * offset + jitter);
    if (Math.abs(candidate - previous) < 3) {
      candidate = clampToAnchorRow(previous + Math.sign(candidate - previous || direction) * 3);
    }
    rows.push(candidate);
    previous = candidate;
  }

  const endDirection = startDirection * -1;
  let endRow = clampToAnchorRow(center + endDirection * randomInt(2, Math.max(2, maxOffset - 1)));
  if (Math.abs(endRow - previous) < 2) {
    endRow = clampToAnchorRow(previous + Math.sign(endRow - previous || endDirection) * 2);
  }
  rows.push(endRow);
  return rows;
}

function generateRandomRoadPath() {
  const waypointCols = [
    0,
    Math.round((ANCHOR_COLS - 1) * 0.22),
    Math.round((ANCHOR_COLS - 1) * 0.46),
    Math.round((ANCHOR_COLS - 1) * 0.72),
    ANCHOR_COLS - 1
  ];

  let bestPath = null;
  let bestMeta = null;

  for (let attempt = 0; attempt < RANDOM_PATH_MAX_ATTEMPTS; attempt += 1) {
    const rows = generateWaypointRows();
    const waypoints = waypointCols.map((c, idx) => ({ c, r: rows[idx] }));
    const path = buildPathFromWaypoints(waypoints);
    const metrics = scoreRandomPath(path);

    if (!bestMeta || metrics.score > bestMeta.score) {
      bestPath = path;
      bestMeta = metrics;
    }
    if (metrics.qualityPassed) {
      return path;
    }
  }

  if (bestPath) {
    return bestPath;
  }
  const fallbackRow = Math.floor(ANCHOR_ROWS * 0.5);
  const fallback = [];
  for (let c = 0; c < ANCHOR_COLS; c += 1) {
    fallback.push({ c, r: fallbackRow });
  }
  return fallback;
}

function buildMap(mode) {
  if (mode === "random") {
    const roadPath = generateRandomRoadPath();
    const spawnCell = roadPath[0];
    const goalCell = roadPath[roadPath.length - 1];
    return {
      mode,
      roadPath,
      roadSet: expandPathToFootprintSet(roadPath, LARGE_ENEMY_FOOTPRINT),
      roadWorld: roadPath.map((cell) => gridToFootprintCenter(cell.c, cell.r, LARGE_ENEMY_FOOTPRINT)),
      spawnCell,
      goalCell,
      spawnWorld: gridToFootprintCenter(spawnCell.c, spawnCell.r, LARGE_ENEMY_FOOTPRINT),
      goalWorld: gridToFootprintCenter(goalCell.c, goalCell.r, LARGE_ENEMY_FOOTPRINT)
    };
  }

  const spawnCell = { ...EMPTY_MAP_SPAWN };
  const goalCell = { ...EMPTY_MAP_GOAL };
  return {
    mode: "empty",
    roadPath: [],
    roadSet: new Set(),
    roadWorld: [],
    spawnCell,
    goalCell,
    spawnWorld: gridToFootprintCenter(spawnCell.c, spawnCell.r, LARGE_ENEMY_FOOTPRINT),
    goalWorld: gridToFootprintCenter(goalCell.c, goalCell.r, LARGE_ENEMY_FOOTPRINT)
  };
}

function getMapModeDescription(mode) {
  if (mode === "random") {
    return "Random map mode: each run generates a wide fixed road built for small and large enemies.";
  }
  return "Empty map mode: enemies route around towers, but your maze must keep a large-unit lane open.";
}

function refreshMapModeUI() {
  for (const button of mapOptionButtons) {
    const active = button.dataset.mapMode === state.selectedMapMode;
    button.classList.toggle("active", active);
  }

  if (mapModeCopy) {
    mapModeCopy.textContent = getMapModeDescription(state.selectedMapMode);
  }
}

function setSelectedMapMode(mode, regenerateMap = true) {
  if (!MAP_MODES.includes(mode)) {
    return;
  }

  state.selectedMapMode = mode;
  refreshMapModeUI();
  if (regenerateMap || !state.map || state.map.mode !== mode) {
    state.map = buildMap(mode);
    generateBackgroundDecor();
  }
  state.lanePathCache.dirty = true;
  state.lanePathCache.refreshTimer = 0;
}

function setSelectedBuildTower(towerId, armPlacement = true) {
  const type = TOWER_TYPE_BY_ID[towerId];
  if (!type) {
    return;
  }
  state.selectedTowerId = towerId;
  state.selectedPlacedTowerId = null;
  state.confirmAction = null;
  if (type.supportsRotation && !Number.isFinite(state.placementRotation[towerId])) {
    const map = state.map;
    if (map) {
      const boardCenter = gridToFootprintCenter(
        Math.floor((GRID_COLS - (type.footprint || 1)) * 0.5),
        Math.floor((GRID_ROWS - (type.footprint || 1)) * 0.5),
        type.footprint || 1
      );
      state.placementRotation[towerId] = getCardinalRotationTowardPoint(
        boardCenter.x,
        boardCenter.y,
        map.spawnWorld.x,
        map.spawnWorld.y
      );
    } else {
      state.placementRotation[towerId] = 0;
    }
  }
  if (armPlacement) {
    state.buildPlacementArmed = true;
  }
}

function disarmBuildPlacement() {
  state.buildPlacementArmed = false;
}

function markLanePathDirty() {
  state.lanePathCache.dirty = true;
  state.lanePathCache.refreshTimer = 0;
}

function refreshLanePathCache(force = false) {
  const map = state.map;
  if (!map || map.mode !== "empty") {
    state.lanePathCache.cells = [];
    state.lanePathCache.dirty = false;
    state.lanePathCache.refreshTimer = 0;
    return;
  }

  if (!force && !state.lanePathCache.dirty && state.lanePathCache.refreshTimer > 0) {
    return;
  }

  const blocked = getTowerBlockedSet();
  const path = findPathWithFootprint(map.spawnCell, map.goalCell, blocked, LARGE_ENEMY_FOOTPRINT);
  state.lanePathCache.cells = path || [];
  state.lanePathCache.dirty = false;
  state.lanePathCache.refreshTimer = 0.28;
}

function getLanePathCells() {
  const map = state.map;
  if (!map) {
    return [];
  }
  if (map.mode === "random") {
    return map.roadPath || [];
  }
  refreshLanePathCache();
  return state.lanePathCache.cells || [];
}

function isOverlayBlockingPlacement() {
  return Boolean(state.confirmAction || state.selectedPlacedTowerId || state.settingsOpen || state.encyclopediaOpen);
}

function isGridVisibleNow() {
  if (state.settings.showGridAlways) {
    return true;
  }
  if (!state.buildPlacementArmed || isOverlayBlockingPlacement()) {
    return false;
  }
  return Boolean(state.hoveredCell);
}

function getPlacementRotationForTower(typeId) {
  if (!Number.isFinite(state.placementRotation[typeId])) {
    state.placementRotation[typeId] = 0;
  }
  return state.placementRotation[typeId];
}

function rotatePlacementForSelected(delta) {
  const selected = getSelectedTowerType();
  if (!selected || !selected.supportsRotation) {
    return;
  }
  const current = getPlacementRotationForTower(selected.id);
  const next = (current + delta + 4) % 4;
  state.placementRotation[selected.id] = next;
}

function getTowerBlockedSet(extraCells = null) {
  const blocked = new Set();
  for (const tower of state.towers) {
    forEachTowerFootprintCell(tower, (c, r) => {
      blocked.add(cellKey(c, r));
    });
  }
  if (Array.isArray(extraCells)) {
    for (const cell of extraCells) {
      blocked.add(cellKey(cell.c, cell.r));
    }
  } else if (extraCells) {
    blocked.add(cellKey(extraCells.c, extraCells.r));
  }
  return blocked;
}

function findPathWithFootprint(startCell, goalCell, blockedSet, footprint = SMALL_ENEMY_FOOTPRINT) {
  if (!startCell || !goalCell) {
    return null;
  }

  const startKey = cellKey(startCell.c, startCell.r);
  const goalKey = cellKey(goalCell.c, goalCell.r);
  if (isFootprintBlocked(startCell, blockedSet, footprint) || isFootprintBlocked(goalCell, blockedSet, footprint)) {
    return null;
  }

  const queue = [startCell];
  const visited = new Set([startKey]);
  const prev = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = cellKey(current.c, current.r);
    if (currentKey === goalKey) {
      const reversed = [current];
      let walkKey = currentKey;
      while (prev.has(walkKey)) {
        const parent = prev.get(walkKey);
        reversed.push(parent);
        walkKey = cellKey(parent.c, parent.r);
      }
      return reversed.reverse();
    }

    const neighbors = [
      { c: current.c + 1, r: current.r },
      { c: current.c - 1, r: current.r },
      { c: current.c, r: current.r + 1 },
      { c: current.c, r: current.r - 1 }
    ];
    for (const neighbor of neighbors) {
      if (!isCellInBoundsForFootprint(neighbor, footprint)) {
        continue;
      }

      const neighborKey = cellKey(neighbor.c, neighbor.r);
      if (visited.has(neighborKey) || isFootprintBlocked(neighbor, blockedSet, footprint)) {
        continue;
      }

      visited.add(neighborKey);
      prev.set(neighborKey, current);
      queue.push(neighbor);
    }
  }

  return null;
}

function findPath(startCell, goalCell, blockedSet) {
  return findPathWithFootprint(startCell, goalCell, blockedSet, SMALL_ENEMY_FOOTPRINT);
}

function getSelectedTowerType() {
  return TOWER_TYPE_BY_ID[state.selectedTowerId] || TOWER_TYPES[0];
}

function getTowerTierData(type, tier) {
  if (!type || !type.upgradeTiers || type.upgradeTiers.length === 0) {
    return null;
  }
  const safeTier = Number.isFinite(tier) ? tier : 0;
  const tierIndex = clamp(safeTier, 0, type.upgradeTiers.length - 1);
  return type.upgradeTiers[tierIndex];
}

function getTowerById(towerId) {
  return state.towers.find((tower) => tower.id === towerId) || null;
}

function getEnemyById(enemyId) {
  return state.enemies.find((enemy) => enemy.id === enemyId) || null;
}

function getDefenderById(defenderId) {
  return state.defenders.find((defender) => defender.id === defenderId) || null;
}

function getSelectedPlacedTower() {
  return getTowerById(state.selectedPlacedTowerId);
}

function clearTowerSelection() {
  state.selectedPlacedTowerId = null;
  state.confirmAction = null;
}

function applyTierToTower(tower, tier) {
  const type = TOWER_TYPE_BY_ID[tower.typeId];
  const tierData = getTowerTierData(type, tier);
  if (!type || !tierData) {
    return;
  }

  tower.tier = tier;
  tower.range = tierData.range;
  tower.fireRate = tierData.fireRate;
  tower.damage = tierData.damage;
  tower.projectileSpeed = tierData.projectileSpeed || 0;
  tower.projectileKind = tierData.projectileKind;
  tower.aoeRadius = tierData.aoeRadius || 0;
  tower.slowFactor = tierData.slowFactor || 1;
  tower.slowDuration = tierData.slowDuration || 0;
  tower.chainJumps = tierData.chainJumps || 0;
  tower.chainRange = tierData.chainRange || 0;
  tower.turnSpeed = tierData.turnSpeed || 5;
  tower.muzzleLength = tierData.muzzleLength || 18;
  tower.pierceCount = tierData.pierceCount || 0;
  tower.frostBurstRadius = tierData.frostBurstRadius || 0;
  tower.clusterCount = tierData.clusterCount || 0;
  tower.clusterDamage = tierData.clusterDamage || 0;
  tower.clusterRadius = tierData.clusterRadius || 0;
  tower.shockDps = tierData.shockDps || 0;
  tower.shockDuration = tierData.shockDuration || 0;
  tower.freezeDuration = tierData.freezeDuration || 0;
  tower.slimePatchSlowFactor = tierData.slimePatchSlowFactor || 1;
  tower.slimeTrailDuration = tierData.slimeTrailDuration || 0;
  tower.slimeSpread = tierData.slimeSpread || 0;
  tower.beamLengthTiles = tierData.beamLengthTiles || 0;
  tower.beamDuration = tierData.beamDuration || 0;
  tower.beamCooldown = tierData.beamCooldown || 0;
  tower.beamDps = tierData.beamDps || 0;
  tower.beamWidth = tierData.beamWidth || 0;
  tower.defenderCount = tierData.defenderCount || 0;
  tower.defenderHp = tierData.defenderHp || 0;
  tower.defenderDamage = tierData.defenderDamage || 0;
  tower.defenderAttackInterval = tierData.defenderAttackInterval || 0;
  tower.defenderRespawn = tierData.defenderRespawn || 0;
  tower.defenderMoveSpeed = tierData.defenderMoveSpeed || 0;
  tower.defenderLeashTiles = tierData.defenderLeashTiles || 0;
  tower.guardianHp = tierData.guardianHp || 0;
  tower.guardianDamage = tierData.guardianDamage || 0;
  tower.guardianAttackInterval = tierData.guardianAttackInterval || 0;
  tower.guardianRespawn = tierData.guardianRespawn || 0;
  tower.guardianMoveSpeed = tierData.guardianMoveSpeed || 0;
  tower.guardianStunDuration = tierData.guardianStunDuration || 0;
  tower.guardianStunRadiusTiles = tierData.guardianStunRadiusTiles || 0;
  tower.footprint = type.footprint || 1;
  tower.tierVisualStage = clamp(tier, 0, 2);

  syncDefenderStatsForTower(tower);
}

function getTowerUpgradeInfo(tower, targetTier) {
  const type = TOWER_TYPE_BY_ID[tower.typeId];
  const tierData = getTowerTierData(type, targetTier);
  if (!type || !tierData || targetTier <= 0 || targetTier >= type.upgradeTiers.length) {
    return null;
  }

  const unlocked = tower.tier >= targetTier;
  const sequential = tower.tier + 1 === targetTier;
  const affordable = state.credits >= tierData.upgradeCost;
  return {
    targetTier,
    label: tierData.label,
    cost: tierData.upgradeCost,
    unlocked,
    sequential,
    affordable,
    enabled: sequential && affordable
  };
}

function getDestroyRefund(tower) {
  return Math.round(tower.investedCredits * 0.5);
}

function signedPercent(multiplier) {
  const delta = Math.round((multiplier - 1) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}%`;
}

function describeSlowResist(enemyType) {
  const strengthDelta = Math.round((1 - enemyType.slowResist) * 100);
  const durationDelta = Math.round((1 - enemyType.slowDurationMult) * 100);
  return `Slow resist: ${strengthDelta}% less slow, ${durationDelta}% shorter duration`;
}

function describeTowerTierStats(tier) {
  const fragments = [`range ${tier.range}`, `fire ${tier.fireRate.toFixed(2)}s`];
  if (tier.projectileKind === "barracks_spawn") {
    fragments.length = 0;
    fragments.push(
      `${tier.defenderCount} militia`,
      `HP ${tier.defenderHp}`,
      `dmg ${tier.defenderDamage}`,
      `atk ${tier.defenderAttackInterval.toFixed(2)}s`
    );
    return fragments.join(" | ");
  }
  if (tier.projectileKind === "guardian_spawn") {
    fragments.length = 0;
    fragments.push(
      "1 guardian",
      `HP ${tier.guardianHp}`,
      `dmg ${tier.guardianDamage}`,
      `atk ${tier.guardianAttackInterval.toFixed(2)}s`
    );
    return fragments.join(" | ");
  }
  if (tier.projectileKind === "flame_beam") {
    fragments.length = 0;
    fragments.push(
      `range ${tier.range}`,
      `beam ${tier.beamLengthTiles} tiles`,
      `${tier.beamDuration.toFixed(1)}s on / ${tier.beamCooldown.toFixed(1)}s cd`,
      `${tier.beamDps} DPS`
    );
    return fragments.join(" | ");
  }
  if (tier.projectileKind === "chain") {
    fragments.push(`chain dmg ${tier.damage}`);
    fragments.push(`jumps ${tier.chainJumps}`);
  } else {
    fragments.push(`dmg ${tier.damage}`);
  }
  if (tier.projectileKind === "frost") {
    fragments.push(`freeze ${tier.freezeDuration.toFixed(1)}s`);
  }
  if (tier.projectileKind === "slime") {
    fragments.push(`slow ${Math.round((1 - tier.slowFactor) * 100)}%`);
    fragments.push(`trail ${tier.slimeTrailDuration.toFixed(1)}s`);
  }
  if (tier.aoeRadius > 0) {
    fragments.push(`aoe ${tier.aoeRadius}`);
  }
  if (tier.slowFactor && tier.slowFactor < 1 && tier.projectileKind !== "slime") {
    fragments.push(`slow ${Math.round((1 - tier.slowFactor) * 100)}%`);
  }
  return fragments.join(" | ");
}

function towerSpecialLine(towerType, tier, tierIndex) {
  if (towerType.id === "cannon") {
    if (tierIndex === 2) {
      return "Special: Piercing round can pass through 1 enemy.";
    }
    return "Special: Reliable single-target pressure.";
  }
  if (towerType.id === "frost") {
    if (tierIndex === 2) {
      return `Special: Freeze + shatter burst radius ${tier.frostBurstRadius}.`;
    }
    return "Special: Freezes enemies in place.";
  }
  if (towerType.id === "mortar") {
    if (tierIndex === 2) {
      return `Special: Cluster blasts (${tier.clusterCount}) around impact.`;
    }
    return "Special: Area damage against groups.";
  }
  if (towerType.id === "tesla") {
    if (tierIndex === 2) {
      return `Special: Shock DoT ${tier.shockDps}/s for ${tier.shockDuration.toFixed(1)}s.`;
    }
    return "Special: Chain lightning jumps between enemies.";
  }
  if (towerType.id === "slime") {
    return "Special: Slime coats path tiles and reapplies slow.";
  }
  if (towerType.id === "flame") {
    return `Special: 4-tile flame beam, ${tier.beamDuration.toFixed(1)}s burst.`;
  }
  if (towerType.id === "barracks") {
    return `Special: Deploys ${tier.defenderCount} militia that fight in melee.`;
  }
  if (towerType.id === "defender") {
    return `Special: Giant guardian stuns nearby enemies for ${tier.guardianStunDuration.toFixed(1)}s on hit.`;
  }
  return "";
}

function getTowerEncyclopediaEntries() {
  return TOWER_TYPES.map((towerType) => {
    const tiers = towerType.upgradeTiers || [];
    const lines = [`Build cost: $${towerType.cost}`];
    for (let i = 0; i < tiers.length; i += 1) {
      const tier = tiers[i];
      const costLabel = i === 0 ? "Built" : `Upgrade $${tier.upgradeCost}`;
      lines.push(`${tier.label}: ${describeTowerTierStats(tier)} (${costLabel})`);
      const special = towerSpecialLine(towerType, tier, i);
      if (special) {
        lines.push(special);
      }
    }
    return {
      title: towerType.name,
      subtitle: `Role: ${towerType.short}`,
      lines
    };
  });
}

function getEnemyResistanceLines(enemyType) {
  const resistanceLines = [];
  const channelNames = {
    kinetic: "Kinetic",
    frost: "Frost",
    explosive: "Explosive",
    electric: "Electric"
  };

  for (const [channel, label] of Object.entries(channelNames)) {
    const mult = enemyType.damageMult[channel];
    if (!Number.isFinite(mult) || Math.abs(mult - 1) < 0.01) {
      continue;
    }
    const direction = mult < 1 ? "resist" : "vulnerable";
    resistanceLines.push(`${label}: ${direction} (${signedPercent(mult)})`);
  }
  return resistanceLines;
}

function getEnemyAbilityLines(enemyType) {
  const lines = [];
  if (enemyType.armorFlat > 0) {
    lines.push(`Armor: -${enemyType.armorFlat.toFixed(1)} non-explosive damage per hit`);
  }
  if (enemyType.regenPerSec > 0) {
    lines.push(`Regeneration: +${enemyType.regenPerSec.toFixed(1)} HP/sec`);
  }
  if (enemyType.shieldMax > 0) {
    lines.push(
      `Shield: ${enemyType.shieldMax.toFixed(0)} max, regen ${enemyType.shieldRegenPerSec.toFixed(1)}/sec`
    );
  }
  if (enemyType.burstInterval > 0 && enemyType.burstMultiplier > 1) {
    lines.push(
      `Burst move: ${Math.round((enemyType.burstMultiplier - 1) * 100)}% speed for ${enemyType.burstDuration.toFixed(1)}s`
    );
  }
  return lines;
}

function getEnemyEncyclopediaEntries() {
  return ENEMY_TYPES.map((enemyType) => {
    const footprint = enemyType.footprint || SMALL_ENEMY_FOOTPRINT;
    const sizeLabel = footprint > 1 ? `Large (${footprint}x${footprint})` : "Small (1x1)";
    const lines = [
      `Base stats: HP x${enemyType.hpScale.toFixed(2)}, Speed x${enemyType.speedScale.toFixed(2)}, Reward x${enemyType.rewardScale.toFixed(2)}`,
      `Size class: ${sizeLabel}`,
      describeSlowResist(enemyType),
      ...getEnemyResistanceLines(enemyType),
      ...getEnemyAbilityLines(enemyType)
    ];
    return {
      title: enemyType.name,
      subtitle: `Code: ${enemyType.short}`,
      lines
    };
  });
}

function refreshEncyclopediaTabsUI() {
  for (const tabButton of encyclopediaTabs) {
    tabButton.classList.toggle("active", tabButton.dataset.encyclopediaTab === state.encyclopediaTab);
  }
}

function buildEncyclopediaCard(entry) {
  const card = document.createElement("article");
  card.className = "encyclopedia-card";

  const heading = document.createElement("h3");
  heading.textContent = entry.title;
  card.appendChild(heading);

  const subtitle = document.createElement("div");
  subtitle.className = "encyclopedia-subtitle";
  subtitle.textContent = entry.subtitle;
  card.appendChild(subtitle);

  const linesWrap = document.createElement("div");
  linesWrap.className = "encyclopedia-lines";
  for (const line of entry.lines) {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    linesWrap.appendChild(paragraph);
  }
  card.appendChild(linesWrap);
  return card;
}

function renderEncyclopedia() {
  if (!encyclopediaList || !encyclopediaTitle) {
    return;
  }

  refreshEncyclopediaTabsUI();
  const entries = state.encyclopediaTab === "enemies" ? getEnemyEncyclopediaEntries() : getTowerEncyclopediaEntries();
  encyclopediaTitle.textContent = state.encyclopediaTab === "enemies" ? "Enemy Encyclopedia" : "Tower Encyclopedia";
  encyclopediaList.innerHTML = "";
  for (const entry of entries) {
    encyclopediaList.appendChild(buildEncyclopediaCard(entry));
  }
}

function setEncyclopediaTab(tab) {
  if (tab !== "towers" && tab !== "enemies") {
    return;
  }
  state.encyclopediaTab = tab;
  if (state.encyclopediaOpen) {
    renderEncyclopedia();
  }
}

function openEncyclopedia() {
  if (state.encyclopediaOpen) {
    return;
  }
  state.encyclopediaOpen = true;
  state.encyclopediaPauseRestore = null;
  if (state.mode === "playing") {
    state.encyclopediaPauseRestore = state.paused;
    state.paused = true;
  }
  renderEncyclopedia();
  showOverlay(encyclopediaOverlay);
}

function closeEncyclopedia(forceClose = false) {
  if (!state.encyclopediaOpen) {
    hideOverlay(encyclopediaOverlay);
    return;
  }
  hideOverlay(encyclopediaOverlay);
  if (!forceClose && state.mode === "playing" && state.encyclopediaPauseRestore !== null) {
    state.paused = state.encyclopediaPauseRestore;
  }
  state.encyclopediaOpen = false;
  state.encyclopediaPauseRestore = null;
}

function toggleEncyclopedia() {
  if (state.encyclopediaOpen) {
    closeEncyclopedia();
    return;
  }
  openEncyclopedia();
}

function getTowerButtons() {
  const count = TOWER_TYPES.length;
  const cardHeight = 64;
  const gap = 8;
  const trayWidth = canvas.width - 44 - 20;
  const cardWidth = Math.max(104, Math.floor((trayWidth - gap * (count - 1)) / count));
  const totalWidth = cardWidth * count + gap * (count - 1);
  const startX = Math.round((canvas.width - totalWidth) * 0.5);
  const y = canvas.height - 78;

  return TOWER_TYPES.map((tower, index) => ({
    id: tower.id,
    x: startX + index * (cardWidth + gap),
    y,
    width: cardWidth,
    height: cardHeight,
    tower
  }));
}

function cycleTowerSelection(direction) {
  const currentIndex = TOWER_IDS.indexOf(state.selectedTowerId);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (startIndex + direction + TOWER_IDS.length) % TOWER_IDS.length;
  state.selectedTowerId = TOWER_IDS[nextIndex];
}

function getTowerButtonHit(x, y) {
  const buttons = getTowerButtons();
  for (const button of buttons) {
    const inside =
      x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height;
    if (inside) {
      return button;
    }
  }
  return null;
}

function resetRun() {
  closeEncyclopedia(true);
  state.mode = "playing";
  state.paused = false;
  state.settingsOpen = false;
  state.map = buildMap(state.selectedMapMode);
  generateBackgroundDecor();
  state.towers = [];
  state.enemies = [];
  state.projectiles = [];
  state.defenders = [];
  state.slimePatches = [];
  state.shotFx = [];
  state.explosionFx = [];
  state.lightningFx = [];
  state.combatStats = {
    shotsByType: {},
    chainHits: 0,
    slowApplications: 0,
    splashHits: 0,
    freezeApplications: 0,
    slimeApplications: 0,
    defenderKills: 0
  };
  state.baseHealth = 24;
  state.credits = 240;
  state.score = 0;
  state.nextWaveNumber = 1;
  state.activeWaves = [];
  state.waveBreakTimer = 0;
  state.waveBreakDuration = 0;
  state.awaitingFirstWaveStart = true;
  state.hoveredCell = null;
  state.lastPlaceAttempt = null;
  state.selectedPlacedTowerId = null;
  state.buildPlacementArmed = false;
  state.confirmAction = null;
  state.encyclopediaOpen = false;
  state.encyclopediaPauseRestore = null;
  state.earlyCallBonusLast = 0;
  state.earlyCallFlash = 0;
  state.hudMessage = "";
  state.hudMessageTimer = 0;
  state.towerSeq = 1;
  state.enemySeq = 1;
  state.defenderSeq = 1;
  state.selectedTowerId = "cannon";
  state.placementRotation = {};
  state.lanePathCache.cells = [];
  state.lanePathCache.dirty = true;
  state.lanePathCache.refreshTimer = 0;
  state.simClock = 0;
  hideOverlay(menuOverlay);
  hideOverlay(endOverlay);
}

function startSettlement() {
  resetRun();
}

function restartSettlement() {
  resetRun();
}

function showOverlay(target) {
  target.classList.remove("hidden");
}

function hideOverlay(target) {
  target.classList.add("hidden");
}

function showHudMessage(text, duration = 1.8) {
  state.hudMessage = text;
  state.hudMessageTimer = duration;
}

function getActiveWaveNumbers() {
  return state.activeWaves.map((wave) => wave.waveNumber).sort((a, b) => a - b);
}

function getWaveLabel() {
  const numbers = getActiveWaveNumbers();
  if (numbers.length >= 2) {
    return `Wave ${numbers[0]}+${numbers[1]} / ${WAVES.length}`;
  }
  if (numbers.length === 1) {
    return `Wave ${numbers[0]} / ${WAVES.length}`;
  }
  return `Wave ${Math.min(state.nextWaveNumber, WAVES.length)} / ${WAVES.length}`;
}

function launchWave(waveNumber, spawnLeadTime = 0.15) {
  const waveConfig = WAVES[waveNumber - 1];
  if (!waveConfig || state.activeWaves.length >= MAX_SIMULTANEOUS_WAVES) {
    return false;
  }

  const spawnPlan = buildWaveSpawnPlan(waveNumber, waveConfig.count);
  state.activeWaves.push({
    waveNumber,
    config: waveConfig,
    pendingSpawns: waveConfig.count,
    spawnTimer: spawnLeadTime,
    spawnPlan,
    spawnIndex: 0,
    mix: [...new Set(spawnPlan)]
  });
  state.activeWaves.sort((a, b) => a.waveNumber - b.waveNumber);
  state.nextWaveNumber = Math.max(state.nextWaveNumber, waveNumber + 1);
  if (waveNumber === 1) {
    state.awaitingFirstWaveStart = false;
  }
  return true;
}

function spawnEnemy(waveState) {
  const map = state.map;
  if (!waveState || !map) {
    return;
  }

  if (map.mode === "empty") {
    const pathFromSpawn = findPathWithFootprint(
      map.spawnCell,
      map.goalCell,
      getTowerBlockedSet(),
      LARGE_ENEMY_FOOTPRINT
    );
    if (!pathFromSpawn) {
      return;
    }
  }

  const typeId = waveState.spawnPlan[waveState.spawnIndex] || "raider";
  waveState.spawnIndex += 1;
  const enemyType = ENEMY_TYPE_BY_ID[typeId] || ENEMY_TYPE_BY_ID.raider;
  const footprint = enemyType.footprint || SMALL_ENEMY_FOOTPRINT;
  const start = gridToFootprintCenter(map.spawnCell.c, map.spawnCell.r, footprint);
  const goal = gridToFootprintCenter(map.goalCell.c, map.goalCell.r, footprint);
  const pathWorld =
    map.mode === "random"
      ? map.roadPath.map((cell) => gridToFootprintCenter(cell.c, cell.r, footprint))
      : null;
  const hp = Math.round(waveState.config.hp * enemyType.hpScale);
  const speed = waveState.config.speed * enemyType.speedScale;
  const reward = Math.max(1, Math.round(waveState.config.reward * enemyType.rewardScale));
  const burstInterval = enemyType.burstInterval || 0;
  const meleeDamage = enemyType.id === "giant" ? 40 : Math.max(8, Math.round(10 + enemyType.hpScale * 5));
  const meleeAttackInterval = enemyType.id === "giant" ? 1.35 : 0.96;

  state.enemies.push({
    id: state.enemySeq++,
    x: start.x,
    y: start.y,
    typeId: enemyType.id,
    typeName: enemyType.name,
    typeShort: enemyType.short,
    hp,
    maxHp: hp,
    speed,
    reward,
    waveNumber: waveState.waveNumber,
    pathMode: map.mode === "empty" ? "dynamic" : "fixed",
    pathWorld,
    pathIndex: 0,
    distanceAlongPath: 0,
    goalX: goal.x,
    goalY: goal.y,
    radius: enemyType.radius,
    footprint,
    slowMultiplier: 1,
    slowTimer: 0,
    freezeTimer: 0,
    stunTimer: 0,
    shockTimer: 0,
    shockDps: 0,
    damageMult: enemyType.damageMult,
    slowResist: enemyType.slowResist,
    slowDurationMult: enemyType.slowDurationMult,
    armorFlat: enemyType.armorFlat,
    regenPerSec: enemyType.regenPerSec,
    shieldMax: enemyType.shieldMax,
    shield: enemyType.shieldMax,
    shieldRegenPerSec: enemyType.shieldRegenPerSec,
    burstInterval,
    burstDuration: enemyType.burstDuration || 0,
    burstMultiplier: enemyType.burstMultiplier || 1,
    burstTimer: 0,
    burstCooldown: burstInterval > 0 ? burstInterval * (0.35 + Math.random() * 0.5) : 0,
    meleeDamage,
    meleeAttackInterval,
    meleeCooldown: meleeAttackInterval * (0.35 + Math.random() * 0.4),
    engagedDefenderId: null,
    palette: enemyType.palette,
    visualId: enemyType.visualId,
    motionProfile: enemyType.motionProfile,
    accentColor: enemyType.accentColor,
    animSeed: Math.random() * Math.PI * 2,
    stridePhase: Math.random() * Math.PI * 2,
    hitFlash: 0,
    motionTilt: 0
  });
}

function enemyOccupiesCell(enemy, cell) {
  if (!enemy || !cell) {
    return false;
  }
  const footprint = enemy.footprint || SMALL_ENEMY_FOOTPRINT;
  const anchor = worldToNearestAnchor(enemy.x, enemy.y, footprint);
  return cellWithinFootprint(cell, anchor, footprint);
}

function getRotationVector(rotation) {
  const normalized = ((rotation % 4) + 4) % 4;
  if (normalized === 0) {
    return { dc: 1, dr: 0, angle: 0 };
  }
  if (normalized === 1) {
    return { dc: 0, dr: 1, angle: Math.PI * 0.5 };
  }
  if (normalized === 2) {
    return { dc: -1, dr: 0, angle: Math.PI };
  }
  return { dc: 0, dr: -1, angle: -Math.PI * 0.5 };
}

function getCardinalRotationTowardPoint(fromX, fromY, targetX, targetY) {
  const angle = Math.atan2(targetY - fromY, targetX - fromX);
  if (angle >= -Math.PI * 0.25 && angle < Math.PI * 0.25) {
    return 0;
  }
  if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) {
    return 1;
  }
  if (angle >= -Math.PI * 0.75 && angle < -Math.PI * 0.25) {
    return 3;
  }
  return 2;
}

function getDefenderGateLaunchAnchor(anchorCell, rotation, footprint = 2) {
  const dir = getRotationVector(rotation);
  return {
    c: anchorCell.c + dir.dc * footprint,
    r: anchorCell.r + dir.dr * footprint
  };
}

function getDefenderGateLaunchCells(anchorCell, rotation, footprint = 2) {
  const launchAnchor = getDefenderGateLaunchAnchor(anchorCell, rotation, footprint);
  return getFootprintCells(launchAnchor, footprint);
}

function cellsOverlapExistingTower(cells) {
  return cells.some((cell) =>
    state.towers.some((tower) => cellWithinFootprint(cell, { c: tower.c, r: tower.r }, getTowerFootprint(tower)))
  );
}

function cellsOverlapEnemies(cells) {
  return cells.some((cell) => state.enemies.some((enemy) => enemyOccupiesCell(enemy, cell)));
}

function isFootprintOnRoad(cells, map) {
  return cells.some((cell) => map.roadSet.has(cellKey(cell.c, cell.r)));
}

function isFootprintOnEndpoints(cells, map) {
  return cells.some(
    (cell) =>
      cellWithinFootprint(cell, map.spawnCell, LARGE_ENEMY_FOOTPRINT) ||
      cellWithinFootprint(cell, map.goalCell, LARGE_ENEMY_FOOTPRINT)
  );
}

function getPlacementValidation(anchorCell, towerType, rotation = 0, options = {}) {
  if (!anchorCell || !towerType || !state.map) {
    return { valid: false, reason: PLACEMENT_REASONS.OUT_OF_BOUNDS_FOOTPRINT };
  }
  const footprint = towerType.footprint || 1;
  if (!isCellInBoundsForFootprint(anchorCell, footprint)) {
    return { valid: false, reason: PLACEMENT_REASONS.OUT_OF_BOUNDS_FOOTPRINT };
  }

  const map = state.map;
  const ignoreEnemyOverlap = Boolean(options.ignoreEnemyOverlap);
  const candidateCells = getFootprintCells(anchorCell, footprint);
  if (map.mode === "random" && isFootprintOnRoad(candidateCells, map)) {
    return { valid: false, reason: PLACEMENT_REASONS.ON_ROAD };
  }
  if (isFootprintOnEndpoints(candidateCells, map)) {
    return { valid: false, reason: PLACEMENT_REASONS.ON_ENDPOINT };
  }
  if (cellsOverlapExistingTower(candidateCells)) {
    return { valid: false, reason: PLACEMENT_REASONS.OVERLAP_TOWER };
  }
  if (!ignoreEnemyOverlap && cellsOverlapEnemies(candidateCells)) {
    return { valid: false, reason: PLACEMENT_REASONS.OVERLAP_ENEMY };
  }

  if (towerType.id === "defender") {
    const normalizedRotation = ((rotation % 4) + 4) % 4;
    const launchCells = getDefenderGateLaunchCells(anchorCell, normalizedRotation, footprint);
    if (launchCells.length === 0 || launchCells.some((cell) => !isCellInBoundsForFootprint(cell, 1))) {
      return { valid: false, reason: PLACEMENT_REASONS.LAUNCH_OUT_OF_BOUNDS };
    }
    if (cellsOverlapExistingTower(launchCells)) {
      return { valid: false, reason: PLACEMENT_REASONS.LAUNCH_OVERLAP_TOWER };
    }
  }

  if (map.mode === "empty") {
    const candidateBlocked = getTowerBlockedSet(candidateCells);
    const path = findPathWithFootprint(map.spawnCell, map.goalCell, candidateBlocked, LARGE_ENEMY_FOOTPRINT);
    if (!path) {
      return { valid: false, reason: PLACEMENT_REASONS.NO_LARGE_PATH };
    }
  }

  return { valid: true, reason: PLACEMENT_REASONS.NONE };
}

function getRotationDistance(fromRotation, toRotation) {
  const delta = Math.abs(((fromRotation % 4) + 4) % 4 - (((toRotation % 4) + 4) % 4));
  return Math.min(delta, 4 - delta);
}

function getAnchorShiftDistance(fromAnchor, toAnchor) {
  if (!fromAnchor || !toAnchor) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(fromAnchor.c - toAnchor.c) + Math.abs(fromAnchor.r - toAnchor.r);
}

function getCandidateAnchorsForPointer(pointerCell, footprint) {
  if (!pointerCell) {
    return [];
  }
  const anchors = [];
  const seen = new Set();
  for (let dr = 0; dr < footprint; dr += 1) {
    for (let dc = 0; dc < footprint; dc += 1) {
      const anchor = { c: pointerCell.c - dc, r: pointerCell.r - dr };
      const key = cellKey(anchor.c, anchor.r);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      anchors.push(anchor);
    }
  }
  return anchors;
}

function comparePlacementCandidates(a, b) {
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  if (a.valid !== b.valid) {
    return a.valid ? -1 : 1;
  }
  if (!a.valid && a.anchorInBounds !== b.anchorInBounds) {
    return a.anchorInBounds ? -1 : 1;
  }
  if (Math.abs(a.distance - b.distance) > 0.01) {
    return a.distance - b.distance;
  }
  if (a.rotationDelta !== b.rotationDelta) {
    return a.rotationDelta - b.rotationDelta;
  }
  if (a.anchorShift !== b.anchorShift) {
    return a.anchorShift - b.anchorShift;
  }
  if (a.anchor.r !== b.anchor.r) {
    return a.anchor.r - b.anchor.r;
  }
  return a.anchor.c - b.anchor.c;
}

function resolvePlacementCandidate(pointerCell, towerType, pointerWorld = null) {
  const fallbackRotation = towerType && towerType.supportsRotation ? getPlacementRotationForTower(towerType.id) : 0;
  if (!pointerCell || !towerType) {
    return {
      anchor: pointerCell ? { c: pointerCell.c, r: pointerCell.r } : null,
      rotation: fallbackRotation,
      valid: false,
      reason: PLACEMENT_REASONS.OUT_OF_BOUNDS_FOOTPRINT
    };
  }

  const footprint = towerType.footprint || 1;
  const selectedRotation = towerType.supportsRotation ? getPlacementRotationForTower(towerType.id) : 0;
  const rotationCandidates = towerType.supportsRotation
    ? [selectedRotation, (selectedRotation + 1) % 4, (selectedRotation + 3) % 4, (selectedRotation + 2) % 4]
    : [selectedRotation];
  const anchorCandidates = getCandidateAnchorsForPointer(pointerCell, footprint);
  const pointerCenter =
    pointerWorld && Number.isFinite(pointerWorld.x) && Number.isFinite(pointerWorld.y)
      ? { x: pointerWorld.x, y: pointerWorld.y }
      : gridToCenter(pointerCell.c, pointerCell.r);

  let best = null;
  for (const anchor of anchorCandidates) {
    const anchorInBounds = isCellInBoundsForFootprint(anchor, footprint);
    const center = gridToFootprintCenter(anchor.c, anchor.r, footprint);
    const distance = Math.hypot(center.x - pointerCenter.x, center.y - pointerCenter.y);
    const anchorShift = getAnchorShiftDistance(anchor, pointerCell);

    for (const rotation of rotationCandidates) {
      const validation = getPlacementValidation(anchor, towerType, rotation);
      const candidate = {
        anchor: { c: anchor.c, r: anchor.r },
        rotation,
        valid: validation.valid,
        reason: validation.reason,
        distance,
        rotationDelta: getRotationDistance(rotation, selectedRotation),
        anchorShift,
        anchorInBounds
      };
      if (comparePlacementCandidates(candidate, best) < 0) {
        best = candidate;
      }
    }
  }

  if (best) {
    return best;
  }
  return {
    anchor: { c: pointerCell.c, r: pointerCell.r },
    rotation: selectedRotation,
    valid: false,
    reason: PLACEMENT_REASONS.OUT_OF_BOUNDS_FOOTPRINT
  };
}

function getPlacementPreviewCandidate() {
  if (!state.buildPlacementArmed || isOverlayBlockingPlacement() || !state.hoveredCell) {
    return null;
  }
  const selectedType = getSelectedTowerType();
  if (!selectedType) {
    return null;
  }
  const pointerWorld = { x: pointer.x, y: pointer.y };
  return resolvePlacementCandidate(state.hoveredCell, selectedType, pointerWorld);
}

function canPlaceTowerAt(anchorCell, towerType, rotation = null) {
  if (!towerType) {
    return false;
  }
  const resolvedRotation = Number.isFinite(rotation)
    ? rotation
    : towerType.supportsRotation
      ? getPlacementRotationForTower(towerType.id)
      : 0;
  return getPlacementValidation(anchorCell, towerType, resolvedRotation).valid;
}

function tryPlaceTower(cell, point = null) {
  if (!cell || state.mode !== "playing" || state.paused || !state.buildPlacementArmed || isOverlayBlockingPlacement()) {
    return;
  }

  const selectedType = getSelectedTowerType();
  if (!selectedType) {
    return;
  }
  const baseTier = getTowerTierData(selectedType, 0);
  if (!baseTier) {
    return;
  }

  const resolved = resolvePlacementCandidate(cell, selectedType, point);
  state.lastPlaceAttempt = {
    clickedCell: { c: cell.c, r: cell.r },
    resolvedAnchor: resolved.anchor ? { c: resolved.anchor.c, r: resolved.anchor.r } : null,
    resolvedRotation: resolved.rotation,
    valid: resolved.valid,
    reason: resolved.reason
  };
  if (!resolved.valid || !resolved.anchor || state.credits < selectedType.cost) {
    return;
  }

  const footprint = selectedType.footprint || 1;
  const placementAnchor = resolved.anchor;
  const center = gridToFootprintCenter(placementAnchor.c, placementAnchor.r, footprint);
  const map = state.map;
  const spawnWorld = map.spawnWorld;
  const defaultAimAngle = Math.atan2(spawnWorld.y - (center.y - 18), spawnWorld.x - center.x);
  const placementRotation = selectedType.supportsRotation
    ? resolved.rotation
    : getCardinalRotationTowardPoint(center.x, center.y, spawnWorld.x, spawnWorld.y);

  state.credits -= selectedType.cost;
  const phaseSeed = (placementAnchor.c * 1.47 + placementAnchor.r * 0.91) % (Math.PI * 2);
  const tower = {
    id: state.towerSeq++,
    typeId: selectedType.id,
    visualId: selectedType.visualId,
    baseProfile: selectedType.baseProfile,
    muzzleProfile: selectedType.muzzleProfile,
    c: placementAnchor.c,
    r: placementAnchor.r,
    footprint,
    rotation: ((placementRotation % 4) + 4) % 4,
    x: center.x,
    y: center.y,
    tier: 0,
    investedCredits: selectedType.cost,
    range: baseTier.range,
    cooldown: 0.1,
    fireRate: baseTier.fireRate,
    damage: baseTier.damage,
    projectileSpeed: baseTier.projectileSpeed || 0,
    projectileKind: baseTier.projectileKind,
    aoeRadius: baseTier.aoeRadius || 0,
    slowFactor: baseTier.slowFactor || 1,
    slowDuration: baseTier.slowDuration || 0,
    chainJumps: baseTier.chainJumps || 0,
    chainRange: baseTier.chainRange || 0,
    pierceCount: baseTier.pierceCount || 0,
    frostBurstRadius: baseTier.frostBurstRadius || 0,
    clusterCount: baseTier.clusterCount || 0,
    clusterDamage: baseTier.clusterDamage || 0,
    clusterRadius: baseTier.clusterRadius || 0,
    shockDps: baseTier.shockDps || 0,
    shockDuration: baseTier.shockDuration || 0,
    defaultAimAngle,
    aimAngle: defaultAimAngle,
    turnSpeed: baseTier.turnSpeed || 5,
    muzzleLength: baseTier.muzzleLength || 18,
    freezeDuration: baseTier.freezeDuration || 0,
    slimePatchSlowFactor: baseTier.slimePatchSlowFactor || 1,
    slimeTrailDuration: baseTier.slimeTrailDuration || 0,
    slimeSpread: baseTier.slimeSpread || 0,
    beamLengthTiles: baseTier.beamLengthTiles || 0,
    beamDuration: baseTier.beamDuration || 0,
    beamCooldown: baseTier.beamCooldown || 0,
    beamDps: baseTier.beamDps || 0,
    beamWidth: baseTier.beamWidth || 0,
    beamTimer: 0,
    beamEndX: center.x,
    beamEndY: center.y,
    defenderCount: baseTier.defenderCount || 0,
    defenderHp: baseTier.defenderHp || 0,
    defenderDamage: baseTier.defenderDamage || 0,
    defenderAttackInterval: baseTier.defenderAttackInterval || 0,
    defenderRespawn: baseTier.defenderRespawn || 0,
    defenderMoveSpeed: baseTier.defenderMoveSpeed || 0,
    defenderLeashTiles: baseTier.defenderLeashTiles || 0,
    guardianHp: baseTier.guardianHp || 0,
    guardianDamage: baseTier.guardianDamage || 0,
    guardianAttackInterval: baseTier.guardianAttackInterval || 0,
    guardianRespawn: baseTier.guardianRespawn || 0,
    guardianMoveSpeed: baseTier.guardianMoveSpeed || 0,
    guardianStunDuration: baseTier.guardianStunDuration || 0,
    guardianStunRadiusTiles: baseTier.guardianStunRadiusTiles || 0,
    recoil: 0,
    energyPulse: 0,
    barrelHeat: 0,
    animPhase: phaseSeed,
    tierVisualStage: 0,
    targetId: null
  };
  applyTierToTower(tower, 0);
  state.towers.push(tower);
  if (selectedType.supportsRotation) {
    state.placementRotation[selectedType.id] = tower.rotation;
  }
  markLanePathDirty();
}

function getTowerAtCell(cell) {
  if (!cell) {
    return null;
  }
  return (
    state.towers.find((tower) => cellWithinFootprint(cell, { c: tower.c, r: tower.r }, getTowerFootprint(tower))) || null
  );
}

function selectPlacedTower(tower) {
  if (!tower) {
    clearTowerSelection();
    return;
  }
  disarmBuildPlacement();
  state.selectedPlacedTowerId = tower.id;
  state.confirmAction = null;
}

function requestTowerUpgrade(towerId, targetTier) {
  const tower = getTowerById(towerId);
  if (!tower) {
    clearTowerSelection();
    return false;
  }
  const upgrade = getTowerUpgradeInfo(tower, targetTier);
  if (!upgrade || !upgrade.enabled) {
    return false;
  }

  state.confirmAction = {
    type: "upgrade",
    towerId,
    targetTier,
    cost: upgrade.cost
  };
  return true;
}

function requestTowerDestroy(towerId) {
  const tower = getTowerById(towerId);
  if (!tower) {
    clearTowerSelection();
    return false;
  }

  state.confirmAction = {
    type: "destroy",
    towerId,
    refund: getDestroyRefund(tower)
  };
  return true;
}

function applyTowerUpgrade(towerId, targetTier) {
  const tower = getTowerById(towerId);
  if (!tower) {
    return false;
  }

  const upgrade = getTowerUpgradeInfo(tower, targetTier);
  if (!upgrade || !upgrade.enabled) {
    return false;
  }

  state.credits -= upgrade.cost;
  tower.investedCredits += upgrade.cost;
  applyTierToTower(tower, targetTier);
  tower.energyPulse = 1;
  showHudMessage(`${TOWER_TYPE_BY_ID[tower.typeId].name} upgraded to ${upgrade.label}`, 1.7);
  return true;
}

function destroyTower(towerId) {
  const tower = getTowerById(towerId);
  if (!tower) {
    return false;
  }

  const refund = getDestroyRefund(tower);
  state.credits += refund;
  state.towers = state.towers.filter((candidate) => candidate.id !== towerId);
  state.projectiles = state.projectiles.filter((projectile) => projectile.sourceTowerId !== towerId);
  state.defenders = state.defenders.filter((defender) => defender.towerId !== towerId);
  clearTowerSelection();
  markLanePathDirty();
  showHudMessage(`Tower salvaged: +$${refund}`, 1.8);
  return true;
}

function confirmAction() {
  const action = state.confirmAction;
  if (!action) {
    return false;
  }

  let applied = false;
  if (action.type === "upgrade") {
    applied = applyTowerUpgrade(action.towerId, action.targetTier);
  } else if (action.type === "destroy") {
    applied = destroyTower(action.towerId);
  }

  state.confirmAction = null;
  return applied;
}

function getWavePendingEnemyCount(waveNumber) {
  return state.enemies.filter((enemy) => enemy.waveNumber === waveNumber && enemy.hp > 0).length;
}

function computeEarlyCallInfo() {
  if (state.mode !== "playing" || state.paused) {
    return null;
  }
  if (state.awaitingFirstWaveStart) {
    return null;
  }
  if (state.nextWaveNumber > WAVES.length || state.activeWaves.length >= MAX_SIMULTANEOUS_WAVES) {
    return null;
  }

  const nextWaveConfig = WAVES[state.nextWaveNumber - 1];
  let earlyFraction = 0;
  let source = "break";

  if (state.activeWaves.length === 0) {
    earlyFraction = state.waveBreakDuration > 0 ? state.waveBreakTimer / state.waveBreakDuration : 0;
  } else {
    source = "active";
    const oldestWave = [...state.activeWaves].sort((a, b) => a.waveNumber - b.waveNumber)[0];
    const alive = getWavePendingEnemyCount(oldestWave.waveNumber);
    const remaining = oldestWave.pendingSpawns + alive;
    earlyFraction = oldestWave.config.count > 0 ? remaining / oldestWave.config.count : 0;
  }

  earlyFraction = clamp(earlyFraction, 0, 1);
  if (earlyFraction <= 0.01) {
    return null;
  }

  const baseRewardPool = nextWaveConfig.count * nextWaveConfig.reward;
  const bonus = Math.max(1, Math.round(baseRewardPool * EARLY_CALL_MAX_BONUS_RATIO * earlyFraction));
  return {
    waveNumber: state.nextWaveNumber,
    bonus,
    earlyFraction,
    source
  };
}

function callNextWaveEarly() {
  if (
    state.mode === "playing" &&
    !state.paused &&
    state.awaitingFirstWaveStart &&
    state.nextWaveNumber === 1 &&
    state.activeWaves.length === 0
  ) {
    const launchedFirstWave = launchWave(1, 0.12);
    if (!launchedFirstWave) {
      return false;
    }
    state.awaitingFirstWaveStart = false;
    state.waveBreakTimer = 0;
    state.waveBreakDuration = 0;
    showHudMessage("Wave 1 started", 1.6);
    return true;
  }

  const info = computeEarlyCallInfo();
  if (!info) {
    return false;
  }

  const launched = launchWave(info.waveNumber, 0.04);
  if (!launched) {
    return false;
  }

  state.credits += info.bonus;
  state.earlyCallBonusLast = info.bonus;
  state.earlyCallFlash = 0.9;
  showHudMessage(`Early wave called: +$${info.bonus}`, 2.2);
  state.waveBreakTimer = 0;
  return true;
}

function updateWave(dt) {
  if (state.activeWaves.length > 0) {
    for (const waveState of state.activeWaves) {
      if (waveState.pendingSpawns <= 0) {
        continue;
      }

      waveState.spawnTimer -= dt;
      while (waveState.pendingSpawns > 0 && waveState.spawnTimer <= 0) {
        spawnEnemy(waveState);
        waveState.pendingSpawns -= 1;
        waveState.spawnTimer += waveState.config.spawnGap;
      }
    }

    state.activeWaves = state.activeWaves.filter((waveState) => {
      const alive = getWavePendingEnemyCount(waveState.waveNumber);
      return waveState.pendingSpawns > 0 || alive > 0;
    });

    if (state.activeWaves.length === 0 && state.nextWaveNumber <= WAVES.length) {
      state.waveBreakDuration = WAVE_BREAK_SECONDS;
      state.waveBreakTimer = state.waveBreakDuration;
    }
    return;
  }

  if (state.nextWaveNumber > WAVES.length) {
    if (state.enemies.length === 0) {
      state.mode = "victory";
      endTitle.textContent = "Settlement Secured";
      endCopy.textContent = `Final score: ${state.score}`;
      showOverlay(endOverlay);
    }
    return;
  }

  if (state.awaitingFirstWaveStart) {
    return;
  }

  state.waveBreakTimer -= dt;
  if (state.waveBreakTimer <= 0) {
    launchWave(state.nextWaveNumber, 0.15);
  }
}

function applySlow(enemy, slowFactor, slowDuration) {
  if (!enemy || slowFactor >= 1 || slowDuration <= 0) {
    return;
  }
  const slowResist = Number.isFinite(enemy.slowResist) ? enemy.slowResist : 1;
  const slowDurationMult = Number.isFinite(enemy.slowDurationMult) ? enemy.slowDurationMult : 1;
  if (slowResist <= 0 || slowDurationMult <= 0) {
    return;
  }

  const adjustedFactor = 1 - (1 - slowFactor) * slowResist;
  const adjustedDuration = slowDuration * slowDurationMult;
  if (adjustedFactor >= 1 || adjustedDuration <= 0) {
    return;
  }

  const hadSlow = enemy.slowTimer > 0 && enemy.slowMultiplier < 1;
  enemy.slowMultiplier = Math.max(0.3, Math.min(enemy.slowMultiplier, adjustedFactor));
  enemy.slowTimer = Math.max(enemy.slowTimer, adjustedDuration);
  if (!hadSlow || enemy.slowMultiplier < adjustedFactor + 0.0001) {
    state.combatStats.slowApplications += 1;
  }
}

function applyFreeze(enemy, freezeDuration) {
  if (!enemy || freezeDuration <= 0) {
    return;
  }
  const slowDurationMult = Number.isFinite(enemy.slowDurationMult) ? enemy.slowDurationMult : 1;
  const adjusted = Math.max(0, freezeDuration * slowDurationMult);
  if (adjusted <= 0) {
    return;
  }
  enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, adjusted);
  enemy.slowMultiplier = 0;
  enemy.slowTimer = Math.max(enemy.slowTimer || 0, adjusted);
  state.combatStats.freezeApplications += 1;
}

function applyStun(enemy, stunDuration) {
  if (!enemy || stunDuration <= 0) {
    return;
  }
  enemy.stunTimer = Math.max(enemy.stunTimer || 0, stunDuration);
}

function applyShock(enemy, shockDps, shockDuration) {
  if (!enemy || shockDps <= 0 || shockDuration <= 0) {
    return;
  }
  enemy.shockDps = Math.max(enemy.shockDps || 0, shockDps);
  enemy.shockTimer = Math.max(enemy.shockTimer || 0, shockDuration);
}

function applyDamage(enemy, damage, damageType = "kinetic") {
  if (!enemy || damage <= 0) {
    return 0;
  }
  const multipliers = enemy.damageMult || {};
  const damageMult =
    Number.isFinite(multipliers[damageType]) && multipliers[damageType] >= 0 ? multipliers[damageType] : 1;
  let finalDamage = damage * damageMult;

  if (enemy.armorFlat > 0 && damageType !== "explosive") {
    finalDamage = Math.max(1, finalDamage - enemy.armorFlat);
  }

  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, finalDamage);
    enemy.shield -= absorbed;
    finalDamage -= absorbed;
  }

  if (finalDamage <= 0) {
    return 0;
  }

  enemy.hp -= finalDamage;
  enemy.hitFlash = Math.max(enemy.hitFlash || 0, Math.min(1, finalDamage / Math.max(8, enemy.maxHp * 0.12)));
  return finalDamage;
}

function damageEnemy(enemy, damage, damageType = "kinetic") {
  return applyDamage(enemy, damage, damageType);
}

function getTowerForDefender(defender) {
  return getTowerById(defender.towerId);
}

function getDefenderProfileForTower(tower, kind) {
  if (!tower) {
    return null;
  }
  if (kind === "guardian") {
    return {
      kind,
      maxHp: tower.guardianHp,
      damage: tower.guardianDamage,
      attackInterval: tower.guardianAttackInterval,
      moveSpeed: tower.guardianMoveSpeed,
      respawnDelay: tower.guardianRespawn,
      stunDuration: tower.guardianStunDuration,
      stunRadiusTiles: tower.guardianStunRadiusTiles,
      radius: 22,
      leashTiles: 4
    };
  }
  return {
    kind: "militia",
    maxHp: tower.defenderHp,
    damage: tower.defenderDamage,
    attackInterval: tower.defenderAttackInterval,
    moveSpeed: tower.defenderMoveSpeed,
    respawnDelay: tower.defenderRespawn,
    stunDuration: 0,
    stunRadiusTiles: 0,
    radius: 12,
    leashTiles: Math.min(4, tower.defenderLeashTiles || 4)
  };
}

function getDefenderSpawnPoint(tower, kind, slotIndex = 0) {
  if (kind === "guardian") {
    const launchAnchor = getDefenderGateLaunchAnchor({ c: tower.c, r: tower.r }, tower.rotation || 0, tower.footprint || 2);
    if (isCellInBoundsForFootprint(launchAnchor, 2)) {
      return gridToFootprintCenter(launchAnchor.c, launchAnchor.r, 2);
    }
  }
  const offsetAngles = [-0.8, 0, 0.8];
  const angle = offsetAngles[slotIndex % offsetAngles.length];
  return {
    x: tower.x + Math.cos(angle) * 12,
    y: tower.y + 8 + Math.sin(angle) * 8
  };
}

function clampPointToDefenderLeash(point, tower, leashTiles) {
  if (!point || !tower) {
    return point;
  }
  const maxDistance = Math.max(1, (leashTiles || 4) * TILE_STEP);
  const dx = point.x - tower.x;
  const dy = point.y - tower.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= maxDistance) {
    return point;
  }
  const ratio = maxDistance / distance;
  return {
    x: tower.x + dx * ratio,
    y: tower.y + dy * ratio
  };
}

function getLaneCellIndexNearPoint(pathCells, x, y) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < pathCells.length; i += 1) {
    const center = gridToFootprintCenter(pathCells[i].c, pathCells[i].r, LARGE_ENEMY_FOOTPRINT);
    const distance = Math.hypot(center.x - x, center.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function getDefenderRallyPoint(defender) {
  const tower = getTowerForDefender(defender);
  if (!tower || !state.map) {
    return { x: defender.x, y: defender.y };
  }
  const leashTiles = defender.leashTiles || 4;

  const laneCells = getLanePathCells();
  if (laneCells.length === 0) {
    return { x: tower.x, y: tower.y };
  }

  if (defender.kind === "guardian") {
    const dir = getRotationVector(tower.rotation || 0);
    const launchAnchor = getDefenderGateLaunchAnchor({ c: tower.c, r: tower.r }, tower.rotation || 0, tower.footprint || 2);
    if (isCellInBoundsForFootprint(launchAnchor, 2)) {
      const launchCenter = gridToFootprintCenter(launchAnchor.c, launchAnchor.r, 2);
      return clampPointToDefenderLeash({
        x: launchCenter.x + dir.dc * TILE_STEP * 0.5,
        y: launchCenter.y + dir.dr * TILE_STEP * 0.5
      }, tower, leashTiles);
    }
    return { x: tower.x, y: tower.y };
  }

  const nearestIndex = getLaneCellIndexNearPoint(laneCells, tower.x, tower.y);
  const baseIndex = clamp(nearestIndex + 1 + defender.slotIndex * 2, 0, laneCells.length - 1);
  const rallyCell = laneCells[baseIndex];
  const center = gridToFootprintCenter(rallyCell.c, rallyCell.r, LARGE_ENEMY_FOOTPRINT);
  const sideShift = (defender.slotIndex - 1) * 8;
  return clampPointToDefenderLeash({ x: center.x + sideShift, y: center.y }, tower, leashTiles);
}

function syncDefenderStatsForTower(tower) {
  if (!tower) {
    return;
  }
  for (const defender of state.defenders) {
    if (defender.towerId !== tower.id) {
      continue;
    }
    const profile = getDefenderProfileForTower(tower, defender.kind);
    if (!profile) {
      continue;
    }
    const hpRatio = defender.maxHp > 0 ? defender.hp / defender.maxHp : 1;
    defender.maxHp = profile.maxHp;
    defender.hp = clamp(defender.maxHp * hpRatio, 0, defender.maxHp);
    defender.damage = profile.damage;
    defender.attackInterval = profile.attackInterval;
    defender.moveSpeed = profile.moveSpeed;
    defender.respawnDelay = profile.respawnDelay;
    defender.stunDuration = profile.stunDuration;
    defender.stunRadiusTiles = profile.stunRadiusTiles;
    defender.radius = profile.radius;
    defender.leashTiles = profile.leashTiles;
    if (defender.dead) {
      defender.respawnTimer = Math.min(defender.respawnTimer, defender.respawnDelay);
    }
  }
}

function ensureDefendersForTower(tower) {
  if (!tower) {
    return;
  }
  if (tower.projectileKind !== "barracks_spawn" && tower.projectileKind !== "guardian_spawn") {
    return;
  }

  const desiredCount = tower.projectileKind === "guardian_spawn" ? 1 : tower.defenderCount;
  const kind = tower.projectileKind === "guardian_spawn" ? "guardian" : "militia";
  const existing = state.defenders.filter((defender) => defender.towerId === tower.id && defender.kind === kind);
  if (existing.length > desiredCount) {
    const keepIds = new Set(existing.slice(0, desiredCount).map((defender) => defender.id));
    state.defenders = state.defenders.filter(
      (defender) => defender.towerId !== tower.id || defender.kind !== kind || keepIds.has(defender.id)
    );
    return;
  }

  for (let i = existing.length; i < desiredCount; i += 1) {
    const profile = getDefenderProfileForTower(tower, kind);
    const spawn = getDefenderSpawnPoint(tower, kind, i);
    state.defenders.push({
      id: state.defenderSeq++,
      towerId: tower.id,
      kind,
      slotIndex: i,
      x: spawn.x,
      y: spawn.y,
      hp: profile.maxHp,
      maxHp: profile.maxHp,
      damage: profile.damage,
      attackInterval: profile.attackInterval,
      attackCooldown: 0.22 + i * 0.11,
      moveSpeed: profile.moveSpeed,
      respawnDelay: profile.respawnDelay,
      respawnTimer: 0,
      radius: profile.radius,
      leashTiles: profile.leashTiles,
      stunDuration: profile.stunDuration,
      stunRadiusTiles: profile.stunRadiusTiles,
      dead: false,
      state: "rally",
      swingTimer: 0,
      targetEnemyId: null,
      rallyX: spawn.x,
      rallyY: spawn.y
    });
  }
}

function isEnemyValidForDefenderTarget(enemy, defender, tower) {
  if (!enemy || !defender || !tower || enemy.hp <= 0) {
    return false;
  }
  if ((enemy.freezeTimer || 0) > 0 || (enemy.stunTimer || 0) > 0) {
    return false;
  }
  const leashDistance = (defender.leashTiles || 4) * TILE_STEP;
  const distanceToTower = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
  return distanceToTower <= leashDistance;
}

function getNearestEnemyForDefender(defender, tower, claimedEnemyIds = null) {
  let best = null;
  let bestDistance = Infinity;

  for (const enemy of state.enemies) {
    if (claimedEnemyIds && claimedEnemyIds.has(enemy.id)) {
      continue;
    }
    if (!isEnemyValidForDefenderTarget(enemy, defender, tower)) {
      continue;
    }

    const distance = Math.hypot(enemy.x - defender.x, enemy.y - defender.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = enemy;
    }
  }

  return { enemy: best, distance: bestDistance };
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq <= 0.00001) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  return Math.hypot(px - closestX, py - closestY);
}

function applyFlameBeamDamage(tower, dt, beamStart, beamEnd) {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      continue;
    }
    const distance = distancePointToSegment(enemy.x, enemy.y, beamStart.x, beamStart.y, beamEnd.x, beamEnd.y);
    if (distance <= enemy.radius + tower.beamWidth) {
      damageEnemy(enemy, tower.beamDps * dt, "kinetic");
    }
  }
}

function applyGuardianStun(defender, enemy) {
  if (!defender || defender.kind !== "guardian" || !enemy) {
    return;
  }
  const radius = (defender.stunRadiusTiles || 0) * TILE_STEP;
  if (radius <= 0 || defender.stunDuration <= 0) {
    return;
  }
  for (const candidate of state.enemies) {
    if (candidate.hp <= 0) {
      continue;
    }
    const distance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
    if (distance <= radius + candidate.radius * 0.4) {
      applyStun(candidate, defender.stunDuration);
    }
  }
}

function updateDefenders(dt) {
  for (const tower of state.towers) {
    ensureDefendersForTower(tower);
  }

  for (const enemy of state.enemies) {
    enemy.engagedDefenderId = null;
  }

  const claimedEnemyIds = new Set();

  for (const defender of state.defenders) {
    const tower = getTowerForDefender(defender);
    if (!tower) {
      defender.dead = true;
      defender.hp = 0;
      defender.targetEnemyId = null;
      continue;
    }

    if (defender.dead || defender.hp <= 0) {
      defender.dead = true;
      defender.state = "dead";
      defender.targetEnemyId = null;
      defender.respawnTimer -= dt;
      if (defender.respawnTimer <= 0) {
        const spawn = getDefenderSpawnPoint(tower, defender.kind, defender.slotIndex);
        defender.dead = false;
        defender.state = "rally";
        defender.hp = defender.maxHp;
        defender.x = spawn.x;
        defender.y = spawn.y;
        defender.attackCooldown = 0.28;
        defender.targetEnemyId = null;
      }
      continue;
    }

    defender.attackCooldown = Math.max(0, defender.attackCooldown - dt);
    defender.swingTimer = Math.max(0, defender.swingTimer - dt * 2.5);
    const rally = getDefenderRallyPoint(defender);
    defender.rallyX = rally.x;
    defender.rallyY = rally.y;

    let target = getEnemyById(defender.targetEnemyId);
    if (!isEnemyValidForDefenderTarget(target, defender, tower) || claimedEnemyIds.has(target.id)) {
      defender.targetEnemyId = null;
      target = null;
    }

    if (!target) {
      const nearest = getNearestEnemyForDefender(defender, tower, claimedEnemyIds);
      target = nearest.enemy;
      if (target) {
        defender.targetEnemyId = target.id;
      }
    }

    if (!target) {
      defender.targetEnemyId = null;
      defender.state = "rally";
      const dx = rally.x - defender.x;
      const dy = rally.y - defender.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 2) {
        const step = Math.min(distance, defender.moveSpeed * dt);
        defender.x += (dx / distance) * step;
        defender.y += (dy / distance) * step;
      }
      continue;
    }

    claimedEnemyIds.add(target.id);
    target.engagedDefenderId = defender.id;

    const distanceToTarget = Math.hypot(target.x - defender.x, target.y - defender.y);
    const engageRange = defender.radius + target.radius + 3;
    if (distanceToTarget > engageRange) {
      defender.state = "engage";
      const dx = target.x - defender.x;
      const dy = target.y - defender.y;
      const denominator = Math.max(distanceToTarget, 1);
      const step = Math.min(distanceToTarget, defender.moveSpeed * dt);
      defender.x += (dx / denominator) * step;
      defender.y += (dy / denominator) * step;
      continue;
    }

    defender.state = "engage";
    if (defender.attackCooldown <= 0) {
      damageEnemy(target, defender.damage, "kinetic");
      defender.attackCooldown = defender.attackInterval;
      defender.swingTimer = 1;
      if (defender.kind === "guardian") {
        applyGuardianStun(defender, target);
      }
      if (target.hp <= 0) {
        state.combatStats.defenderKills += 1;
      }
    }
  }

  state.defenders = state.defenders.filter((defender) => {
    const tower = getTowerForDefender(defender);
    return Boolean(tower);
  });
}

function findMeleeDefenderTarget(enemy) {
  if (!enemy || !Number.isFinite(enemy.engagedDefenderId)) {
    return null;
  }
  const defender = getDefenderById(enemy.engagedDefenderId);
  if (!defender || defender.dead || defender.hp <= 0) {
    return null;
  }
  const tower = getTowerForDefender(defender);
  if (!tower || !isEnemyValidForDefenderTarget(enemy, defender, tower)) {
    return null;
  }
  const distance = Math.hypot(enemy.x - defender.x, enemy.y - defender.y);
  if (distance > enemy.radius + defender.radius + ENEMY_MELEE_RANGE_PAD) {
    return null;
  }
  return defender;
}

function updateSlimePatches(dt) {
  for (const patch of state.slimePatches) {
    patch.ttl -= dt;
  }
  state.slimePatches = state.slimePatches.filter((patch) => patch.ttl > 0);

  if (state.slimePatches.length === 0) {
    return;
  }

  const patchByCell = new Map();
  for (const patch of state.slimePatches) {
    const key = cellKey(patch.c, patch.r);
    const existing = patchByCell.get(key);
    if (!existing || patch.slowFactor < existing.slowFactor) {
      patchByCell.set(key, patch);
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      continue;
    }
    const footprint = enemy.footprint || SMALL_ENEMY_FOOTPRINT;
    const anchor = worldToNearestAnchor(enemy.x, enemy.y, footprint);
    let strongestPatch = null;
    iterateFootprintCells(anchor, footprint, (c, r) => {
      const patch = patchByCell.get(cellKey(c, r));
      if (patch && (!strongestPatch || patch.slowFactor < strongestPatch.slowFactor)) {
        strongestPatch = patch;
      }
    });
    if (strongestPatch) {
      applySlow(enemy, strongestPatch.slowFactor, dt * 1.35);
    }
  }
}

function applySlimePatchAtEnemy(enemy, tower) {
  if (!enemy || !tower) {
    return;
  }
  const footprint = enemy.footprint || SMALL_ENEMY_FOOTPRINT;
  const anchor = worldToNearestAnchor(enemy.x, enemy.y, footprint);
  const spread = tower.slimeSpread || 0;
  const trailDuration = tower.slimeTrailDuration || 0;
  if (trailDuration <= 0) {
    return;
  }
  const newCells = new Map();
  iterateFootprintCells(anchor, footprint, (c, r) => {
    for (let dr = -spread; dr <= spread; dr += 1) {
      for (let dc = -spread; dc <= spread; dc += 1) {
        const cell = { c: c + dc, r: r + dr };
        if (cell.c < 0 || cell.r < 0 || cell.c >= GRID_COLS || cell.r >= GRID_ROWS) {
          continue;
        }
        newCells.set(cellKey(cell.c, cell.r), cell);
      }
    }
  });

  for (const patchCell of newCells.values()) {
    const key = cellKey(patchCell.c, patchCell.r);
    const existing = state.slimePatches.find((patch) => patch.c === patchCell.c && patch.r === patchCell.r);
    if (existing) {
      existing.ttl = Math.max(existing.ttl, trailDuration);
      existing.slowFactor = Math.min(existing.slowFactor, tower.slimePatchSlowFactor || 0.78);
      continue;
    }
    state.slimePatches.push({
      id: `${key}:${state.simClock.toFixed(2)}`,
      c: patchCell.c,
      r: patchCell.r,
      ttl: trailDuration,
      duration: trailDuration,
      slowFactor: tower.slimePatchSlowFactor || 0.78
    });
  }
  state.combatStats.slimeApplications += 1;
}

function stepEnemyTowardPoint(enemy, targetPoint, remainingDistance) {
  const dx = targetPoint.x - enemy.x;
  const dy = targetPoint.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) {
    return { moved: 0, remaining: remainingDistance, reached: true, moveX: 0, moveY: 0 };
  }

  if (dist <= remainingDistance) {
    const moveX = targetPoint.x - enemy.x;
    const moveY = targetPoint.y - enemy.y;
    enemy.x = targetPoint.x;
    enemy.y = targetPoint.y;
    return { moved: dist, remaining: remainingDistance - dist, reached: true, moveX, moveY };
  }

  const ratio = remainingDistance / dist;
  const moveX = dx * ratio;
  const moveY = dy * ratio;
  enemy.x += moveX;
  enemy.y += moveY;
  return { moved: remainingDistance, remaining: 0, reached: false, moveX, moveY };
}

function applyEnemyVisualMotion(enemy, moveX, moveY, dt) {
  if (!enemy) {
    return;
  }
  const movedDistance = Math.hypot(moveX, moveY);
  enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt * 3.4);
  if (movedDistance <= 0.001) {
    enemy.motionTilt = (enemy.motionTilt || 0) * 0.82;
    return;
  }
  const dxInfluence = clamp(moveX / Math.max(8, TILE_STEP * 0.58), -1, 1);
  enemy.motionTilt = clamp((enemy.motionTilt || 0) * 0.42 + dxInfluence * 0.58, -1, 1);
  enemy.stridePhase = (enemy.stridePhase || 0) + movedDistance * 0.23;
}

function updateEnemy(enemy, dt) {
  let moveXTotal = 0;
  let moveYTotal = 0;
  if (enemy.regenPerSec > 0 && enemy.hp > 0) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regenPerSec * dt);
  }

  if (enemy.shieldMax > 0 && enemy.shieldRegenPerSec > 0) {
    enemy.shield = Math.min(enemy.shieldMax, enemy.shield + enemy.shieldRegenPerSec * dt);
  }

  if (enemy.slowTimer > 0) {
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    if (enemy.slowTimer === 0) {
      enemy.slowMultiplier = 1;
    }
  }

  if (enemy.freezeTimer > 0) {
    enemy.freezeTimer = Math.max(0, enemy.freezeTimer - dt);
    if (enemy.freezeTimer > 0) {
      enemy.slowMultiplier = 0;
    }
  }

  if (enemy.stunTimer > 0) {
    enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
  }

  if (enemy.shockTimer > 0) {
    enemy.shockTimer = Math.max(0, enemy.shockTimer - dt);
    if (enemy.shockDps > 0) {
      applyDamage(enemy, enemy.shockDps * dt, "electric");
    }
    if (enemy.shockTimer === 0) {
      enemy.shockDps = 0;
    }
  }

  if (enemy.hp <= 0) {
    applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
    return true;
  }

  if (enemy.freezeTimer > 0 || enemy.stunTimer > 0) {
    applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
    return true;
  }

  const meleeTarget = findMeleeDefenderTarget(enemy);
  if (meleeTarget) {
    enemy.meleeCooldown = Math.max(0, enemy.meleeCooldown - dt);
    if (enemy.meleeCooldown <= 0) {
      meleeTarget.hp -= enemy.meleeDamage;
      enemy.meleeCooldown = enemy.meleeAttackInterval;
      if (meleeTarget.hp <= 0) {
        meleeTarget.hp = 0;
        meleeTarget.dead = true;
        meleeTarget.state = "dead";
        meleeTarget.respawnTimer = meleeTarget.respawnDelay;
      }
    }
    applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
    return true;
  }

  const map = state.map;
  if (!map) {
    applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
    return true;
  }

  const footprint = enemy.footprint || SMALL_ENEMY_FOOTPRINT;

  if (enemy.burstInterval > 0) {
    if (enemy.burstTimer > 0) {
      enemy.burstTimer = Math.max(0, enemy.burstTimer - dt);
    } else {
      enemy.burstCooldown -= dt;
      if (enemy.burstCooldown <= 0) {
        enemy.burstTimer = enemy.burstDuration;
        enemy.burstCooldown = enemy.burstInterval;
      }
    }
  }

  const burstSpeed = enemy.burstTimer > 0 ? enemy.burstMultiplier : 1;
  const effectiveSpeed = enemy.speed * enemy.slowMultiplier * burstSpeed;
  let remaining = effectiveSpeed * dt;

  if (enemy.pathMode === "fixed") {
    const fixedPathWorld = enemy.pathWorld || map.roadWorld;
    while (remaining > 0) {
      const nextPoint = fixedPathWorld[enemy.pathIndex + 1];
      if (!nextPoint) {
        state.baseHealth -= 1;
        applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
        return false;
      }

      const step = stepEnemyTowardPoint(enemy, nextPoint, remaining);
      enemy.distanceAlongPath += step.moved;
      moveXTotal += step.moveX;
      moveYTotal += step.moveY;
      remaining = step.remaining;
      if (step.reached) {
        enemy.pathIndex += 1;
      }
    }
    enemy.progressMetric = enemy.distanceAlongPath;
    applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
    return true;
  }

  const blocked = getTowerBlockedSet();
  while (remaining > 0) {
    const goalX = Number.isFinite(enemy.goalX) ? enemy.goalX : map.goalWorld.x;
    const goalY = Number.isFinite(enemy.goalY) ? enemy.goalY : map.goalWorld.y;
    const distToGoal = Math.hypot(goalX - enemy.x, goalY - enemy.y);
    if (distToGoal < Math.max(6, footprint * 6)) {
      state.baseHealth -= 1;
      applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
      return false;
    }

    const currentCell = worldToNearestAnchor(enemy.x, enemy.y, footprint);
    const path = findPathWithFootprint(currentCell, map.goalCell, blocked, footprint);

    if (!path || path.length < 2) {
      const fallback = stepEnemyTowardPoint(enemy, { x: goalX, y: goalY }, remaining);
      enemy.distanceAlongPath += fallback.moved;
      moveXTotal += fallback.moveX;
      moveYTotal += fallback.moveY;
      remaining = fallback.remaining;
      if (!fallback.reached) {
        break;
      }
      continue;
    }

    enemy.progressMetric = (GRID_COLS * GRID_ROWS - path.length) * TILE_STEP + enemy.distanceAlongPath * 0.01;
    const nextCell = path[1];
    const nextPoint = gridToFootprintCenter(nextCell.c, nextCell.r, footprint);
    const step = stepEnemyTowardPoint(enemy, nextPoint, remaining);
    enemy.distanceAlongPath += step.moved;
    moveXTotal += step.moveX;
    moveYTotal += step.moveY;
    remaining = step.remaining;
    if (!step.reached) {
      break;
    }
  }

  applyEnemyVisualMotion(enemy, moveXTotal, moveYTotal, dt);
  return true;
}

function updateEnemies(dt) {
  const survivors = [];
  for (const enemy of state.enemies) {
    const aliveOnMap = updateEnemy(enemy, dt);
    if (aliveOnMap) {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;

  if (state.baseHealth <= 0 && state.mode === "playing") {
    state.mode = "gameover";
    endTitle.textContent = "Settlement Lost";
    endCopy.textContent = "The convoy reached your base.";
    showOverlay(endOverlay);
  }
}

function getTargetForTower(tower) {
  let best = null;
  let bestProgress = -Infinity;

  for (const enemy of state.enemies) {
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    const distance = Math.hypot(dx, dy);
    if (distance > tower.range) {
      continue;
    }

    const progress = Number.isFinite(enemy.progressMetric) ? enemy.progressMetric : enemy.distanceAlongPath;
    if (progress > bestProgress) {
      best = enemy;
      bestProgress = progress;
    }
  }

  return best;
}

function wrapAngle(angle) {
  let output = angle;
  while (output > Math.PI) {
    output -= Math.PI * 2;
  }
  while (output < -Math.PI) {
    output += Math.PI * 2;
  }
  return output;
}

function rotateTowardAngle(current, target, maxStep) {
  const delta = wrapAngle(target - current);
  if (Math.abs(delta) <= maxStep) {
    return target;
  }
  return current + Math.sign(delta) * maxStep;
}

function getTowerMuzzlePosition(tower) {
  const dirX = Math.cos(tower.aimAngle);
  const dirY = Math.sin(tower.aimAngle);
  const baseY = tower.y - 18;
  return {
    x: tower.x + dirX * tower.muzzleLength,
    y: baseY + dirY * tower.muzzleLength
  };
}

function updateTowerAim(tower, target, dt) {
  const desiredAngle = target
    ? Math.atan2(target.y - (tower.y - 18), target.x - tower.x)
    : tower.defaultAimAngle;
  tower.aimAngle = rotateTowardAngle(tower.aimAngle, desiredAngle, tower.turnSpeed * dt);
  tower.targetId = target ? target.id : null;
}

function getNextChainTarget(originX, originY, struckIds, range) {
  let best = null;
  let bestDistance = Infinity;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || struckIds.has(enemy.id)) {
      continue;
    }

    const dx = enemy.x - originX;
    const dy = enemy.y - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > range) {
      continue;
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      best = enemy;
    }
  }

  return best;
}

function castChainLightning(tower, firstTarget, origin) {
  let currentTarget = firstTarget;
  const struckIds = new Set();
  let originX = origin.x;
  let originY = origin.y;

  for (let jump = 0; jump < tower.chainJumps; jump += 1) {
    if (!currentTarget) {
      break;
    }

    struckIds.add(currentTarget.id);
    damageEnemy(currentTarget, tower.damage, "electric");
    applyShock(currentTarget, tower.shockDps, tower.shockDuration);
    state.combatStats.chainHits += 1;

    state.lightningFx.push({
      x1: originX,
      y1: originY,
      x2: currentTarget.x,
      y2: currentTarget.y,
      ttl: 0.12
    });

    originX = currentTarget.x;
    originY = currentTarget.y;
    currentTarget = getNextChainTarget(originX, originY, struckIds, tower.chainRange);
  }

  return struckIds;
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    const target = getTargetForTower(tower);
    const holdAimTarget =
      tower.projectileKind === "flame_beam" && tower.beamTimer > 0 && !target
        ? {
            x: tower.x + Math.cos(tower.aimAngle) * TILE_STEP * 2,
            y: tower.y - 18 + Math.sin(tower.aimAngle) * TILE_STEP * 2
          }
        : target;
    updateTowerAim(tower, holdAimTarget, dt);
    tower.recoil = Math.max(0, tower.recoil - dt * 3.8);
    tower.energyPulse = Math.max(0, tower.energyPulse - dt * 2.1);
    tower.barrelHeat = Math.max(0, (tower.barrelHeat || 0) - dt * (tower.projectileKind === "flame_beam" ? 0.55 : 1.05));

    if (tower.projectileKind === "barracks_spawn" || tower.projectileKind === "guardian_spawn") {
      tower.cooldown = 0;
      continue;
    }

    if (tower.projectileKind === "flame_beam") {
      const muzzle = getTowerMuzzlePosition(tower);
      const beamLength = tower.beamLengthTiles * TILE_STEP;

      if (tower.beamTimer > 0) {
        const beamAngle = tower.aimAngle;
        const beamEnd = {
          x: muzzle.x + Math.cos(beamAngle) * beamLength,
          y: muzzle.y + Math.sin(beamAngle) * beamLength
        };
        tower.beamEndX = beamEnd.x;
        tower.beamEndY = beamEnd.y;
        applyFlameBeamDamage(tower, dt, muzzle, beamEnd);
        tower.beamTimer = Math.max(0, tower.beamTimer - dt);
        tower.energyPulse = 1;
        tower.barrelHeat = Math.max(tower.barrelHeat || 0, 1);
        if (tower.beamTimer <= 0) {
          tower.cooldown = Math.max(tower.cooldown, tower.beamCooldown);
        }
      } else if (tower.cooldown <= 0 && target) {
        tower.beamTimer = tower.beamDuration;
        tower.energyPulse = 1;
        tower.barrelHeat = Math.max(tower.barrelHeat || 0, 1);
        tower.cooldown = tower.beamCooldown;
        state.shotFx.push({
          x: muzzle.x,
          y: muzzle.y,
          ttl: 0.14,
          kind: "flame_beam"
        });
        state.combatStats.shotsByType[tower.typeId] = (state.combatStats.shotsByType[tower.typeId] || 0) + 1;
      }
      continue;
    }

    if (tower.cooldown > 0 || !target) {
      continue;
    }

    const muzzle = getTowerMuzzlePosition(tower);

    if (tower.projectileKind === "chain") {
      castChainLightning(tower, target, muzzle);
      state.combatStats.shotsByType[tower.typeId] = (state.combatStats.shotsByType[tower.typeId] || 0) + 1;
      tower.energyPulse = 1;
      tower.barrelHeat = Math.max(tower.barrelHeat || 0, 0.8);
      tower.cooldown = tower.fireRate;
      continue;
    }

    const dx = target.x - muzzle.x;
    const dy = target.y - muzzle.y;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = tower.projectileSpeed;

    state.projectiles.push({
      kind: tower.projectileKind,
      damageType:
        tower.projectileKind === "mortar" ? "explosive" : tower.projectileKind === "frost" ? "frost" : "kinetic",
      x: muzzle.x,
      y: muzzle.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      sourceTowerId: tower.id,
      damage: tower.damage,
      life: 1.8,
      radius: tower.projectileKind === "mortar" ? 6 : 4,
      aoeRadius: tower.aoeRadius,
      slowFactor: tower.slowFactor,
      slowDuration: tower.projectileKind === "slime" ? 1.35 : tower.slowDuration,
      freezeDuration: tower.freezeDuration || 0,
      frostBurstRadius: tower.frostBurstRadius || 0,
      clusterCount: tower.clusterCount || 0,
      clusterDamage: tower.clusterDamage || 0,
      clusterRadius: tower.clusterRadius || 0,
      slimePatchSlowFactor: tower.slimePatchSlowFactor || 0.78,
      slimeTrailDuration: tower.slimeTrailDuration || 0,
      slimeSpread: tower.slimeSpread || 0,
      pierceRemaining: tower.pierceCount || 0,
      hitEnemyIds: []
    });

    state.shotFx.push({
      x: muzzle.x,
      y: muzzle.y,
      ttl: 0.09,
      kind: tower.projectileKind
    });
    state.combatStats.shotsByType[tower.typeId] = (state.combatStats.shotsByType[tower.typeId] || 0) + 1;
    tower.recoil = 1;
    tower.barrelHeat = Math.max(tower.barrelHeat || 0, tower.projectileKind === "frost" ? 0.42 : 0.62);

    tower.cooldown = tower.fireRate;
  }
}

function applyAreaDamage(centerX, centerY, damage, radius, slowFactor, slowDuration, damageType = "explosive") {
  let hitCount = 0;
  for (const enemy of state.enemies) {
    const dx = enemy.x - centerX;
    const dy = enemy.y - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius + enemy.radius * 0.25) {
      continue;
    }

    state.combatStats.splashHits += 1;
    damageEnemy(enemy, damage, damageType);
    applySlow(enemy, slowFactor, slowDuration);
    hitCount += 1;
  }
  return hitCount;
}

function updateProjectiles(dt) {
  const nextProjectiles = [];

  for (const projectile of state.projectiles) {
    projectile.life -= dt;
    if (projectile.life <= 0) {
      continue;
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    let hitEnemy = null;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }
      if (projectile.hitEnemyIds && projectile.hitEnemyIds.includes(enemy.id)) {
        continue;
      }

      const dx = enemy.x - projectile.x;
      const dy = enemy.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= enemy.radius + projectile.radius) {
        hitEnemy = enemy;
        break;
      }
    }

    if (!hitEnemy) {
      nextProjectiles.push(projectile);
      continue;
    }

    if (projectile.aoeRadius > 0) {
      applyAreaDamage(
        hitEnemy.x,
        hitEnemy.y,
        projectile.damage,
        projectile.aoeRadius,
        projectile.slowFactor,
        projectile.slowDuration,
        projectile.damageType
      );
      state.explosionFx.push({
        x: hitEnemy.x,
        y: hitEnemy.y,
        radius: projectile.aoeRadius,
        ttl: 0.22
      });

      if (projectile.clusterCount > 0 && projectile.clusterDamage > 0 && projectile.clusterRadius > 0) {
        for (let i = 0; i < projectile.clusterCount; i += 1) {
          const angle = (Math.PI * 2 * i) / projectile.clusterCount + hitEnemy.id * 0.33;
          const clusterX = hitEnemy.x + Math.cos(angle) * projectile.clusterRadius * 0.55;
          const clusterY = hitEnemy.y + Math.sin(angle) * projectile.clusterRadius * 0.55;
          applyAreaDamage(
            clusterX,
            clusterY,
            projectile.clusterDamage,
            projectile.clusterRadius,
            projectile.slowFactor,
            projectile.slowDuration,
            projectile.damageType
          );
          state.explosionFx.push({
            x: clusterX,
            y: clusterY,
            radius: projectile.clusterRadius,
            ttl: 0.16
          });
        }
      }
    } else {
      damageEnemy(hitEnemy, projectile.damage, projectile.damageType);
      if (projectile.kind === "frost") {
        applyFreeze(hitEnemy, projectile.freezeDuration || 0);
      } else {
        applySlow(hitEnemy, projectile.slowFactor, projectile.slowDuration);
      }

      if (projectile.kind === "slime") {
        applySlimePatchAtEnemy(hitEnemy, {
          slimePatchSlowFactor: projectile.slimePatchSlowFactor || 0.78,
          slimeTrailDuration: projectile.slimeTrailDuration || 0,
          slimeSpread: projectile.slimeSpread || 0
        });
      }

      if (projectile.frostBurstRadius > 0) {
        for (const enemy of state.enemies) {
          const dx = enemy.x - hitEnemy.x;
          const dy = enemy.y - hitEnemy.y;
          const distance = Math.hypot(dx, dy);
          if (distance > projectile.frostBurstRadius + enemy.radius * 0.2) {
            continue;
          }
          damageEnemy(enemy, projectile.damage * 0.45, "frost");
          applyFreeze(enemy, (projectile.freezeDuration || 0) * 0.6);
        }
        state.explosionFx.push({
          x: hitEnemy.x,
          y: hitEnemy.y,
          radius: projectile.frostBurstRadius,
          ttl: 0.14
        });
      }
    }

    projectile.hitEnemyIds = projectile.hitEnemyIds || [];
    projectile.hitEnemyIds.push(hitEnemy.id);
    if (projectile.pierceRemaining > 0) {
      projectile.pierceRemaining -= 1;
      projectile.damage *= 0.92;
      nextProjectiles.push(projectile);
    }
  }

  state.projectiles = nextProjectiles;
}

function resolveEnemyDefeats() {
  const survivors = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
      continue;
    }

    state.score += 10;
    state.credits += enemy.reward;
  }
  state.enemies = survivors;
}

function updateEffects(dt) {
  state.shotFx = state.shotFx.filter((effect) => {
    effect.ttl -= dt;
    return effect.ttl > 0;
  });

  state.explosionFx = state.explosionFx.filter((effect) => {
    effect.ttl -= dt;
    return effect.ttl > 0;
  });

  state.lightningFx = state.lightningFx.filter((effect) => {
    effect.ttl -= dt;
    return effect.ttl > 0;
  });

  state.earlyCallFlash = Math.max(0, state.earlyCallFlash - dt * 1.8);
  if (state.hudMessageTimer > 0) {
    state.hudMessageTimer = Math.max(0, state.hudMessageTimer - dt);
    if (state.hudMessageTimer === 0) {
      state.hudMessage = "";
    }
  }
}

function update(dt) {
  if (state.mode !== "playing") {
    return;
  }

  state.simClock += dt;

  if (state.paused) {
    return;
  }

  state.lanePathCache.refreshTimer = Math.max(0, state.lanePathCache.refreshTimer - dt);

  updateWave(dt);
  refreshLanePathCache();
  updateSlimePatches(dt);
  updateDefenders(dt);
  updateEnemies(dt);
  if (state.mode !== "playing") {
    return;
  }

  updateTowers(dt);
  updateProjectiles(dt);
  resolveEnemyDefeats();
  updateEffects(dt);
}

function drawVoxelHeartIcon(x, y, blockSize) {
  const w = blockSize * 9 + 2;
  const h = blockSize * 7;
  const topY = y + 1;
  const centerX = x + w * 0.5;

  const drawHeartPath = () => {
    ctx.beginPath();
    ctx.moveTo(centerX, topY + h * 0.96);
    ctx.bezierCurveTo(x + w * 0.16, topY + h * 0.7, x + w * 0.03, topY + h * 0.5, x + w * 0.03, topY + h * 0.3);
    ctx.bezierCurveTo(x + w * 0.03, topY + h * 0.1, x + w * 0.19, topY + h * 0.01, x + w * 0.34, topY + h * 0.01);
    ctx.bezierCurveTo(x + w * 0.43, topY + h * 0.01, x + w * 0.49, topY + h * 0.08, centerX, topY + h * 0.14);
    ctx.bezierCurveTo(x + w * 0.51, topY + h * 0.08, x + w * 0.57, topY + h * 0.01, x + w * 0.66, topY + h * 0.01);
    ctx.bezierCurveTo(x + w * 0.81, topY + h * 0.01, x + w * 0.97, topY + h * 0.1, x + w * 0.97, topY + h * 0.3);
    ctx.bezierCurveTo(x + w * 0.97, topY + h * 0.5, x + w * 0.84, topY + h * 0.7, centerX, topY + h * 0.96);
    ctx.closePath();
  };

  drawHeartPath();
  const gradient = ctx.createLinearGradient(x, topY, x, topY + h);
  gradient.addColorStop(0, "#ffb2c1");
  gradient.addColorStop(0.5, "#ff6f90");
  gradient.addColorStop(1, "#cc355b");
  ctx.fillStyle = gradient;
  ctx.fill();

  drawHeartPath();
  const gloss = ctx.createLinearGradient(x + w * 0.12, topY, x + w * 0.78, topY + h * 0.5);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.48)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fill();

  drawHeartPath();
  const shade = ctx.createLinearGradient(x, topY + h * 0.48, x, topY + h);
  shade.addColorStop(0, "rgba(106, 20, 41, 0)");
  shade.addColorStop(1, "rgba(106, 20, 41, 0.38)");
  ctx.fillStyle = shade;
  ctx.fill();

  drawHeartPath();
  ctx.strokeStyle = "#ffdce5";
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function drawPanel() {
  const selectedTower = getSelectedTowerType();
  const selectedPlacedTower = getSelectedPlacedTower();

  ctx.fillStyle = "#0f2545d9";
  ctx.fillRect(16, 14, canvas.width - 32, 64);
  ctx.strokeStyle = "#4f6a97";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 14, canvas.width - 32, 64);

  ctx.fillStyle = "#eaf1ff";
  ctx.font = "700 22px Trebuchet MS";
  ctx.fillText(getWaveLabel(), 34, 50);

  ctx.fillStyle = "#ffe8ab";
  ctx.fillText(`Credits $${state.credits}`, 292, 50);

  drawVoxelHeartIcon(524, 25, 5);
  ctx.fillStyle = "#ffcfb5";
  ctx.fillText(`${state.baseHealth}`, 574, 50);

  ctx.fillStyle = "#cff4ff";
  ctx.fillText(`Score ${state.score}`, 686, 50);

  ctx.fillStyle = "#d3dcff";
  const pauseLabel = state.paused ? "PAUSED (P/Space)" : "P/Space Pause";
  ctx.fillText(pauseLabel, 840, 50);

  ctx.fillStyle = "#d9e6ff";
  ctx.font = "600 16px Trebuchet MS";
  if (selectedPlacedTower) {
    const type = TOWER_TYPE_BY_ID[selectedPlacedTower.typeId];
    const tierLabel = getTowerTierData(type, selectedPlacedTower.tier)?.label || "Basic";
    ctx.fillText(`Selected Tower: ${type.name} (${tierLabel})`, 34, 69);
  } else {
    ctx.fillText(`Selected Build: ${selectedTower.name} ($${selectedTower.cost})`, 34, 69);
  }

  if (state.hudMessage && state.hudMessageTimer > 0) {
    const alpha = Math.min(1, state.hudMessageTimer / 0.7);
    ctx.fillStyle = `rgba(255, 241, 184, ${alpha})`;
    ctx.font = "700 15px Trebuchet MS";
    ctx.fillText(state.hudMessage, 760, 69);
  }
}

function getSettingsButtonRect() {
  return { x: canvas.width - 74, y: 22, width: 38, height: 38 };
}

function getSettingsPanelRect() {
  return { x: canvas.width - 296, y: 84, width: 268, height: 102 };
}

function getSettingsGridToggleRect() {
  const panel = getSettingsPanelRect();
  return { x: panel.x + 14, y: panel.y + 48, width: panel.width - 28, height: 36 };
}

function drawCogIcon(cx, cy, radius, active) {
  ctx.save();
  ctx.translate(cx, cy);
  const spin = state.simClock * (active ? 0.08 : 0.04);
  ctx.rotate(spin);

  ctx.fillStyle = active ? "rgba(255, 221, 133, 0.2)" : "rgba(185, 211, 248, 0.12)";
  ctx.beginPath();
  ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = active ? "#f0d08d" : "#9eb8da";
    ctx.fillRect(radius - 3, -2, 5, 4);
    ctx.restore();
  }

  const gearGradient = ctx.createRadialGradient(-2, -2, 1, 0, 0, radius - 2);
  if (active) {
    gearGradient.addColorStop(0, "#fff2ca");
    gearGradient.addColorStop(1, "#b88c4e");
  } else {
    gearGradient.addColorStop(0, "#e7f2ff");
    gearGradient.addColorStop(1, "#6f91bd");
  }
  ctx.fillStyle = gearGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = active ? "#ffe6a9" : "#c7defa";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = active ? "#2a4a75" : "#1f3a60";
  ctx.beginPath();
  ctx.arc(0, 0, radius - 7.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = active ? "#ffde96" : "#9ebde2";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 10.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSettingsControl() {
  const button = getSettingsButtonRect();
  const gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
  if (state.settingsOpen) {
    gradient.addColorStop(0, "#3a638f");
    gradient.addColorStop(1, "#1f3f65");
  } else {
    gradient.addColorStop(0, "#31557f");
    gradient.addColorStop(1, "#193859");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(button.x, button.y, button.width, button.height);

  ctx.fillStyle = state.settingsOpen ? "rgba(252, 231, 177, 0.28)" : "rgba(180, 212, 250, 0.2)";
  ctx.fillRect(button.x + 2, button.y + 2, button.width - 4, 8);

  ctx.strokeStyle = state.settingsOpen ? "#f7df95" : "#84a6d6";
  ctx.lineWidth = 1.8;
  ctx.strokeRect(button.x, button.y, button.width, button.height);
  drawCogIcon(button.x + button.width * 0.5, button.y + button.height * 0.5, 12.4, state.settingsOpen);
}

function drawSettingsPanel() {
  if (!state.settingsOpen) {
    return;
  }
  const panel = getSettingsPanelRect();
  const toggleRect = getSettingsGridToggleRect();
  const on = state.settings.showGridAlways;

  ctx.fillStyle = "#122949ee";
  ctx.strokeStyle = "#7fa2d5";
  ctx.lineWidth = 1.8;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

  ctx.fillStyle = "#eaf2ff";
  ctx.font = "700 15px Trebuchet MS";
  ctx.fillText("Settings", panel.x + 14, panel.y + 23);

  ctx.fillStyle = on ? "#2f6d47" : "#2b3b56";
  ctx.strokeStyle = on ? "#9de5b6" : "#6d86ad";
  ctx.lineWidth = 1.6;
  ctx.fillRect(toggleRect.x, toggleRect.y, toggleRect.width, toggleRect.height);
  ctx.strokeRect(toggleRect.x, toggleRect.y, toggleRect.width, toggleRect.height);
  ctx.fillStyle = on ? "#deffe9" : "#d4e2f9";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`Always show map grid: ${on ? "On" : "Off"}`, toggleRect.x + 10, toggleRect.y + 22);
}

function toggleSettingsPanel() {
  state.settingsOpen = !state.settingsOpen;
}

function toggleAlwaysShowGrid() {
  state.settings.showGridAlways = !state.settings.showGridAlways;
  saveSettings();
}

function drawVoxelBlockAt(topX, topY, size, height, depth, topColor, sideColor, frontColor, strokeColor, showStroke = true) {
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(topX + size, topY);
  ctx.lineTo(topX + size + depth, topY + depth);
  ctx.lineTo(topX + size + depth, topY + size + depth);
  ctx.lineTo(topX + size, topY + size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = frontColor;
  ctx.beginPath();
  ctx.moveTo(topX, topY + size);
  ctx.lineTo(topX + size, topY + size);
  ctx.lineTo(topX + size + depth, topY + size + depth);
  ctx.lineTo(topX + depth, topY + size + depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = topColor;
  ctx.fillRect(topX, topY, size, size);

  if (showStroke && strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(topX, topY, size, size);
  }

  if (height > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.24, height * 0.015)})`;
    ctx.fillRect(topX, topY + size, size + depth, depth);
  }
}

function drawBoard() {
  const selectedTower = getSelectedTowerType();
  const map = state.map;
  const roadSet = map ? map.roadSet : new Set();
  const gridVisible = isGridVisibleNow();
  const placementPreview = getPlacementPreviewCandidate();
  const previewAnchor = placementPreview ? placementPreview.anchor : null;
  const previewRotation = placementPreview ? placementPreview.rotation : 0;
  const previewFootprint = selectedTower ? selectedTower.footprint || 1 : 1;
  const previewCells = previewAnchor ? getFootprintCells(previewAnchor, previewFootprint) : [];
  const previewLaunchCells =
    previewAnchor && selectedTower && selectedTower.id === "defender"
      ? getDefenderGateLaunchCells(previewAnchor, previewRotation, previewFootprint)
      : [];
  const previewAllowed = placementPreview ? placementPreview.valid && state.credits >= selectedTower.cost : false;
  const previewCellSet = new Set(previewCells.map((cell) => cellKey(cell.c, cell.r)));
  const previewLaunchSet = new Set(previewLaunchCells.map((cell) => cellKey(cell.c, cell.r)));
  const slimeByCell = new Map();
  for (const patch of state.slimePatches) {
    const key = cellKey(patch.c, patch.r);
    const existing = slimeByCell.get(key);
    if (!existing || patch.ttl > existing.ttl) {
      slimeByCell.set(key, patch);
    }
  }

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const tile = gridToTopLeft(col, row);
      const topY = tile.y - TILE_HEIGHT;
      const path = roadSet.has(cellKey(col, row));
      const key = cellKey(col, row);
      const hasPreview = previewCellSet.has(key);
      const drawSize = gridVisible ? TILE_SIZE : TILE_SIZE + 2;
      const drawX = gridVisible ? tile.x : tile.x - 1;
      const drawY = gridVisible ? topY : topY - 1;

      if (path) {
        drawVoxelBlockAt(
          drawX,
          drawY,
          drawSize,
          TILE_HEIGHT,
          TILE_DEPTH,
          "#bea56e",
          "#7a6541",
          "#8e7548",
          "#f4e7c6",
          gridVisible
        );
      } else {
        drawVoxelBlockAt(
          drawX,
          drawY,
          drawSize,
          TILE_HEIGHT,
          TILE_DEPTH,
          "#7fbd68",
          "#456d39",
          "#518445",
          "#d4f2bd",
          gridVisible
        );
      }

      const slimePatch = slimeByCell.get(key);
      if (slimePatch) {
        const alpha = clamp((slimePatch.ttl / slimePatch.duration) * 0.45, 0.12, 0.45);
        ctx.fillStyle = `rgba(86, 172, 62, ${alpha})`;
        ctx.fillRect(tile.x + 1, topY + 1, TILE_SIZE - 1, TILE_SIZE - 1);
      }

      if (hasPreview) {
        ctx.fillStyle = previewAllowed ? "#56c4786e" : "#ef54547a";
        ctx.fillRect(tile.x + 2, topY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      } else if (previewLaunchSet.has(key)) {
        ctx.fillStyle = previewAllowed ? "#65b4ff46" : "#8e95a555";
        ctx.fillRect(tile.x + 3, topY + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      }
    }
  }
}

function getGatewayLayout(cell, side) {
  const center = gridToFootprintCenter(cell.c, cell.r, LARGE_ENEMY_FOOTPRINT);
  const gateCenterX = center.x + (side === "left" ? -TILE_SIZE * 0.68 : TILE_SIZE * 0.68);
  const gateBaseY = center.y + TILE_SIZE * 0.46;
  const openingWidth = Math.max(13, Math.round(TILE_SIZE * 0.5));
  const openingHeight = Math.max(28, Math.round(TILE_SIZE * 1.04));
  const pillarWidth = Math.max(8, Math.round(TILE_SIZE * 0.24));
  const pillarHeight = Math.max(28, Math.round(TILE_SIZE * 1.08));
  const stoneSize = Math.max(7, Math.round(TILE_SIZE * 0.23));
  const archSegments = 11;
  const archRadiusX = openingWidth * 0.5 + stoneSize * 1.15;
  const archRadiusY = Math.max(11, Math.round(TILE_SIZE * 0.62));

  const portalRect = {
    x: Math.round(gateCenterX - openingWidth * 0.5),
    y: Math.round(gateBaseY - openingHeight),
    width: openingWidth,
    height: openingHeight
  };

  const leftPillarX = Math.round(portalRect.x - pillarWidth - 1);
  const rightPillarX = Math.round(portalRect.x + portalRect.width + 1);
  const rise = Math.max(5, Math.round(stoneSize * 0.7));
  const pillarRows = Math.max(5, Math.round((pillarHeight + stoneSize) / rise));
  const pillarTopY = Math.round(gateBaseY - pillarRows * rise + 1);
  const archCenterX = gateCenterX;
  const archCenterY = Math.round(portalRect.y + archRadiusY + stoneSize * 0.22);

  return {
    side,
    gateCenterX,
    gateBaseY,
    openingWidth,
    openingHeight,
    pillarWidth,
    pillarHeight,
    archRadiusX,
    archRadiusY,
    archSegments,
    stoneSize,
    portalRect,
    leftPillarX,
    rightPillarX,
    rise,
    pillarRows,
    pillarTopY,
    archCenterX,
    archCenterY
  };
}

function drawGatewayShadow(layout, side) {
  const x =
    side === "left"
      ? layout.leftPillarX - Math.round(layout.stoneSize * 1.6)
      : layout.rightPillarX + layout.pillarWidth - Math.round(layout.stoneSize * 0.4);
  const y = layout.pillarTopY + Math.round(layout.stoneSize * 2.3);
  const width = Math.max(10, Math.round(layout.stoneSize * 1.5));
  const height = Math.max(18, Math.round(layout.pillarRows * layout.rise * 0.9));

  ctx.fillStyle = "rgba(28, 42, 56, 0.2)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "rgba(28, 42, 56, 0.11)";
  ctx.fillRect(x - 3, y + Math.round(layout.stoneSize * 0.7), width + 4, height * 0.7);
}

function drawGatewayPillars(layout, palette) {
  const buttressWidth = Math.max(6, Math.round(layout.pillarWidth * 0.82));
  const buttressRows = Math.max(3, Math.round(layout.pillarRows * 0.64));
  const buttressTopY = layout.gateBaseY - buttressRows * layout.rise + Math.round(layout.stoneSize * 0.34);
  const buttressLeftX = layout.leftPillarX - buttressWidth + 2;
  const buttressRightX = layout.rightPillarX + layout.pillarWidth - 2;
  const buttressDepth = 3;

  for (let row = 0; row < buttressRows; row += 1) {
    const y = buttressTopY + row * layout.rise;
    drawVoxelBlockAt(
      buttressLeftX,
      y,
      buttressWidth,
      6,
      buttressDepth,
      blendHex(palette.stoneTop, "#ecf4f8", 0.08),
      blendHex(palette.stoneSide, "#1f2f36", 0.08),
      blendHex(palette.stoneFront, "#e7f0f4", 0.05),
      palette.stoneStroke
    );
    drawVoxelBlockAt(
      buttressRightX,
      y,
      buttressWidth,
      6,
      buttressDepth,
      blendHex(palette.stoneTop, "#ecf4f8", 0.08),
      blendHex(palette.stoneSide, "#1f2f36", 0.08),
      blendHex(palette.stoneFront, "#e7f0f4", 0.05),
      palette.stoneStroke
    );
  }

  for (let row = 0; row < layout.pillarRows; row += 1) {
    const y = layout.pillarTopY + row * layout.rise;
    drawVoxelBlockAt(
      layout.leftPillarX,
      y,
      layout.pillarWidth,
      8,
      4,
      palette.stoneTop,
      palette.stoneSide,
      palette.stoneFront,
      palette.stoneStroke
    );
    drawVoxelBlockAt(
      layout.rightPillarX,
      y,
      layout.pillarWidth,
      8,
      4,
      palette.stoneTop,
      palette.stoneSide,
      palette.stoneFront,
      palette.stoneStroke
    );
  }

  const capY = layout.pillarTopY - Math.round(layout.stoneSize * 0.62);
  drawVoxelBlockAt(
    layout.leftPillarX - 1,
    capY,
    layout.pillarWidth + 2,
    8,
    4,
    blendHex(palette.stoneTop, "#ffffff", 0.18),
    blendHex(palette.stoneSide, "#12222c", 0.08),
    blendHex(palette.stoneFront, "#f1f6f9", 0.1),
    palette.stoneStroke
  );
  drawVoxelBlockAt(
    layout.rightPillarX - 1,
    capY,
    layout.pillarWidth + 2,
    8,
    4,
    blendHex(palette.stoneTop, "#ffffff", 0.18),
    blendHex(palette.stoneSide, "#12222c", 0.08),
    blendHex(palette.stoneFront, "#f1f6f9", 0.1),
    palette.stoneStroke
  );
}

function drawRomanArchStones(layout, palette) {
  const stone = layout.stoneSize;
  for (let i = 0; i < layout.archSegments; i += 1) {
    const t = i / (layout.archSegments - 1);
    const theta = Math.PI - t * Math.PI;
    const ringX = layout.archCenterX + Math.cos(theta) * layout.archRadiusX;
    const ringY = layout.archCenterY - Math.sin(theta) * layout.archRadiusY;
    const isOuter = t < 0.18 || t > 0.82;
    const isNearTop = Math.abs(t - 0.5) < 0.18;

    drawVoxelBlockAt(
      Math.round(ringX - stone * 0.5),
      Math.round(ringY - stone * 0.5),
      stone,
      9,
      4,
      isOuter ? blendHex(palette.stoneTop, "#ffffff", 0.14) : palette.stoneTop,
      isNearTop ? blendHex(palette.stoneSide, "#1d2c34", 0.03) : palette.stoneSide,
      isOuter ? blendHex(palette.stoneFront, "#ebf3f7", 0.08) : palette.stoneFront,
      palette.stoneStroke
    );
  }

  const springY = Math.round(layout.portalRect.y + stone * 0.18);
  drawVoxelBlockAt(
    layout.leftPillarX + layout.pillarWidth - 1,
    springY,
    stone,
    8,
    4,
    blendHex(palette.stoneTop, "#ffffff", 0.1),
    palette.stoneSide,
    blendHex(palette.stoneFront, "#f4f8fb", 0.07),
    palette.stoneStroke
  );
  drawVoxelBlockAt(
    layout.rightPillarX - stone + 1,
    springY,
    stone,
    8,
    4,
    blendHex(palette.stoneTop, "#ffffff", 0.1),
    palette.stoneSide,
    blendHex(palette.stoneFront, "#f4f8fb", 0.07),
    palette.stoneStroke
  );

  const keystoneSize = Math.max(stone + 2, Math.round(stone * 1.22));
  const keystoneX = Math.round(layout.archCenterX - keystoneSize * 0.5);
  const keystoneY = Math.round(layout.archCenterY - layout.archRadiusY - keystoneSize * 0.35);
  drawVoxelBlockAt(
    keystoneX,
    keystoneY,
    keystoneSize,
    10,
    5,
    blendHex(palette.stoneTop, "#fff4cd", 0.28),
    blendHex(palette.stoneSide, "#182933", 0.1),
    blendHex(palette.stoneFront, "#fff3d8", 0.22),
    palette.stoneStroke
  );
}

function drawGatewayPortal(layout, palette, phase) {
  const pulse = 0.82 + 0.18 * Math.sin(state.simClock * 2 + phase);
  const innerLeft = layout.portalRect.x + 1;
  const innerRight = layout.portalRect.x + layout.portalRect.width - 1;
  const innerBottom = layout.portalRect.y + layout.portalRect.height;
  const springY = Math.round(layout.portalRect.y + layout.archRadiusY * 0.94);
  const openingRadiusX = Math.max(5, Math.round((innerRight - innerLeft) * 0.5));
  const openingRadiusY = Math.max(8, Math.round(layout.archRadiusY * 0.92));

  ctx.beginPath();
  ctx.moveTo(innerLeft, innerBottom);
  ctx.lineTo(innerLeft, springY);
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const theta = Math.PI - t * Math.PI;
    const x = layout.archCenterX + Math.cos(theta) * openingRadiusX;
    const y = springY - Math.sin(theta) * openingRadiusY;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(innerRight, innerBottom);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  const glowGradient = ctx.createLinearGradient(innerLeft, springY - openingRadiusY, innerRight, innerBottom);
  glowGradient.addColorStop(0, hexToRgba(palette.portalBright, 0.5 * pulse));
  glowGradient.addColorStop(0.55, hexToRgba(blendHex(palette.portalBright, palette.portalDark, 0.44), 0.64 * pulse));
  glowGradient.addColorStop(1, hexToRgba(palette.portalDark, 0.74 * pulse));
  ctx.fillStyle = glowGradient;
  ctx.fillRect(innerLeft - 2, springY - openingRadiusY - 2, innerRight - innerLeft + 4, innerBottom - springY + openingRadiusY + 4);

  ctx.fillStyle = hexToRgba(palette.portalBright, 0.14 + pulse * 0.09);
  ctx.fillRect(innerLeft + 1, springY + 2, Math.max(2, innerRight - innerLeft - 2), Math.max(3, innerBottom - springY - 3));
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(innerLeft, innerBottom);
  ctx.lineTo(innerLeft, springY);
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const theta = Math.PI - t * Math.PI;
    const x = layout.archCenterX + Math.cos(theta) * openingRadiusX;
    const y = springY - Math.sin(theta) * openingRadiusY;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(innerRight, innerBottom);
  ctx.closePath();
  ctx.strokeStyle = hexToRgba(palette.portalStroke, 0.72);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const lipY = Math.round(springY - openingRadiusY - layout.stoneSize * 0.28);
  ctx.strokeStyle = hexToRgba(palette.portalStroke, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerLeft + 1, lipY);
  ctx.lineTo(innerRight - 1, lipY);
  ctx.stroke();
}

function drawMapEndpoints() {
  const map = state.map;
  if (!map) {
    return;
  }

  function drawGateway(cell, side, palette, phase) {
    const layout = getGatewayLayout(cell, side);
    drawGatewayShadow(layout, side);
    drawGatewayPillars(layout, palette);
    drawRomanArchStones(layout, palette);
    drawGatewayPortal(layout, palette, phase);
  }

  drawGateway(
    map.spawnCell,
    "left",
    {
      stoneTop: "#9db3bb",
      stoneSide: "#566c75",
      stoneFront: "#687f89",
      stoneStroke: "#dbe7ec",
      portalBright: "#76e2ff",
      portalDark: "#338eca",
      portalStroke: "#b8ecff"
    },
    0.25
  );
  drawGateway(
    map.goalCell,
    "right",
    {
      stoneTop: "#b6a58e",
      stoneSide: "#6f5b43",
      stoneFront: "#836c50",
      stoneStroke: "#efe1ce",
      portalBright: "#ffbf7c",
      portalDark: "#d67243",
      portalStroke: "#ffe1be"
    },
    1.4
  );
}

function drawOrientedBarrel(baseX, baseY, angle, length, width, fillStyle, strokeStyle) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const perpX = -dirY;
  const perpY = dirX;
  const tipX = baseX + dirX * length;
  const tipY = baseY + dirY * length;

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(baseX + perpX * width, baseY + perpY * width);
  ctx.lineTo(baseX - perpX * width, baseY - perpY * width);
  ctx.lineTo(tipX - perpX * width, tipY - perpY * width);
  ctx.lineTo(tipX + perpX * width, tipY + perpY * width);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFrostCrystal(cx, cy, angle, size, fillStyle, strokeStyle) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const perpX = -dirY;
  const perpY = dirX;

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(cx + dirX * size, cy + dirY * size);
  ctx.lineTo(cx + perpX * size * 0.58, cy + perpY * size * 0.58);
  ctx.lineTo(cx - dirX * size, cy - dirY * size);
  ctx.lineTo(cx - perpX * size * 0.58, cy - perpY * size * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawRoundedRectPath(x, y, width, height, radius) {
  const r = clamp(radius, 0, Math.min(width, height) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawRoundedBar(x, y, width, height, radius, fillStyle, strokeStyle = null) {
  drawRoundedRectPath(x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawVoxelRectAt(topX, topY, width, height, depth, topColor, sideColor, frontColor, strokeColor, showStroke = true) {
  const safeDepth = Math.max(1, depth);
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(topX + width, topY);
  ctx.lineTo(topX + width + safeDepth, topY + safeDepth);
  ctx.lineTo(topX + width + safeDepth, topY + height + safeDepth);
  ctx.lineTo(topX + width, topY + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = frontColor;
  ctx.beginPath();
  ctx.moveTo(topX, topY + height);
  ctx.lineTo(topX + width, topY + height);
  ctx.lineTo(topX + width + safeDepth, topY + height + safeDepth);
  ctx.lineTo(topX + safeDepth, topY + height + safeDepth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = topColor;
  ctx.fillRect(topX, topY, width, height);

  if (showStroke && strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(topX, topY, width, height);
  }
}

function drawVoxelPlate(cx, cy, width, height, palette, opts = {}) {
  const depth = opts.depth || 3;
  const lift = opts.lift || 0;
  drawVoxelRectAt(
    cx - width * 0.5,
    cy - height * 0.5 - lift,
    width,
    height,
    depth,
    palette.top,
    palette.side,
    palette.front,
    palette.stroke
  );
}

function drawVoxelPrism(cx, cy, width, height, angle, fillStyle, strokeStyle) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const perpX = -dirY;
  const perpY = dirX;
  const tipX = cx + dirX * height;
  const tipY = cy + dirY * height;
  const baseX = cx - dirX * height * 0.52;
  const baseY = cy - dirY * height * 0.52;
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX + perpX * width * 0.55, baseY + perpY * width * 0.55);
  ctx.lineTo(baseX - perpX * width * 0.55, baseY - perpY * width * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawVoxelAntenna(baseX, baseY, height, leanAngle, tipRadius, shaftColor, tipColor, strokeColor) {
  const endX = baseX + Math.cos(leanAngle) * height;
  const endY = baseY + Math.sin(leanAngle) * height;
  ctx.strokeStyle = shaftColor;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.arc(endX, endY, tipRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

function drawVoxelTank(cx, cy, width, height, fillRatio, palette) {
  drawVoxelPlate(cx, cy, width, height, palette, { depth: 3, lift: 0 });
  const safeFill = clamp(fillRatio, 0, 1);
  const topX = cx - width * 0.5 + 3;
  const topY = cy - height * 0.5 + 3 + (1 - safeFill) * (height - 6);
  const fillHeight = Math.max(2, (height - 6) * safeFill);
  ctx.fillStyle = hexToRgba(palette.accent, 0.8);
  ctx.fillRect(topX, topY, width - 6, fillHeight);
  ctx.strokeStyle = hexToRgba(palette.stroke, 0.6);
  ctx.lineWidth = 0.9;
  ctx.strokeRect(topX, topY, width - 6, fillHeight);
}

function drawVoxelBanner(x, y, width, height, primary, trim) {
  drawVoxelRectAt(x, y, width, height, 2, primary, blendHex(primary, "#000000", 0.32), blendHex(primary, "#ffffff", 0.16), trim);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.5, y + 2);
  ctx.lineTo(x + width * 0.5, y + height - 2);
  ctx.stroke();
}

function drawVoxelShoulderGuard(cx, cy, size, palette, side = 1) {
  drawVoxelPlate(
    cx + side * size * 0.62,
    cy - size * 0.08,
    size,
    Math.max(6, size * 0.58),
    {
      top: blendHex(palette.top, "#f6ffff", 0.11),
      side: palette.side,
      front: palette.front,
      stroke: palette.stroke
    },
    { depth: 2.5 }
  );
}

function drawVoxelChassis(cx, cy, width, height, palette, opts = {}) {
  const depth = opts.depth || 4;
  drawVoxelRectAt(
    cx - width * 0.5,
    cy - height * 0.5,
    width,
    height,
    depth,
    palette.top,
    palette.side,
    palette.front,
    palette.stroke
  );
  if (opts.accentStrip) {
    ctx.fillStyle = hexToRgba(palette.accent || palette.stroke, 0.72);
    ctx.fillRect(cx - width * 0.24, cy - height * 0.5 + 2, width * 0.48, 3);
  }
}

function drawStatusRim(x, y, radius, kind, strength = 1) {
  const alpha = clamp(strength, 0.1, 1);
  if (kind === "freeze") {
    ctx.strokeStyle = `rgba(214, 247, 255, ${0.65 * alpha})`;
    ctx.lineWidth = 1.5;
  } else if (kind === "shock") {
    ctx.strokeStyle = `rgba(184, 232, 255, ${0.7 * alpha})`;
    ctx.lineWidth = 1.8;
  } else {
    ctx.strokeStyle = `rgba(255, 222, 153, ${0.58 * alpha})`;
    ctx.lineWidth = 1.6;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTowerByType(tower, type, mountX, mountY, t, tierStage, footprint) {
  const accent = type.accentColor || type.colors.accent;
  const palette = {
    top: type.colors.top,
    side: type.colors.side,
    front: type.colors.front,
    stroke: type.colors.stroke,
    accent
  };

  if (tower.typeId === "cannon") {
    drawVoxelChassis(mountX, mountY - 2, 19, 13, palette, { accentStrip: true });
    drawVoxelPlate(mountX, mountY - 10, 12, 7, palette, { depth: 2 });
    if (tierStage >= 1) {
      drawVoxelShoulderGuard(mountX, mountY - 8, 9, palette, -1);
      drawVoxelShoulderGuard(mountX, mountY - 8, 9, palette, 1);
    }
    if (tierStage >= 2) {
      drawVoxelPlate(mountX, mountY - 15, 10, 5, { ...palette, top: blendHex(palette.top, "#ffffff", 0.2) }, { depth: 2 });
    }
    const barrelLength = Math.max(10, tower.muzzleLength + tierStage * 1.8 - tower.recoil * 7);
    drawOrientedBarrel(mountX, mountY - 9, tower.aimAngle, barrelLength, 3.4 + tierStage * 0.2, "#70bde6", "#14314b");
  } else if (tower.typeId === "frost") {
    drawVoxelChassis(mountX, mountY - 1, 16, 13, palette, { accentStrip: true });
    const spin = tower.aimAngle + Math.sin(t * 4.1) * 0.28;
    drawVoxelPrism(mountX, mountY - 14, 8, 11, spin, "#a7f2ff", "#2b7f9b");
    if (tierStage >= 1) {
      drawVoxelPrism(mountX - 8, mountY - 10, 5, 8, spin + 0.6, "#83e2ff", "#2b7f9b");
      drawVoxelPrism(mountX + 8, mountY - 10, 5, 8, spin - 0.6, "#83e2ff", "#2b7f9b");
    }
    if (tierStage >= 2) {
      drawFrostCrystal(mountX, mountY - 21, spin, 7 + Math.sin(t * 5.2) * 1.1, "#d7fbff", "#2f90ae");
    }
    drawOrientedBarrel(mountX, mountY - 11, tower.aimAngle, tower.muzzleLength - 1 + tierStage, 2.2, "#c8fbff", "#2a728c");
  } else if (tower.typeId === "mortar") {
    drawVoxelChassis(mountX, mountY - 1, 24, 14, palette, { accentStrip: true });
    const recoilLift = tower.recoil * 3.4;
    drawVoxelPlate(mountX, mountY - 9, 20, 8, { ...palette, top: blendHex(palette.top, "#ffffff", 0.08) }, { depth: 3 });
    ctx.fillStyle = "#2d1b0f";
    ctx.strokeStyle = "#c8ad8f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(mountX, mountY - 11 - recoilLift, 9.6, 5.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (tierStage >= 1) {
      drawVoxelPlate(mountX - 13, mountY + 2, 6, 4, palette, { depth: 2 });
      drawVoxelPlate(mountX + 13, mountY + 2, 6, 4, palette, { depth: 2 });
    }
    if (tierStage >= 2) {
      drawVoxelPlate(mountX, mountY - 15, 14, 4, { ...palette, top: blendHex(palette.top, "#fff6df", 0.16) }, { depth: 2 });
    }
    drawOrientedBarrel(mountX, mountY - 12 - recoilLift, tower.aimAngle, tower.muzzleLength - tower.recoil * 5, 2.7, "#5d3a20", "#1f130a");
  } else if (tower.typeId === "tesla") {
    const pulse = 0.72 + tower.energyPulse * 0.48 + Math.sin(t * 6.1) * 0.09;
    drawVoxelChassis(mountX, mountY - 1, 18, 13, palette, { accentStrip: true });
    drawVoxelAntenna(mountX, mountY - 6, 13 + tierStage * 2, -Math.PI * 0.5 + Math.sin(t * 2.8) * 0.05, 2.6, "#91bae8", "#ccedff", "#eaf5ff");
    drawVoxelPlate(mountX - 8, mountY - 7, 5, 7, palette, { depth: 2 });
    drawVoxelPlate(mountX + 8, mountY - 7, 5, 7, palette, { depth: 2 });
    if (tierStage >= 1) {
      drawVoxelPlate(mountX - 12, mountY - 2, 5, 5, palette, { depth: 2 });
      drawVoxelPlate(mountX + 12, mountY - 2, 5, 5, palette, { depth: 2 });
    }
    if (tierStage >= 2) {
      for (let i = 0; i < 4; i += 1) {
        const a = t * 2.2 + (Math.PI * 2 * i) / 4;
        const nx = mountX + Math.cos(a) * (10 + pulse * 2.2);
        const ny = mountY - 17 + Math.sin(a) * (6 + pulse * 1.4);
        ctx.fillStyle = "rgba(198, 236, 255, 0.92)";
        ctx.fillRect(nx - 1.4, ny - 1.4, 2.8, 2.8);
      }
    }
    drawOrientedBarrel(mountX, mountY - 15, tower.aimAngle, tower.muzzleLength - 2, 2.2, "#d8eeff", "#4b78a2");
  } else if (tower.typeId === "slime") {
    const fillRatio = 0.54 + Math.sin(t * 4.2) * 0.18;
    drawVoxelChassis(mountX, mountY - 1, 18, 13, palette, { accentStrip: true });
    drawVoxelTank(mountX, mountY - 9, 14, 10, fillRatio, palette);
    if (tierStage >= 1) {
      drawVoxelTank(mountX + 10, mountY - 6, 9, 8, 0.45 + Math.sin(t * 3.3) * 0.1, palette);
    }
    if (tierStage >= 2) {
      ctx.fillStyle = "rgba(175, 255, 126, 0.78)";
      for (let i = 0; i < 3; i += 1) {
        const dx = (i - 1) * 5;
        const dropY = mountY + 2 + Math.sin(t * 3.2 + i) * 2.2;
        ctx.beginPath();
        ctx.arc(mountX + dx, dropY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawOrientedBarrel(mountX, mountY - 3, tower.aimAngle, tower.muzzleLength - 2, 2.5, "#c6ff78", "#456c2c");
  } else if (tower.typeId === "flame") {
    const heat = clamp((tower.barrelHeat || 0) + Math.sin(t * 7.2) * 0.08, 0, 1.2);
    drawVoxelChassis(mountX, mountY - 1, 20, 14, palette, { accentStrip: true });
    drawVoxelTank(mountX - 8, mountY - 7, 8 + tierStage * 1.5, 8, 0.72, palette);
    drawVoxelTank(mountX + 8, mountY - 7, 8 + tierStage * 1.5, 8, 0.72, palette);
    if (tierStage >= 2) {
      drawVoxelPlate(mountX, mountY - 12, 16, 4, { ...palette, top: blendHex(palette.top, "#fff2ce", 0.16) }, { depth: 2 });
    }
    drawOrientedBarrel(mountX, mountY - 4, tower.aimAngle, tower.muzzleLength - 1, 3.1 + tierStage * 0.1, "#ff9348", "#5f2715");
    if (heat > 0.01) {
      ctx.fillStyle = `rgba(255, 204, 134, ${0.22 + heat * 0.26})`;
      ctx.beginPath();
      ctx.arc(mountX, mountY - 10, 4 + heat * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tower.typeId === "barracks") {
    drawVoxelRectAt(mountX - 14, mountY - 12, 28, 20, 4, "#65412a", "#3a2416", "#4a301d", "#d4b189");
    drawVoxelPlate(mountX, mountY - 5, 14, 9, { top: "#d8b48d", side: "#7b5538", front: "#8f6645", stroke: "#f7ddbf" }, { depth: 2 });
    ctx.fillStyle = "#2f180f";
    ctx.fillRect(mountX - 5, mountY - 4, 10, 4);
    if (tierStage >= 1) {
      drawVoxelRectAt(mountX + 8, mountY - 20, 8, 8, 3, "#7a5238", "#483020", "#5a3d2a", "#e3c8a9");
      drawVoxelBanner(mountX + 12, mountY - 14, 5, 8, "#3a5f9f", "#d9e7ff");
    }
    if (tierStage >= 2) {
      for (let i = -1; i <= 1; i += 1) {
        drawVoxelPlate(mountX + i * 8, mountY - 14, 6, 4, { top: "#9b7558", side: "#5b402d", front: "#6c4f37", stroke: "#e8d2bc" }, { depth: 2 });
      }
    }
  } else if (tower.typeId === "defender") {
    const dir = getRotationVector(tower.rotation || 0);
    const gateOffset = (footprint || 2) * TILE_STEP * 0.42;
    const gateX = tower.x + dir.dc * gateOffset;
    const gateY = tower.y + dir.dr * gateOffset - 4;
    drawVoxelRectAt(mountX - 16, mountY - 16, 32, 24, 5, "#6a4a8e", "#3f2c59", "#50386f", "#e5d8f7");
    drawVoxelRectAt(mountX - 11, mountY - 11, 22, 14, 4, "#ccb2e7", "#735994", "#8c6bae", "#f1e7ff");
    drawVoxelRectAt(gateX - 7, gateY - 5, 14, 10, 3, "#203a60", "#182e4b", "#1e3b60", "#9dc1ef");
    drawVoxelPlate(gateX, gateY - 6, 10, 4, { top: "#adc5eb", side: "#35557d", front: "#4b6e98", stroke: "#e6f2ff" }, { depth: 2 });
    if (tierStage >= 1) {
      drawVoxelShoulderGuard(mountX, mountY - 13, 10, { top: "#ceb6ec", side: "#5c437d", front: "#755597", stroke: "#f2e8ff" }, -1);
      drawVoxelShoulderGuard(mountX, mountY - 13, 10, { top: "#ceb6ec", side: "#5c437d", front: "#755597", stroke: "#f2e8ff" }, 1);
    }
    if (tierStage >= 2) {
      ctx.fillStyle = "rgba(195, 225, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(mountX, mountY - 19, 4, 0, Math.PI * 2);
      ctx.fill();
      drawVoxelAntenna(mountX, mountY - 16, 7, -Math.PI * 0.5, 1.8, "#9ec1ea", "#ebf6ff", "#f4fbff");
    }
  }
}

function drawTower(tower) {
  const type = TOWER_TYPE_BY_ID[tower.typeId] || TOWER_TYPES[0];
  const t = state.simClock + tower.animPhase;
  const footprint = getTowerFootprint(tower);
  const bobScale = footprint > 1 ? 0.62 : 0.48;
  const bob = Math.sin(t * 2.3) * (footprint > 1 ? 1.8 : 1.3);
  const size = footprint > 1 ? 56 : 30;
  const topX = tower.x - size * 0.5;
  const topY = tower.y - size * 0.5 - 4 + bob * 0.15;
  const mountX = tower.x + Math.sin(t * 1.8) * 0.25;
  const mountY = tower.y - (footprint > 1 ? 22 : 18) + bob * bobScale;
  const tierStage = Number.isFinite(tower.tierVisualStage) ? tower.tierVisualStage : clamp(tower.tier || 0, 0, 2);

  drawVoxelBlockAt(
    topX,
    topY,
    size,
    footprint > 1 ? 12 : 10,
    footprint > 1 ? 9 : 8,
    type.colors.top,
    type.colors.side,
    type.colors.front,
    type.colors.stroke
  );

  drawTowerByType(tower, type, mountX, mountY, t, tierStage, footprint);

  const tierPips = tower.tier + 1;
  for (let i = 0; i < tierPips; i += 1) {
    ctx.fillStyle = "#ffe8a8";
    ctx.fillRect(tower.x - 12 + i * 8, tower.y + (footprint > 1 ? 22 : 12), 5, 5);
  }

  if (tower.id === state.selectedPlacedTowerId) {
    ctx.strokeStyle = "#ffe7a8";
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 4, footprint > 1 ? 36 : 24, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function hexToRgb(hexColor) {
  if (!hexColor || typeof hexColor !== "string") {
    return null;
  }
  const normalized = hexColor.startsWith("#") ? hexColor.slice(1) : hexColor;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function hexToRgba(hexColor, alpha) {
  const rgb = hexToRgb(hexColor);
  const clampedAlpha = clamp(alpha, 0, 1);
  if (!rgb) {
    return `rgba(255, 255, 255, ${clampedAlpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

function blendHex(colorA, colorB, amount) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) {
    return colorA || colorB || "#ffffff";
  }
  const t = clamp(amount, 0, 1);
  const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
  const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
  const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getEnemyMotionProfile(enemy) {
  const profileId = enemy.motionProfile || "steady";
  if (profileId === "sprinter_stride") {
    return { bob: 1.8, sway: 1.8, strideRate: 0.34, swayRate: 6.2, tilt: 2.6 };
  }
  if (profileId === "bulwark_stomp") {
    return { bob: 0.9, sway: 0.45, strideRate: 0.18, swayRate: 2.2, tilt: 1.4 };
  }
  if (profileId === "glacial_shimmer") {
    return { bob: 1.0, sway: 0.65, strideRate: 0.2, swayRate: 3.1, tilt: 1.6 };
  }
  if (profileId === "capacitor_pulse") {
    return { bob: 1.1, sway: 0.8, strideRate: 0.24, swayRate: 4.6, tilt: 1.8 };
  }
  if (profileId === "giant_heavy") {
    return { bob: 2.5, sway: 0.52, strideRate: 0.15, swayRate: 1.8, tilt: 1.2 };
  }
  return { bob: 1.2, sway: 1, strideRate: 0.25, swayRate: 3.8, tilt: 2 };
}

function drawEnemyBodyByType(enemy, palette, renderState) {
  const { x, y, size, isLarge, bob } = renderState;
  const bodyPalette = {
    top: palette.top,
    side: palette.side,
    front: palette.front,
    stroke: palette.stroke,
    accent: enemy.accentColor || palette.stroke
  };
  if (enemy.typeId === "sprinter") {
    drawVoxelChassis(x, y - 4 + bob * 0.2, size * 0.78, size * 0.48, bodyPalette, { accentStrip: true, depth: isLarge ? 4 : 3 });
    drawVoxelPrism(x + size * 0.2, y - 8, size * 0.28, size * 0.36, 0, blendHex(palette.top, "#fff3e4", 0.08), palette.stroke);
    drawVoxelPlate(x - size * 0.26, y + 2, size * 0.2, size * 0.18, bodyPalette, { depth: 2 });
    return;
  }
  if (enemy.typeId === "bulwark") {
    drawVoxelChassis(x, y - 5 + bob * 0.15, size * 0.94, size * 0.64, bodyPalette, { accentStrip: true, depth: isLarge ? 5 : 4 });
    drawVoxelPlate(
      x + size * 0.18,
      y - 1,
      size * 0.44,
      size * 0.34,
      { ...bodyPalette, top: blendHex(bodyPalette.top, "#fff2e8", 0.06) },
      { depth: 3 }
    );
    drawVoxelShoulderGuard(x - size * 0.04, y - 8, Math.max(8, size * 0.33), bodyPalette, -1);
    drawVoxelShoulderGuard(x - size * 0.04, y - 8, Math.max(8, size * 0.33), bodyPalette, 1);
    return;
  }
  if (enemy.typeId === "glacial") {
    drawVoxelChassis(x, y - 4 + bob * 0.16, size * 0.86, size * 0.54, bodyPalette, { accentStrip: true, depth: isLarge ? 4 : 3 });
    drawVoxelPrism(x, y - size * 0.46, size * 0.24, size * 0.42, -Math.PI * 0.5, "#cbf6ff", "#62a2ca");
    drawVoxelPrism(x - size * 0.24, y - size * 0.36, size * 0.18, size * 0.28, -Math.PI * 0.55, "#a6e9ff", "#62a2ca");
    drawVoxelPrism(x + size * 0.24, y - size * 0.36, size * 0.18, size * 0.28, -Math.PI * 0.45, "#a6e9ff", "#62a2ca");
    return;
  }
  if (enemy.typeId === "capacitor") {
    drawVoxelChassis(x, y - 4 + bob * 0.18, size * 0.84, size * 0.56, bodyPalette, { accentStrip: true, depth: isLarge ? 4 : 3 });
    drawVoxelTank(x - size * 0.22, y - 6, size * 0.24, size * 0.26, 0.7, bodyPalette);
    drawVoxelTank(x + size * 0.22, y - 6, size * 0.24, size * 0.26, 0.7, bodyPalette);
    drawVoxelAntenna(x, y - size * 0.22, size * 0.3, -Math.PI * 0.5, 2, "#b8c4eb", "#e8f1ff", "#f6f8ff");
    return;
  }
  if (enemy.typeId === "giant") {
    drawVoxelChassis(x, y - 8 + bob * 0.16, size * 0.96, size * 0.74, bodyPalette, { accentStrip: true, depth: 6 });
    drawVoxelShoulderGuard(x, y - 10, size * 0.34, bodyPalette, -1);
    drawVoxelShoulderGuard(x, y - 10, size * 0.34, bodyPalette, 1);
    drawVoxelPlate(x, y - size * 0.2, size * 0.35, size * 0.26, { ...bodyPalette, top: blendHex(bodyPalette.top, "#ffe8d8", 0.09) }, { depth: 3 });
    drawVoxelPlate(x, y - size * 0.44, size * 0.24, size * 0.2, bodyPalette, { depth: 2 });
    ctx.fillStyle = "rgba(164, 111, 96, 0.4)";
    const stomp = Math.max(0, Math.sin((enemy.stridePhase || 0) * 0.34));
    if (stomp > 0.68) {
      ctx.beginPath();
      ctx.arc(x - size * 0.2, y + size * 0.34, 4 + stomp * 3, 0, Math.PI * 2);
      ctx.arc(x + size * 0.2, y + size * 0.34, 4 + stomp * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  drawVoxelChassis(x, y - 4 + bob * 0.2, size * 0.86, size * 0.58, bodyPalette, { accentStrip: true, depth: isLarge ? 5 : 4 });
  drawVoxelShoulderGuard(x + size * 0.05, y - 8, Math.max(8, size * 0.28), bodyPalette, 1);
  drawVoxelPrism(x + size * 0.32, y - 4, size * 0.16, size * 0.22, 0, blendHex(palette.top, "#ffdfd9", 0.12), palette.stroke);
}

function drawEnemyBars(enemy, renderState) {
  const isLarge = renderState.isLarge;
  const hpRatio = clamp(enemy.hp / Math.max(1, enemy.maxHp), 0, 1);
  const barWidth = isLarge ? 66 : 38;
  const barHeight = isLarge ? 5.8 : 5;
  const barX = renderState.x - barWidth * 0.5;
  const barY = renderState.y - (isLarge ? 50 : 34);
  drawRoundedBar(barX, barY, barWidth, barHeight, 2, "#1e2633", "#4a5a75");
  drawRoundedBar(
    barX + 1,
    barY + 1,
    Math.max(0, (barWidth - 2) * hpRatio),
    Math.max(1, barHeight - 2),
    1.5,
    hpRatio > 0.5 ? "#63df74" : hpRatio > 0.25 ? "#ffd96a" : "#ff6f63"
  );
  if (enemy.shieldMax > 0) {
    const shieldRatio = clamp(enemy.shield / Math.max(1, enemy.shieldMax), 0, 1);
    drawRoundedBar(barX, barY - 6, barWidth, 3.8, 1.6, "#1c2440", "#58668b");
    drawRoundedBar(barX + 1, barY - 5, Math.max(0, (barWidth - 2) * shieldRatio), 1.8, 1, "#8de3ff");
  }
}

function drawEnemy(enemy) {
  const slowed = enemy.slowMultiplier < 0.99;
  const shocked = enemy.shockTimer > 0;
  const frozen = (enemy.freezeTimer || 0) > 0;
  const stunned = (enemy.stunTimer || 0) > 0;
  const dashing = enemy.burstTimer > 0;
  const footprint = enemy.footprint || SMALL_ENEMY_FOOTPRINT;
  const isLarge = footprint > SMALL_ENEMY_FOOTPRINT;
  const palette = enemy.palette || { top: "#d95f61", side: "#7a262a", front: "#932f34", stroke: "#ffd6d6" };

  let topColor = palette.top;
  let sideColor = palette.side;
  let frontColor = palette.front;
  let strokeColor = palette.stroke;

  if (slowed) {
    topColor = blendHex(topColor, "#8fd9ff", 0.38);
    sideColor = blendHex(sideColor, "#4c96be", 0.42);
    frontColor = blendHex(frontColor, "#62abd5", 0.42);
    strokeColor = blendHex(strokeColor, "#e8f8ff", 0.55);
  }
  if (shocked) {
    topColor = blendHex(topColor, "#d0c9ff", 0.34);
    sideColor = blendHex(sideColor, "#6751bc", 0.36);
    frontColor = blendHex(frontColor, "#7f66d3", 0.36);
    strokeColor = blendHex(strokeColor, "#f6f1ff", 0.6);
  }
  if (frozen) {
    topColor = blendHex(topColor, "#cdeeff", 0.54);
    sideColor = blendHex(sideColor, "#5799bd", 0.52);
    frontColor = blendHex(frontColor, "#75bbde", 0.52);
    strokeColor = blendHex(strokeColor, "#f2fbff", 0.78);
  }
  if (stunned) {
    topColor = blendHex(topColor, "#ffd38d", 0.26);
    sideColor = blendHex(sideColor, "#99602f", 0.28);
    frontColor = blendHex(frontColor, "#b87a45", 0.28);
  }
  if ((enemy.hitFlash || 0) > 0.01) {
    topColor = blendHex(topColor, "#fff8ee", enemy.hitFlash * 0.36);
    strokeColor = blendHex(strokeColor, "#ffffff", enemy.hitFlash * 0.45);
  }

  const size = (enemy.radius * 2 + (isLarge ? 12 : 5)) * (enemy.visualScale || 1);
  const motion = getEnemyMotionProfile(enemy);
  const t = state.simClock + (enemy.animSeed || 0);
  const stridePhase = (enemy.stridePhase || 0) * motion.strideRate + t * motion.strideRate;
  const bob = Math.sin(stridePhase) * motion.bob;
  const sway = Math.sin(t * motion.swayRate + (enemy.animSeed || 0)) * motion.sway + (enemy.motionTilt || 0) * motion.tilt;
  const renderState = {
    x: enemy.x + sway,
    y: enemy.y + bob,
    size,
    isLarge,
    bob
  };

  drawEnemyBodyByType(
    enemy,
    {
      top: topColor,
      side: sideColor,
      front: frontColor,
      stroke: strokeColor
    },
    renderState
  );
  drawEnemyBars(enemy, renderState);

  if (dashing) {
    ctx.strokeStyle = "rgba(255, 234, 186, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const dashOffset = isLarge ? 24 : 15;
    const dashTip = isLarge ? 36 : 23;
    ctx.moveTo(renderState.x - dashOffset, renderState.y + 9);
    ctx.lineTo(renderState.x - dashTip, renderState.y + 4);
    ctx.moveTo(renderState.x + dashOffset, renderState.y + 9);
    ctx.lineTo(renderState.x + dashTip, renderState.y + 4);
    ctx.stroke();
  }

  if (shocked) {
    ctx.strokeStyle = "#c0f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(renderState.x - 10, renderState.y - 17);
    ctx.lineTo(renderState.x - 3, renderState.y - 25);
    ctx.lineTo(renderState.x + 3, renderState.y - 20);
    ctx.lineTo(renderState.x + 10, renderState.y - 29);
    ctx.stroke();
    drawStatusRim(renderState.x, renderState.y - (isLarge ? 1 : 0), enemy.radius + 6, "shock", 0.84);
  }

  if (frozen) {
    drawStatusRim(renderState.x, renderState.y - (isLarge ? 2 : 0), enemy.radius + 5, "freeze", 0.95);
  }

  if (stunned) {
    drawStatusRim(renderState.x, renderState.y - (isLarge ? 2 : 0), enemy.radius + 3.5, "stun", 0.78);
  }

  if (ENEMY_LABEL_MODE !== "off") {
    ctx.fillStyle = "#f8fbff";
    ctx.font = isLarge ? "700 12px Trebuchet MS" : "700 10px Trebuchet MS";
    ctx.fillText(enemy.typeShort || "E", renderState.x - (isLarge ? 8 : 4), renderState.y - (isLarge ? 10 : 8));
  }
}

function drawDefenderUnit(defender) {
  if (defender.dead) {
    return;
  }
  const isGuardian = defender.kind === "guardian";
  const t = state.simClock + defender.id * 0.13;
  const swing = defender.swingTimer > 0 ? defender.swingTimer : 0;
  const bob = Math.sin(t * (isGuardian ? 2 : 3.2)) * (isGuardian ? 1.4 : 0.9);
  const bodyX = defender.x;
  const bodyY = defender.y + bob;
  const top = isGuardian ? blendHex("#d2b2ea", "#f7deff", swing * 0.24) : blendHex("#b5d5ff", "#f0fbff", swing * 0.28);
  const side = isGuardian ? blendHex("#56397a", "#6c4a96", swing * 0.22) : blendHex("#3a6a98", "#497cac", swing * 0.24);
  const front = isGuardian ? blendHex("#6e4f95", "#8561b2", swing * 0.22) : blendHex("#4a84bd", "#5f98ce", swing * 0.24);
  const stroke = isGuardian ? "#f2e5ff" : "#e3f0ff";
  const palette = { top, side, front, stroke, accent: isGuardian ? "#e5ceff" : "#d5ecff" };

  if (isGuardian) {
    drawVoxelChassis(bodyX, bodyY - 8, 36, 26, palette, { accentStrip: true, depth: 6 });
    drawVoxelShoulderGuard(bodyX - 2, bodyY - 10, 13, palette, -1);
    drawVoxelShoulderGuard(bodyX - 2, bodyY - 10, 13, palette, 1);
    drawVoxelPlate(bodyX, bodyY - 23, 13, 7, palette, { depth: 3 });
    if (swing > 0.01) {
      ctx.strokeStyle = `rgba(221, 234, 255, ${0.35 + swing * 0.35})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bodyX, bodyY - 2, 16 + swing * 5, -0.6, 0.8);
      ctx.stroke();
    }
  } else {
    drawVoxelChassis(bodyX, bodyY - 3, 19, 15, palette, { accentStrip: true, depth: 4 });
    drawVoxelShoulderGuard(bodyX - 1, bodyY - 5, 8, palette, -1);
    drawVoxelPlate(bodyX + 6, bodyY - 4, 8, 8, palette, { depth: 2 });
    if (swing > 0.01) {
      ctx.strokeStyle = `rgba(228, 243, 255, ${0.35 + swing * 0.4})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(bodyX + 7, bodyY - 6, 8 + swing * 3, -0.8, 0.5);
      ctx.stroke();
    }
  }

  const hpRatio = clamp(defender.hp / Math.max(1, defender.maxHp), 0, 1);
  const barWidth = isGuardian ? 64 : 38;
  const barX = bodyX - barWidth * 0.5;
  const barY = bodyY - (isGuardian ? 46 : 30);
  drawRoundedBar(barX, barY, barWidth, 5, 2, "#1f2533", "#576885");
  drawRoundedBar(barX + 1, barY + 1, Math.max(0, (barWidth - 2) * hpRatio), 3, 1.2, hpRatio > 0.5 ? "#61e171" : hpRatio > 0.25 ? "#ffd068" : "#ff6f61");
}

function drawDefenders() {
  for (const defender of state.defenders) {
    drawDefenderUnit(defender);
  }
}

function drawProjectilesAndEffects() {
  for (const projectile of state.projectiles) {
    if (projectile.kind === "mortar") {
      ctx.fillStyle = "#ffb26b";
    } else if (projectile.kind === "frost") {
      ctx.fillStyle = "#80e9ff";
    } else if (projectile.kind === "slime") {
      ctx.fillStyle = "#98ea57";
    } else {
      ctx.fillStyle = "#ffd96f";
    }

    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const shot of state.shotFx) {
    const alpha = Math.max(0, shot.ttl / 0.09);
    const tint =
      shot.kind === "frost"
        ? `rgba(122, 241, 255, ${alpha})`
        : shot.kind === "slime"
          ? `rgba(178, 255, 104, ${alpha})`
          : shot.kind === "flame_beam"
            ? `rgba(255, 171, 92, ${alpha})`
        : shot.kind === "mortar"
          ? `rgba(255, 187, 112, ${alpha})`
          : `rgba(255, 220, 122, ${alpha})`;

    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 9 + (1 - alpha) * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const blast of state.explosionFx) {
    const alpha = Math.max(0, blast.ttl / 0.22);
    ctx.strokeStyle = `rgba(255, 200, 120, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.radius * (1 - alpha * 0.75), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const bolt of state.lightningFx) {
    const alpha = Math.max(0, bolt.ttl / 0.12);
    const midX = (bolt.x1 + bolt.x2) * 0.5 + Math.sin((bolt.ttl / 0.12) * 18) * 9;
    const midY = (bolt.y1 + bolt.y2) * 0.5 + Math.cos((bolt.ttl / 0.12) * 14) * 7;

    ctx.strokeStyle = `rgba(158, 234, 255, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bolt.x1, bolt.y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(bolt.x2, bolt.y2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(235, 249, 255, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bolt.x1, bolt.y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(bolt.x2, bolt.y2);
    ctx.stroke();
  }

  for (const tower of state.towers) {
    if (tower.projectileKind !== "flame_beam" || tower.beamTimer <= 0) {
      continue;
    }
    const muzzle = getTowerMuzzlePosition(tower);
    const endX = tower.beamEndX || muzzle.x;
    const endY = tower.beamEndY || muzzle.y;
    const alpha = clamp(0.55 + tower.beamTimer / Math.max(0.001, tower.beamDuration) * 0.25, 0.45, 0.9);

    ctx.strokeStyle = `rgba(255, 120, 45, ${alpha})`;
    ctx.lineWidth = tower.beamWidth * 1.8;
    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 232, 165, ${alpha})`;
    ctx.lineWidth = tower.beamWidth * 0.72;
    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}

function drawTowerGlyph(towerType, x, y, size, selected) {
  const tone = selected ? 0.22 : 0.08;
  const body = blendHex(towerType.colors.top, "#ffffff", tone);
  const dark = blendHex(towerType.colors.side, "#0b1624", 0.22);
  const accent = towerType.accentColor || towerType.colors.accent;
  drawVoxelRectAt(x - size * 0.5, y - size * 0.36, size, size * 0.62, 2, body, dark, towerType.colors.front, towerType.colors.stroke, true);
  if (towerType.id === "cannon") {
    drawOrientedBarrel(x, y - 2, -0.25, size * 0.74, 1.8, accent, dark);
  } else if (towerType.id === "frost") {
    drawVoxelPrism(x, y - size * 0.52, size * 0.2, size * 0.42, -Math.PI * 0.5, "#caf8ff", "#5f93ad");
  } else if (towerType.id === "mortar") {
    drawVoxelPlate(x, y - size * 0.16, size * 0.66, size * 0.3, { top: accent, side: dark, front: towerType.colors.front, stroke: towerType.colors.stroke }, { depth: 2 });
  } else if (towerType.id === "tesla") {
    drawVoxelAntenna(x, y - size * 0.22, size * 0.42, -Math.PI * 0.5, 1.6, "#9ebce1", "#dff2ff", "#edf6ff");
  } else if (towerType.id === "slime") {
    drawVoxelTank(x, y - size * 0.12, size * 0.6, size * 0.45, 0.72, { top: body, side: dark, front: towerType.colors.front, stroke: towerType.colors.stroke, accent });
  } else if (towerType.id === "flame") {
    drawOrientedBarrel(x, y - 1, -0.25, size * 0.7, 2.1, "#ffac68", "#5f2715");
  } else if (towerType.id === "barracks") {
    drawVoxelBanner(x + size * 0.12, y - size * 0.42, size * 0.22, size * 0.34, "#3b5f95", "#dbe8ff");
  } else if (towerType.id === "defender") {
    drawVoxelPlate(x, y - size * 0.34, size * 0.5, size * 0.24, { top: "#b9d1f0", side: "#3a5578", front: "#4b6e95", stroke: "#ebf4ff" }, { depth: 2 });
  }
}

function drawTierMiniProgress(type, tier, x, y) {
  const stage = clamp(tier || 0, 0, 2);
  for (let i = 0; i < 3; i += 1) {
    const active = i <= stage;
    const w = active ? 16 : 12;
    const h = active ? 7 : 5;
    const px = x + i * 19;
    const py = y - (active ? 2 : 0);
    const fill = active ? blendHex(type.colors.top, "#fff3cf", 0.2) : "#2a3c56";
    const stroke = active ? "#f4dfa2" : "#5e7599";
    drawRoundedBar(px, py, w, h, 2, fill, stroke);
  }
}

function drawTowerToolbar() {
  const buttons = getTowerButtons();

  ctx.fillStyle = "#0f2440d1";
  ctx.fillRect(22, canvas.height - 90, canvas.width - 44, 80);
  ctx.strokeStyle = "#4d678f";
  ctx.lineWidth = 2;
  ctx.strokeRect(22, canvas.height - 90, canvas.width - 44, 80);

  for (const button of buttons) {
    const selected = state.selectedTowerId === button.id;
    const affordable = state.credits >= button.tower.cost;

    ctx.fillStyle = selected ? "#2d4f80" : "#1a355a";
    ctx.fillRect(button.x, button.y, button.width, button.height);

    ctx.strokeStyle = selected ? "#f8df90" : "#5472a1";
    ctx.lineWidth = selected ? 2.2 : 1.4;
    ctx.strokeRect(button.x, button.y, button.width, button.height);

    ctx.fillStyle = affordable ? "#e9f2ff" : "#9aabc5";
    ctx.font = button.width < 120 ? "700 11px Trebuchet MS" : "700 13px Trebuchet MS";
    ctx.fillText(`${button.tower.key}. ${button.tower.name}`, button.x + 8, button.y + 20);

    ctx.fillStyle = "#ffdca2";
    ctx.font = "700 12px Trebuchet MS";
    ctx.fillText(`$${button.tower.cost}`, button.x + 8, button.y + 40);

    ctx.fillStyle = "#b8d4ff";
    ctx.font = "700 12px Trebuchet MS";
    ctx.fillText(button.tower.short, button.x + 52, button.y + 40);
    drawTowerGlyph(button.tower, button.x + button.width - 18, button.y + 20, 14, selected);
  }
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function pointInCircle(x, y, circle) {
  const dx = x - circle.x;
  const dy = y - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function getWaveCallButtonRect() {
  return { x: canvas.width - 304, y: 84, width: 276, height: 28 };
}

function drawWaveCallControl() {
  const info = computeEarlyCallInfo();
  const rect = getWaveCallButtonRect();

  ctx.lineWidth = 1.5;
  if (state.awaitingFirstWaveStart && state.nextWaveNumber === 1 && state.activeWaves.length === 0) {
    const pulse = 0.12 + Math.sin(state.simClock * 4) * 0.07;
    ctx.fillStyle = `rgba(62, 141, 86, ${0.72 + pulse})`;
    ctx.strokeStyle = "#c7f7cf";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = "#effff2";
    ctx.font = "700 14px Trebuchet MS";
    ctx.fillText("Start Wave 1 (N)", rect.x + 11, rect.y + 19);
    return;
  }

  if (info) {
    const flash = state.earlyCallFlash > 0 ? Math.min(0.25, state.earlyCallFlash * 0.2) : 0;
    ctx.fillStyle = `rgba(50, 121, 72, ${0.7 + flash})`;
    ctx.strokeStyle = "#b9f0c0";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = "#e8ffed";
    ctx.font = "700 14px Trebuchet MS";
    ctx.fillText(`Call Wave ${info.waveNumber} Early: +$${info.bonus}`, rect.x + 11, rect.y + 19);
    return;
  }

  if (state.nextWaveNumber > WAVES.length) {
    return;
  }

  ctx.fillStyle = "#1b385fbb";
  ctx.strokeStyle = "#5f7da4";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#c9dcf7";
  ctx.font = "700 13px Trebuchet MS";
  if (state.activeWaves.length >= MAX_SIMULTANEOUS_WAVES) {
    ctx.fillText("Early wave unavailable (2 waves active)", rect.x + 10, rect.y + 19);
  } else {
    const timer = Math.max(0, state.waveBreakTimer);
    ctx.fillText(`Next wave auto in ${timer.toFixed(1)}s`, rect.x + 10, rect.y + 19);
  }
}

function getEncyclopediaButtonRect() {
  return { x: canvas.width - 304, y: 118, width: 276, height: 24 };
}

function drawEncyclopediaControl() {
  const rect = getEncyclopediaButtonRect();
  ctx.fillStyle = state.encyclopediaOpen ? "#2e5589cc" : "#1d3e66bb";
  ctx.strokeStyle = state.encyclopediaOpen ? "#f4dda0" : "#6f8fbb";
  ctx.lineWidth = 1.4;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#dfeeff";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText("Encyclopedia (I)", rect.x + 11, rect.y + 17);
}

function getRotatePlacementRect() {
  return { x: canvas.width - 304, y: 146, width: 276, height: 24 };
}

function getPlacementCancelCircle() {
  if (!state.buildPlacementArmed || isOverlayBlockingPlacement()) {
    return null;
  }
  const selectedType = getSelectedTowerType();
  const y = selectedType && selectedType.supportsRotation ? 186 : 156;
  return { x: canvas.width - 48, y, radius: 16 };
}

function drawRotatePlacementControl() {
  const selectedType = getSelectedTowerType();
  if (!state.buildPlacementArmed || !selectedType.supportsRotation || state.selectedPlacedTowerId || state.confirmAction) {
    return;
  }
  const rect = getRotatePlacementRect();
  ctx.fillStyle = "#1f3f67cc";
  ctx.strokeStyle = "#7fa4d3";
  ctx.lineWidth = 1.4;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#deecff";
  ctx.font = "700 13px Trebuchet MS";
  const rotation = getPlacementRotationForTower(selectedType.id);
  const face = ["E", "S", "W", "N"][rotation] || "E";
  ctx.fillText(`Rotate Defender Gate (R / Shift+R): ${face}`, rect.x + 10, rect.y + 17);
}

function drawPlacementCancelControl() {
  const cancelCircle = getPlacementCancelCircle();
  if (!cancelCircle) {
    return;
  }
  const pulse = 0.08 + Math.sin(state.simClock * 4.2) * 0.04;
  const gradient = ctx.createRadialGradient(
    cancelCircle.x - 4,
    cancelCircle.y - 5,
    3,
    cancelCircle.x,
    cancelCircle.y,
    cancelCircle.radius + 1
  );
  gradient.addColorStop(0, "#f9b9bc");
  gradient.addColorStop(1, "#8f2f3c");

  ctx.fillStyle = `rgba(35, 64, 98, ${0.2 + pulse})`;
  ctx.beginPath();
  ctx.arc(cancelCircle.x, cancelCircle.y, cancelCircle.radius + 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cancelCircle.x, cancelCircle.y, cancelCircle.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffd5d8";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cancelCircle.x, cancelCircle.y, cancelCircle.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#fff2f2";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(cancelCircle.x - 6, cancelCircle.y - 6);
  ctx.lineTo(cancelCircle.x + 6, cancelCircle.y + 6);
  ctx.moveTo(cancelCircle.x + 6, cancelCircle.y - 6);
  ctx.lineTo(cancelCircle.x - 6, cancelCircle.y + 6);
  ctx.stroke();
}

function getTowerMenuLayout() {
  const tower = getSelectedPlacedTower();
  if (!tower) {
    return null;
  }

  const panel = { x: canvas.width - 332, y: 124, width: 304, height: 236 };
  const closeRect = { x: panel.x + panel.width - 28, y: panel.y + 8, width: 20, height: 20 };
  const optionBaseY = panel.y + 66;
  const optionHeight = 46;
  const options = [];

  const type = TOWER_TYPE_BY_ID[tower.typeId];
  for (let tier = 1; tier < type.upgradeTiers.length; tier += 1) {
    options.push({
      ...getTowerUpgradeInfo(tower, tier),
      rect: { x: panel.x + 12, y: optionBaseY + (tier - 1) * (optionHeight + 8), width: panel.width - 24, height: optionHeight }
    });
  }

  const destroyRect = { x: panel.x + 12, y: panel.y + panel.height - 52, width: panel.width - 24, height: 36 };
  return {
    tower,
    panel,
    closeRect,
    options,
    destroyRect
  };
}

function drawTowerManagementMenu() {
  const layout = getTowerMenuLayout();
  if (!layout) {
    return;
  }

  const tower = layout.tower;
  const type = TOWER_TYPE_BY_ID[tower.typeId];
  const tierData = getTowerTierData(type, tower.tier);

  ctx.fillStyle = "#132948ee";
  ctx.strokeStyle = "#6e8bbc";
  ctx.lineWidth = 2;
  ctx.fillRect(layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height);
  ctx.strokeRect(layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height);

  ctx.fillStyle = "#f1f6ff";
  ctx.font = "700 17px Trebuchet MS";
  ctx.fillText(`${type.name} ${tierData ? tierData.label : "Basic"}`, layout.panel.x + 12, layout.panel.y + 26);
  drawTowerGlyph(type, layout.panel.x + 236, layout.panel.y + 24, 18, true);
  drawTierMiniProgress(type, tower.tier, layout.panel.x + 186, layout.panel.y + 33);
  ctx.font = "600 12px Trebuchet MS";
  ctx.fillStyle = "#c2d9ff";
  ctx.fillText(`Cell ${tower.c + 1},${tower.r + 1}  |  Refund +$${getDestroyRefund(tower)}`, layout.panel.x + 12, layout.panel.y + 46);

  ctx.fillStyle = "#264a77";
  ctx.fillRect(layout.closeRect.x, layout.closeRect.y, layout.closeRect.width, layout.closeRect.height);
  ctx.strokeStyle = "#8fb1df";
  ctx.strokeRect(layout.closeRect.x, layout.closeRect.y, layout.closeRect.width, layout.closeRect.height);
  ctx.fillStyle = "#e1ebff";
  ctx.font = "700 14px Trebuchet MS";
  ctx.fillText("X", layout.closeRect.x + 6, layout.closeRect.y + 15);

  for (const option of layout.options) {
    const unavailable = !option.sequential || !option.affordable;
    const unlocked = option.unlocked;

    if (unlocked) {
      ctx.fillStyle = "#2f5e48";
      ctx.strokeStyle = "#85d0a0";
    } else if (unavailable) {
      ctx.fillStyle = "#2a3550";
      ctx.strokeStyle = "#52698f";
    } else {
      ctx.fillStyle = "#2d4f80";
      ctx.strokeStyle = "#f8df90";
    }

    ctx.lineWidth = 1.6;
    ctx.fillRect(option.rect.x, option.rect.y, option.rect.width, option.rect.height);
    ctx.strokeRect(option.rect.x, option.rect.y, option.rect.width, option.rect.height);

    ctx.font = "700 13px Trebuchet MS";
    ctx.fillStyle = unlocked ? "#dbffea" : unavailable ? "#95a7c5" : "#eaf2ff";
    const tag = unlocked ? "Installed" : !option.sequential ? "Locked" : "Upgrade";
    ctx.fillText(`${option.label}  $${option.cost}  ${tag}`, option.rect.x + 10, option.rect.y + 20);
    ctx.font = "600 11px Trebuchet MS";
    if (unlocked) {
      ctx.fillStyle = "#b8f2cf";
      ctx.fillText("Current capability", option.rect.x + 10, option.rect.y + 35);
    } else if (!option.sequential) {
      ctx.fillStyle = "#7e93b3";
      ctx.fillText("Requires prior tier first", option.rect.x + 10, option.rect.y + 35);
    } else if (!option.affordable) {
      ctx.fillStyle = "#9bacca";
      ctx.fillText("Insufficient credits", option.rect.x + 10, option.rect.y + 35);
    } else {
      ctx.fillStyle = "#fce39b";
      ctx.fillText("Click to confirm upgrade", option.rect.x + 10, option.rect.y + 35);
    }
  }

  ctx.fillStyle = "#533046";
  ctx.strokeStyle = "#e0a2b4";
  ctx.lineWidth = 1.6;
  ctx.fillRect(layout.destroyRect.x, layout.destroyRect.y, layout.destroyRect.width, layout.destroyRect.height);
  ctx.strokeRect(layout.destroyRect.x, layout.destroyRect.y, layout.destroyRect.width, layout.destroyRect.height);
  ctx.fillStyle = "#ffdce6";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`$ Destroy Tower  (+$${getDestroyRefund(tower)})`, layout.destroyRect.x + 10, layout.destroyRect.y + 22);
}

function getConfirmDialogLayout() {
  const width = 392;
  const height = 194;
  const x = Math.round((canvas.width - width) * 0.5);
  const y = Math.round((canvas.height - height) * 0.5);
  return {
    panel: { x, y, width, height },
    yesRect: { x: x + 104, y: y + 108, width: 74, height: 62 },
    noRect: { x: x + 214, y: y + 108, width: 74, height: 62 }
  };
}

function drawConfirmDialog() {
  const action = state.confirmAction;
  if (!action) {
    return;
  }

  const layout = getConfirmDialogLayout();
  ctx.fillStyle = "rgba(6, 11, 19, 0.56)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#152d4eee";
  ctx.strokeStyle = "#98b6e3";
  ctx.lineWidth = 2.2;
  ctx.fillRect(layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height);
  ctx.strokeRect(layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height);

  const tower = getTowerById(action.towerId);
  const typeName = tower ? TOWER_TYPE_BY_ID[tower.typeId].name : "Tower";
  let prompt = "Confirm action?";
  if (action.type === "upgrade") {
    const targetData = tower ? getTowerTierData(TOWER_TYPE_BY_ID[tower.typeId], action.targetTier) : null;
    prompt = `Upgrade ${typeName} to ${targetData ? targetData.label : "next tier"} for $${action.cost}?`;
  } else if (action.type === "destroy") {
    prompt = `Destroy ${typeName} and refund +$${action.refund}?`;
  }

  ctx.fillStyle = "#f2f7ff";
  ctx.font = "700 21px Trebuchet MS";
  ctx.fillText("Confirm", layout.panel.x + 16, layout.panel.y + 34);
  ctx.font = "600 15px Trebuchet MS";
  ctx.fillStyle = "#d4e5ff";
  ctx.fillText(prompt, layout.panel.x + 16, layout.panel.y + 72);

  ctx.fillStyle = "#2f7d3f";
  ctx.strokeStyle = "#b0f5bb";
  ctx.lineWidth = 2;
  ctx.fillRect(layout.yesRect.x, layout.yesRect.y, layout.yesRect.width, layout.yesRect.height);
  ctx.strokeRect(layout.yesRect.x, layout.yesRect.y, layout.yesRect.width, layout.yesRect.height);
  ctx.strokeStyle = "#e9fff0";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(layout.yesRect.x + 18, layout.yesRect.y + 34);
  ctx.lineTo(layout.yesRect.x + 30, layout.yesRect.y + 46);
  ctx.lineTo(layout.yesRect.x + 56, layout.yesRect.y + 18);
  ctx.stroke();

  ctx.fillStyle = "#8d2f3a";
  ctx.strokeStyle = "#ffb8c1";
  ctx.lineWidth = 2;
  ctx.fillRect(layout.noRect.x, layout.noRect.y, layout.noRect.width, layout.noRect.height);
  ctx.strokeRect(layout.noRect.x, layout.noRect.y, layout.noRect.width, layout.noRect.height);
  ctx.strokeStyle = "#ffe1e6";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(layout.noRect.x + 18, layout.noRect.y + 18);
  ctx.lineTo(layout.noRect.x + 56, layout.noRect.y + 46);
  ctx.moveTo(layout.noRect.x + 56, layout.noRect.y + 18);
  ctx.lineTo(layout.noRect.x + 18, layout.noRect.y + 46);
  ctx.stroke();
}

function isNearPortalZone(x, y, map) {
  if (!map) {
    return false;
  }
  const spawn = map.spawnWorld;
  const goal = map.goalWorld;
  const spawnDx = x - (spawn.x - TILE_STEP * 0.95);
  const goalDx = x - (goal.x + TILE_STEP * 0.95);
  return Math.hypot(spawnDx, y - spawn.y) < 86 || Math.hypot(goalDx, y - goal.y) < 86;
}

function drawVoxelTree(x, y, scale, tone) {
  const foliageSets = [
    { top: "#6ca95f", side: "#355f34", front: "#457845", stroke: "#cceec2" },
    { top: "#79b96c", side: "#3c6a3b", front: "#4d8550", stroke: "#d7f3cc" },
    { top: "#5e9c55", side: "#31582f", front: "#3f6f40", stroke: "#bfe7b7" }
  ];
  const palette = foliageSets[Math.floor(tone * foliageSets.length) % foliageSets.length];

  const trunkW = Math.max(5, Math.round(7 * scale));
  const trunkX = x - trunkW * 0.5;
  const trunkTopY = y - Math.max(12, Math.round(18 * scale));
  drawVoxelBlockAt(trunkX, trunkTopY, trunkW, 4, 3, "#9a6b3d", "#5e3d21", "#714a27", "#f0d7b5");

  const canopySize = Math.max(10, Math.round(20 * scale));
  const canopyY = trunkTopY - canopySize * 0.6;
  drawVoxelBlockAt(
    x - canopySize * 0.5,
    canopyY,
    canopySize,
    8,
    5,
    palette.top,
    palette.side,
    palette.front,
    palette.stroke
  );

  const crownSize = Math.max(8, Math.round(14 * scale));
  drawVoxelBlockAt(
    x - crownSize * 0.5,
    canopyY - crownSize * 0.52,
    crownSize,
    7,
    4,
    blendHex(palette.top, "#8fcc7a", 0.25),
    blendHex(palette.side, "#4d874a", 0.2),
    blendHex(palette.front, "#68a662", 0.25),
    palette.stroke
  );
}

function drawVoxelRock(x, y, scale, tone) {
  const rockPalettes = [
    { top: "#91a8af", side: "#4f656d", front: "#5f757d", stroke: "#d5e2e7" },
    { top: "#9aa09d", side: "#5c625f", front: "#6d736f", stroke: "#e0e5e2" },
    { top: "#8a959c", side: "#4b5760", front: "#5b6871", stroke: "#d6dfe4" }
  ];
  const palette = rockPalettes[Math.floor(tone * rockPalettes.length) % rockPalettes.length];
  const size = Math.max(7, Math.round(12 * scale));
  drawVoxelBlockAt(x - size * 0.5, y - size * 0.4, size, 5, 3, palette.top, palette.side, palette.front, palette.stroke);
}

function drawBackgroundDecor() {
  if (!state.backgroundDecor || state.backgroundDecor.length === 0) {
    generateBackgroundDecor();
  }
  const map = state.map;
  for (const item of state.backgroundDecor) {
    if (isNearPortalZone(item.x, item.y, map)) {
      continue;
    }
    if (item.kind === "tree") {
      drawVoxelTree(item.x, item.y, item.scale, item.tone);
    } else if (item.kind === "rock") {
      drawVoxelRock(item.x, item.y, item.scale, item.tone);
    }
  }
}

function drawPortalTransitionTrail(cell, side) {
  const center = gridToFootprintCenter(cell.c, cell.r, LARGE_ENEMY_FOOTPRINT);
  const trailWidth = TILE_SIZE * 1.08;
  const trailLength = TILE_STEP * 1.92;
  const fromX = side === "left" ? center.x - trailLength - TILE_SIZE * 0.46 : center.x + TILE_SIZE * 0.46;
  const toX = side === "left" ? center.x + TILE_SIZE * 0.18 : center.x - TILE_SIZE * 0.18;
  const y = center.y - trailWidth * 0.48;
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);

  const gradient = ctx.createLinearGradient(fromX, y, toX, y);
  if (side === "left") {
    gradient.addColorStop(0, "rgba(64, 99, 70, 0.10)");
    gradient.addColorStop(1, "rgba(137, 184, 118, 0.56)");
  } else {
    gradient.addColorStop(0, "rgba(137, 184, 118, 0.56)");
    gradient.addColorStop(1, "rgba(64, 99, 70, 0.10)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(minX, y, maxX - minX, trailWidth);

  for (let i = 0; i < 4; i += 1) {
    const ratio = i / 3;
    const stepOffset = TILE_STEP * (1.24 - ratio * 0.9);
    const stepX = side === "left" ? center.x - stepOffset : center.x + stepOffset;
    const stepY = center.y + (i % 2 === 0 ? 8 : 5);
    drawVoxelBlockAt(stepX - 6, stepY - 4, 12, 4, 3, "#8ea08f", "#516652", "#647a64", "#d9e5d9");
  }
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#8bc2f4");
  gradient.addColorStop(0.5, "#9dd1ee");
  gradient.addColorStop(1, "#7bb58e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(91, 142, 103, 0.62)";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.73);
  ctx.lineTo(canvas.width * 0.18, canvas.height * 0.57);
  ctx.lineTo(canvas.width * 0.42, canvas.height * 0.71);
  ctx.lineTo(canvas.width * 0.66, canvas.height * 0.54);
  ctx.lineTo(canvas.width, canvas.height * 0.7);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  const bounds = getBoardBounds();
  ctx.fillStyle = "rgba(67, 104, 63, 0.26)";
  ctx.fillRect(bounds.left - 26, bounds.top - 18, bounds.width + 52, bounds.height + 30);
  ctx.fillStyle = "rgba(123, 169, 98, 0.2)";
  ctx.fillRect(bounds.left - 9, bounds.top - 8, bounds.width + 18, bounds.height + 16);

  drawBackgroundDecor();
  if (state.map) {
    drawPortalTransitionTrail(state.map.spawnCell, "left");
    drawPortalTransitionTrail(state.map.goalCell, "right");
  }
}

function render() {
  drawBackdrop();
  drawPanel();
  drawSettingsControl();
  drawWaveCallControl();
  drawEncyclopediaControl();
  drawRotatePlacementControl();
  drawPlacementCancelControl();
  drawBoard();
  drawMapEndpoints();

  for (const tower of state.towers) {
    drawTower(tower);
  }

  drawDefenders();

  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  drawProjectilesAndEffects();
  drawTowerToolbar();
  drawTowerManagementMenu();
  drawSettingsPanel();
  drawConfirmDialog();
}

function canvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function pickCell(x, y) {
  for (let row = GRID_ROWS - 1; row >= 0; row -= 1) {
    for (let col = GRID_COLS - 1; col >= 0; col -= 1) {
      const tile = gridToTopLeft(col, row);
      const topY = tile.y - TILE_HEIGHT;
      if (x >= tile.x && x <= tile.x + TILE_SIZE && y >= topY && y <= topY + TILE_SIZE) {
        return { c: col, r: row };
      }
    }
  }
  return null;
}

function handleConfirmDialogClick(point) {
  if (!state.confirmAction) {
    return false;
  }
  const layout = getConfirmDialogLayout();
  if (pointInRect(point.x, point.y, layout.yesRect)) {
    confirmAction();
    return true;
  }
  if (pointInRect(point.x, point.y, layout.noRect)) {
    state.confirmAction = null;
    return true;
  }
  return true;
}

function handleTowerMenuClick(point) {
  const layout = getTowerMenuLayout();
  if (!layout) {
    return false;
  }

  if (pointInRect(point.x, point.y, layout.closeRect)) {
    clearTowerSelection();
    return true;
  }

  for (const option of layout.options) {
    if (!pointInRect(point.x, point.y, option.rect)) {
      continue;
    }
    if (option.enabled) {
      requestTowerUpgrade(layout.tower.id, option.targetTier);
    }
    return true;
  }

  if (pointInRect(point.x, point.y, layout.destroyRect)) {
    requestTowerDestroy(layout.tower.id);
    return true;
  }

  if (pointInRect(point.x, point.y, layout.panel)) {
    return true;
  }

  return false;
}

function handleSettingsClick(point) {
  const buttonRect = getSettingsButtonRect();
  if (pointInRect(point.x, point.y, buttonRect)) {
    toggleSettingsPanel();
    return true;
  }

  if (!state.settingsOpen) {
    return false;
  }

  const panelRect = getSettingsPanelRect();
  const toggleRect = getSettingsGridToggleRect();
  if (pointInRect(point.x, point.y, toggleRect)) {
    toggleAlwaysShowGrid();
    return true;
  }
  if (pointInRect(point.x, point.y, panelRect)) {
    return true;
  }

  state.settingsOpen = false;
  return true;
}

function handlePlacementCancelClick(point) {
  const cancelCircle = getPlacementCancelCircle();
  if (!cancelCircle) {
    return false;
  }
  if (!pointInCircle(point.x, point.y, cancelCircle)) {
    return false;
  }
  disarmBuildPlacement();
  state.hoveredCell = null;
  return true;
}

function handlePointerMove(event) {
  const point = canvasCoords(event);
  pointer.x = point.x;
  pointer.y = point.y;

  if (state.confirmAction || state.settingsOpen || !state.buildPlacementArmed) {
    state.hoveredCell = null;
    return;
  }

  const towerButton = getTowerButtonHit(point.x, point.y);
  if (towerButton) {
    state.hoveredCell = null;
    return;
  }

  const waveButton = getWaveCallButtonRect();
  if (pointInRect(point.x, point.y, waveButton)) {
    state.hoveredCell = null;
    return;
  }

  const encyclopediaButton = getEncyclopediaButtonRect();
  if (pointInRect(point.x, point.y, encyclopediaButton)) {
    state.hoveredCell = null;
    return;
  }

  const settingsButton = getSettingsButtonRect();
  if (pointInRect(point.x, point.y, settingsButton)) {
    state.hoveredCell = null;
    return;
  }

  const rotateButton = getRotatePlacementRect();
  if (pointInRect(point.x, point.y, rotateButton)) {
    state.hoveredCell = null;
    return;
  }

  const cancelCircle = getPlacementCancelCircle();
  if (cancelCircle && pointInCircle(point.x, point.y, cancelCircle)) {
    state.hoveredCell = null;
    return;
  }

  const towerMenu = getTowerMenuLayout();
  if (towerMenu && pointInRect(point.x, point.y, towerMenu.panel)) {
    state.hoveredCell = null;
    return;
  }

  state.hoveredCell = pickCell(point.x, point.y);
}

function handleClick(event) {
  if (state.mode !== "playing") {
    return;
  }

  const point = canvasCoords(event);

  if (handleConfirmDialogClick(point)) {
    return;
  }

  if (handleSettingsClick(point)) {
    return;
  }

  if (!state.paused) {
    const waveButton = getWaveCallButtonRect();
    if (pointInRect(point.x, point.y, waveButton)) {
      callNextWaveEarly();
      return;
    }
  }

  const encyclopediaButton = getEncyclopediaButtonRect();
  if (pointInRect(point.x, point.y, encyclopediaButton)) {
    toggleEncyclopedia();
    return;
  }

  const rotateButton = getRotatePlacementRect();
  if (pointInRect(point.x, point.y, rotateButton)) {
    const selectedType = getSelectedTowerType();
    if (state.buildPlacementArmed && selectedType.supportsRotation) {
      rotatePlacementForSelected(1);
      return;
    }
  }

  if (handlePlacementCancelClick(point)) {
    return;
  }

  if (handleTowerMenuClick(point)) {
    return;
  }

  const towerButton = getTowerButtonHit(point.x, point.y);
  if (towerButton) {
    setSelectedBuildTower(towerButton.id, true);
    state.settingsOpen = false;
    return;
  }

  const cell = pickCell(point.x, point.y);
  const clickedTower = getTowerAtCell(cell);
  if (clickedTower) {
    selectPlacedTower(clickedTower);
    return;
  }

  if (state.selectedPlacedTowerId) {
    clearTowerSelection();
    return;
  }

  tryPlaceTower(cell, point);
}

function togglePause() {
  if (state.mode === "playing") {
    state.paused = !state.paused;
  }
}

function toggleFullscreen() {
  const host = document.getElementById("game-root");
  if (!document.fullscreenElement) {
    host.requestFullscreen().catch(() => {});
    return;
  }
  document.exitFullscreen().catch(() => {});
}

window.addEventListener("keydown", (event) => {
  if (state.encyclopediaOpen) {
    if (event.key === "Escape" || event.key === "i" || event.key === "I") {
      event.preventDefault();
      closeEncyclopedia();
    }
    return;
  }

  if (event.key === "p" || event.key === "P" || event.code === "Space") {
    event.preventDefault();
    togglePause();
  }

  if (event.key === "i" || event.key === "I") {
    event.preventDefault();
    openEncyclopedia();
    return;
  }

  if (event.key === "f" || event.key === "F") {
    toggleFullscreen();
  }

  if (event.key === "Escape") {
    if (state.confirmAction) {
      state.confirmAction = null;
      return;
    }
    if (state.selectedPlacedTowerId) {
      clearTowerSelection();
      return;
    }
    if (state.settingsOpen) {
      state.settingsOpen = false;
      return;
    }
    if (state.buildPlacementArmed) {
      disarmBuildPlacement();
      state.hoveredCell = null;
      return;
    }
  }

  if (event.key === "Enter") {
    if (state.mode === "menu" || state.mode === "gameover" || state.mode === "victory") {
      resetRun();
    }
  }

  if (event.key === "n" || event.key === "N") {
    callNextWaveEarly();
  }

  if (/^[1-8]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    const type = TOWER_TYPES[index];
    if (type) {
      setSelectedBuildTower(type.id, true);
      state.settingsOpen = false;
    }
  }

  if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") {
    cycleTowerSelection(-1);
    setSelectedBuildTower(state.selectedTowerId, true);
  }

  if (event.key === "b" || event.key === "B" || event.key === "ArrowRight") {
    cycleTowerSelection(1);
    setSelectedBuildTower(state.selectedTowerId, true);
  }

  if (event.key === "r" || event.key === "R") {
    const reverse = event.shiftKey ? -1 : 1;
    rotatePlacementForSelected(reverse);
  }
});

canvas.addEventListener("mousemove", handlePointerMove);
canvas.addEventListener("click", handleClick);
startBtn.addEventListener("click", startSettlement);
restartBtn.addEventListener("click", restartSettlement);
if (openEncyclopediaBtn) {
  openEncyclopediaBtn.addEventListener("click", openEncyclopedia);
}
if (closeEncyclopediaBtn) {
  closeEncyclopediaBtn.addEventListener("click", () => closeEncyclopedia());
}
if (encyclopediaOverlay) {
  encyclopediaOverlay.addEventListener("click", (event) => {
    if (event.target === encyclopediaOverlay) {
      closeEncyclopedia();
    }
  });
}
for (const tabButton of encyclopediaTabs) {
  tabButton.addEventListener("click", () => {
    setEncyclopediaTab(tabButton.dataset.encyclopediaTab);
  });
}
for (const button of mapOptionButtons) {
  button.addEventListener("click", () => {
    const mode = button.dataset.mapMode;
    setSelectedMapMode(mode, true);
    if (state.mode === "menu") {
      render();
    }
  });
}

window.startSettlement = startSettlement;
window.restartSettlement = restartSettlement;

function formatPlacementCandidateForText(candidate) {
  if (!candidate) {
    return null;
  }
  return {
    anchor: candidate.anchor ? { c: candidate.anchor.c, r: candidate.anchor.r } : null,
    rotation: Number.isFinite(candidate.rotation) ? candidate.rotation : 0,
    valid: Boolean(candidate.valid),
    reason: candidate.reason || PLACEMENT_REASONS.NONE
  };
}

function formatLastPlaceAttemptForText() {
  if (!state.lastPlaceAttempt) {
    return null;
  }
  return {
    clicked_cell: state.lastPlaceAttempt.clickedCell
      ? { c: state.lastPlaceAttempt.clickedCell.c, r: state.lastPlaceAttempt.clickedCell.r }
      : null,
    resolved_anchor: state.lastPlaceAttempt.resolvedAnchor
      ? { c: state.lastPlaceAttempt.resolvedAnchor.c, r: state.lastPlaceAttempt.resolvedAnchor.r }
      : null,
    resolved_rotation: Number.isFinite(state.lastPlaceAttempt.resolvedRotation) ? state.lastPlaceAttempt.resolvedRotation : 0,
    valid: Boolean(state.lastPlaceAttempt.valid),
    reason: state.lastPlaceAttempt.reason || PLACEMENT_REASONS.NONE
  };
}

function renderGameToText() {
  const selectedTower = getSelectedTowerType();
  const selectedPlacedTower = getSelectedPlacedTower();
  const earlyCallInfo = computeEarlyCallInfo();
  const placementPreview = formatPlacementCandidateForText(getPlacementPreviewCandidate());
  const payload = {
    coordinate_system: "origin=(0,0) top-left; +x right; +y down; units=pixels on canvas",
    mode: state.mode,
    paused: state.paused,
    settings: {
      show_grid_always: state.settings.showGridAlways
    },
    visual: {
      enemy_label_mode: ENEMY_LABEL_MODE,
      enemy_visual_ids: ENEMY_TYPES.map((enemyType) => ({
        id: enemyType.id,
        visual_id: enemyType.visualId
      })),
      tower_visual_ids: TOWER_TYPES.map((towerType) => ({
        id: towerType.id,
        visual_id: towerType.visualId
      }))
    },
    ui: {
      settings_open: state.settingsOpen,
      grid_visible_now: isGridVisibleNow(),
      build_placement_armed: state.buildPlacementArmed,
      placement_rotation: state.placementRotation,
      placement_cancel_visible: Boolean(getPlacementCancelCircle()),
      placement_preview: placementPreview,
      last_place_attempt: formatLastPlaceAttemptForText()
    },
    wave: {
      current: getActiveWaveNumbers()[0] || Math.min(state.nextWaveNumber, WAVES.length),
      total: WAVES.length,
      label: getWaveLabel(),
      awaiting_first_wave_start: state.awaitingFirstWaveStart,
      active: getActiveWaveNumbers(),
      active_details: state.activeWaves
        .slice()
        .sort((a, b) => a.waveNumber - b.waveNumber)
        .map((waveState) => ({
          wave_number: waveState.waveNumber,
          pending_spawns: waveState.pendingSpawns,
          enemy_types: waveState.mix
        })),
      next_wave: state.nextWaveNumber <= WAVES.length ? state.nextWaveNumber : null,
      spawning: state.activeWaves.length > 0,
      pending_spawns: state.activeWaves.reduce((sum, waveState) => sum + waveState.pendingSpawns, 0),
      break_timer: Number(Math.max(0, state.waveBreakTimer).toFixed(2)),
      early_call_bonus_preview: earlyCallInfo ? earlyCallInfo.bonus : 0,
      early_call_available: Boolean(earlyCallInfo)
    },
    map: {
      mode: state.map ? state.map.mode : state.selectedMapMode,
      spawn_cell: state.map ? state.map.spawnCell : EMPTY_MAP_SPAWN,
      goal_cell: state.map ? state.map.goalCell : EMPTY_MAP_GOAL,
      fixed_path_cells: state.map && state.map.mode === "random" ? state.map.roadSet.size : 0
    },
    economy: {
      credits: state.credits,
      score: state.score
    },
    selected_tower: {
      id: selectedTower.id,
      name: selectedTower.name,
      cost: selectedTower.cost
    },
    tower_shop: TOWER_TYPES.map((tower) => ({
      id: tower.id,
      cost: tower.cost,
      selected: tower.id === state.selectedTowerId
    })),
    base_health: state.baseHealth,
    towers: state.towers.map((tower) => ({
      id: tower.id,
      type: tower.typeId,
      tier: tower.tier,
      c: tower.c,
      r: tower.r,
      x: Math.round(tower.x),
      y: Math.round(tower.y),
      cooldown: Number(tower.cooldown.toFixed(2)),
      range: tower.range,
      invested_credits: tower.investedCredits,
      aim_angle: Number(tower.aimAngle.toFixed(3)),
      default_aim_angle: Number(tower.defaultAimAngle.toFixed(3)),
      footprint: getTowerFootprint(tower),
      rotation: tower.rotation || 0,
      target_id: tower.targetId,
      tier_visual_stage: Number.isFinite(tower.tierVisualStage) ? tower.tierVisualStage : tower.tier,
      barrel_heat: Number((tower.barrelHeat || 0).toFixed(2))
    })),
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.typeId,
      type_name: enemy.typeName,
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
      hp: Math.round(enemy.hp),
      max_hp: enemy.maxHp,
      shield: Number((enemy.shield || 0).toFixed(1)),
      shield_max: Number((enemy.shieldMax || 0).toFixed(1)),
      footprint: enemy.footprint || SMALL_ENEMY_FOOTPRINT,
      size_class: (enemy.footprint || SMALL_ENEMY_FOOTPRINT) > 1 ? "large" : "small",
      path_mode: enemy.pathMode,
      wave_number: enemy.waveNumber,
      path_index: enemy.pathIndex,
      progress: Math.round(enemy.distanceAlongPath),
      slow_multiplier: Number(enemy.slowMultiplier.toFixed(2)),
      slow_timer: Number(enemy.slowTimer.toFixed(2)),
      freeze_timer: Number((enemy.freezeTimer || 0).toFixed(2)),
      stun_timer: Number((enemy.stunTimer || 0).toFixed(2)),
      shock_timer: Number((enemy.shockTimer || 0).toFixed(2)),
      dashing: enemy.burstTimer > 0,
      engaged_defender_id: Number.isFinite(enemy.engagedDefenderId) ? enemy.engagedDefenderId : null,
      visual_id: enemy.visualId,
      hit_flash: Number((enemy.hitFlash || 0).toFixed(2)),
      motion_tilt: Number((enemy.motionTilt || 0).toFixed(2))
    })),
    defenders: state.defenders.map((defender) => ({
      id: defender.id,
      type: defender.kind,
      tower_id: defender.towerId,
      position: { x: Math.round(defender.x), y: Math.round(defender.y) },
      hp: Math.round(defender.hp),
      max_hp: defender.maxHp,
      state: defender.state,
      target_enemy_id: Number.isFinite(defender.targetEnemyId) ? defender.targetEnemyId : null,
      respawn: Number((defender.respawnTimer || 0).toFixed(2))
    })),
    slime_patches_count: state.slimePatches.length,
    projectiles: state.projectiles.length,
    effects: {
      muzzle: state.shotFx.length,
      explosions: state.explosionFx.length,
      lightning: state.lightningFx.length
    },
    combat_stats: state.combatStats,
    hovered_cell: state.hoveredCell,
    encyclopedia: {
      open: state.encyclopediaOpen,
      tab: state.encyclopediaTab,
      tower_entries: TOWER_TYPES.length,
      enemy_entries: ENEMY_TYPES.length
    },
    tower_management: {
      selected_tower_id: selectedPlacedTower ? selectedPlacedTower.id : null,
      selected_tower_type: selectedPlacedTower ? selectedPlacedTower.typeId : null,
      selected_tower_tier: selectedPlacedTower ? selectedPlacedTower.tier : null,
      destroy_refund_preview: selectedPlacedTower ? getDestroyRefund(selectedPlacedTower) : 0,
      upgrade_options: selectedPlacedTower
        ? Array.from(
            { length: TOWER_TYPE_BY_ID[selectedPlacedTower.typeId].upgradeTiers.length - 1 },
            (_, index) => index + 1
          )
            .map((tier) => getTowerUpgradeInfo(selectedPlacedTower, tier))
            .filter(Boolean)
            .map((option) => ({
              tier: option.targetTier,
              label: option.label,
              cost: option.cost,
              unlocked: option.unlocked,
              sequential: option.sequential,
              affordable: option.affordable,
              enabled: option.enabled
            }))
        : [],
      confirm_action: state.confirmAction
        ? {
            type: state.confirmAction.type,
            tower_id: state.confirmAction.towerId,
            target_tier: state.confirmAction.targetTier || null,
            cost: state.confirmAction.cost || 0,
            refund: state.confirmAction.refund || 0
          }
        : null
    }
  };
  return JSON.stringify(payload);
}

function debugPlacementSweep(towerId = "defender", mode = null) {
  const towerType = TOWER_TYPE_BY_ID[towerId];
  if (!towerType) {
    return null;
  }
  if (mode && MAP_MODES.includes(mode) && (!state.map || state.map.mode !== mode)) {
    setSelectedMapMode(mode, true);
  }
  if (!state.map) {
    return null;
  }

  const selectedRotation = towerType.supportsRotation ? getPlacementRotationForTower(towerType.id) : 0;
  const invalidReasons = {};
  let directValid = 0;
  let smartValid = 0;

  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      const cell = { c, r };
      const direct = getPlacementValidation(cell, towerType, selectedRotation);
      if (direct.valid) {
        directValid += 1;
      }

      const resolved = resolvePlacementCandidate(cell, towerType, gridToCenter(c, r));
      if (resolved.valid) {
        smartValid += 1;
      } else {
        const reason = resolved.reason || PLACEMENT_REASONS.NONE;
        invalidReasons[reason] = (invalidReasons[reason] || 0) + 1;
      }
    }
  }

  return {
    mode: state.map.mode,
    tower_id: towerType.id,
    direct_valid: directValid,
    smart_valid: smartValid,
    total: GRID_ROWS * GRID_COLS,
    invalid_reasons: invalidReasons
  };
}

window.render_game_to_text = renderGameToText;
window.debugPlacementSweep = debugPlacementSweep;

window.advanceTime = (ms) => {
  state.lastManualAdvanceAt = performance.now();
  const stepSeconds = 1 / 60;
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    update(stepSeconds);
  }
  render();
};

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const manualRecentlyUsed = now - state.lastManualAdvanceAt < 120;
  if (!manualRecentlyUsed) {
    update(dt);
  }

  render();
  requestAnimationFrame(frame);
}

loadSettings();
setSelectedMapMode(state.selectedMapMode, true);
render();
requestAnimationFrame(frame);
