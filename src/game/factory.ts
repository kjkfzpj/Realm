// Procedural mesh builders. Everything is built from primitives so the game
// ships with zero external art assets while still reading as a real world.
import * as THREE from 'three';
import { COLORS, type Faction } from './config';

const factionColor = (f: Faction) => (f === 'player' ? COLORS.player : COLORS.enemy);
const factionDark = (f: Faction) => (f === 'player' ? COLORS.playerDark : COLORS.enemyDark);

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...opts });
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
export function buildVillager(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const skin = 0xe0b487;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 4, 10), mat(factionColor(faction)));
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), mat(skin));
  head.position.y = 1.28;
  head.castShadow = true;
  g.add(head);
  // a little tool to look like a worker
  const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), mat(0x6b4423));
  tool.position.set(0.34, 0.8, 0);
  tool.rotation.z = Math.PI / 5;
  g.add(tool);
  return g;
}

export function buildSoldier(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.6, 4, 10), mat(factionDark(faction)));
  body.position.y = 0.72;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 12), mat(0xe0b487));
  head.position.y = 1.42;
  head.castShadow = true;
  g.add(head);
  // helmet
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa0a6, { metalness: 0.4, roughness: 0.4 }));
  helm.position.y = 1.5;
  g.add(helm);
  // shield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.45), mat(factionColor(faction)));
  shield.position.set(-0.42, 0.8, 0);
  shield.castShadow = true;
  g.add(shield);
  // sword
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.07), mat(0xcfd3d8, { metalness: 0.6, roughness: 0.3 }));
  sword.position.set(0.46, 0.95, 0);
  g.add(sword);
  return g;
}

export function buildArcher(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 4, 10), mat(0x6a8f4a));
  body.position.y = 0.68;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), mat(0xe0b487));
  head.position.y = 1.32;
  g.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 10), mat(factionColor(faction)));
  hood.position.y = 1.5;
  g.add(hood);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 12, Math.PI), mat(0x6b4423));
  bow.position.set(0.4, 0.9, 0);
  bow.rotation.y = Math.PI / 2;
  g.add(bow);
  return g;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
export function buildTownCenter(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const stone = mat(0xb9b09a);
  const wood = mat(0x7a4f2a);
  const roof = mat(faction === 'player' ? 0x355f9c : 0x9c3535);

  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 7), stone);
  base.position.y = 1.2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // corner posts
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as const) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 0.9), wood);
    post.position.set(x, 2.1, z);
    post.castShadow = true;
    g.add(post);
  }
  // upper floor
  const upper = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.8, 6.4), mat(0xd8cdb0));
  upper.position.y = 3.5;
  upper.castShadow = true;
  g.add(upper);
  // pyramid roof
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.6, 4), roof);
  roofMesh.position.y = 5.6;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  g.add(roofMesh);
  // flag pole + flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), mat(0x444444));
  pole.position.set(0, 8, 0);
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshStandardMaterial({ color: factionColor(faction), side: THREE.DoubleSide }));
  flag.position.set(0.85, 8.7, 0);
  g.add(flag);
  return g;
}

export function buildHouse(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const wall = mat(0xd8c9a8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), wall);
  body.position.y = 1;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.8, 4), mat(faction === 'player' ? 0x3a6090 : 0x903a3a));
  roof.position.y = 2.9;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.1), mat(0x5a3a1c));
  door.position.set(0, 0.55, 1.5);
  g.add(door);
  return g;
}

export function buildBarracks(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const wall = mat(0x9a8c72);
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4.5), wall);
  body.position.y = 1.3;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 4.9), mat(0x5a4a32));
  roof.position.y = 2.8;
  roof.castShadow = true;
  g.add(roof);
  // banner
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2), new THREE.MeshStandardMaterial({ color: factionColor(faction), side: THREE.DoubleSide }));
  banner.position.set(0, 2, 2.3);
  g.add(banner);
  // weapon racks (decoration)
  for (const x of [-1.5, 1.5]) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), mat(0x6b4423));
    rack.position.set(x, 0.7, 2.4);
    g.add(rack);
  }
  return g;
}

export function buildMill(faction: Faction): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 3, 10), mat(0xc9b896));
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 10), mat(faction === 'player' ? 0x3a6090 : 0x903a3a));
  roof.position.y = 3.8;
  roof.castShadow = true;
  g.add(roof);
  // windmill blades
  const hub = new THREE.Group();
  hub.position.set(0, 2.4, 2.1);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.08), mat(0x8a6a3a));
    blade.position.y = 1.2;
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.z = (i * Math.PI) / 2;
    hub.add(pivot);
  }
  hub.userData.spin = true;
  g.add(hub);
  g.userData.windmill = hub;
  return g;
}

export function buildingMesh(kind: string, faction: Faction): THREE.Group {
  switch (kind) {
    case 'towncenter': return buildTownCenter(faction);
    case 'house': return buildHouse(faction);
    case 'barracks': return buildBarracks(faction);
    case 'mill': return buildMill(faction);
    default: return buildHouse(faction);
  }
}

// ---------------------------------------------------------------------------
// Resource nodes / scenery
// ---------------------------------------------------------------------------
export function buildTree(): THREE.Group {
  const g = new THREE.Group();
  const h = 1.4 + Math.random() * 0.8;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, h, 6), mat(0x6b4a2a));
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const leafColor = new THREE.Color(0x2f6d34).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
  for (let i = 0; i < 3; i++) {
    const r = 1.5 - i * 0.35;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.3, 8), mat(leafColor.getHex()));
    cone.position.y = h + 0.3 + i * 0.7;
    cone.castShadow = true;
    g.add(cone);
  }
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
}

export function buildGold(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = 0.5 + Math.random() * 0.6;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(0x6b6258, { roughness: 0.9 }));
    rock.position.set((Math.random() - 0.5) * 2.4, s * 0.4, (Math.random() - 0.5) * 2.4);
    rock.castShadow = true;
    g.add(rock);
    // gold veins
    const vein = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.45, 0), mat(COLORS.gold, { metalness: 0.7, roughness: 0.3, emissive: 0x3a2c00 }));
    vein.position.copy(rock.position);
    vein.position.y += s * 0.25;
    g.add(vein);
  }
  return g;
}

export function buildBerry(): THREE.Group {
  const g = new THREE.Group();
  const bush = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), mat(0x2f5d34));
  bush.scale.y = 0.7;
  bush.position.y = 0.6;
  bush.castShadow = true;
  g.add(bush);
  for (let i = 0; i < 14; i++) {
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat(0xc0455a, { emissive: 0x3a0a14 }));
    const a = Math.random() * Math.PI * 2;
    const r = 0.7 + Math.random() * 0.3;
    berry.position.set(Math.cos(a) * r, 0.5 + Math.random() * 0.6, Math.sin(a) * r);
    g.add(berry);
  }
  return g;
}

export function buildRock(): THREE.Group {
  const g = new THREE.Group();
  const s = 0.8 + Math.random() * 1.4;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(0x808079, { roughness: 1 }));
  rock.position.y = s * 0.4;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);
  return g;
}
