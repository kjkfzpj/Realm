// World generation: scatters resource clusters and scenery, then plants the
// player's and enemy's starting bases. Pure data placement — it asks the Game
// to spawn entities so everything lives in one registry.
import * as THREE from 'three';
import { WORLD } from './config';
import { buildRock } from './factory';
import type { Game } from './game';

function rand(min: number, max: number) { return min + Math.random() * (max - min); }

export function generateWorld(game: Game) {
  const half = WORLD.size * 0.5 - 6;

  // Player base in one corner, enemy in the opposite corner.
  const playerBase = new THREE.Vector3(-half * 0.62, 0, -half * 0.62);
  const enemyBase = new THREE.Vector3(half * 0.62, 0, half * 0.62);

  game.spawnBuilding('towncenter', 'player', playerBase, true);
  game.spawnBuilding('towncenter', 'enemy', enemyBase, true);

  // Starting villagers around the player town center.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    game.spawnUnit('villager', 'player', new THREE.Vector3(playerBase.x + Math.cos(a) * 7, 0, playerBase.z + Math.sin(a) * 7));
  }
  // Enemy starts with a small garrison.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    game.spawnUnit('villager', 'enemy', new THREE.Vector3(enemyBase.x + Math.cos(a) * 7, 0, enemyBase.z + Math.sin(a) * 7));
  }
  for (let i = 0; i < 2; i++) {
    game.spawnUnit('soldier', 'enemy', new THREE.Vector3(enemyBase.x + rand(-6, 6), 0, enemyBase.z + rand(-6, 6)));
  }

  // Resource clusters near each base + scattered.
  plantForest(game, playerBase, 9);
  plantForest(game, enemyBase, 9);
  plantBerries(game, playerBase);
  plantBerries(game, enemyBase);
  plantGold(game, playerBase);
  plantGold(game, enemyBase);

  // A handful of forests scattered across the middle of the map.
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Vector3(rand(-half, half), 0, rand(-half, half));
    if (c.distanceTo(playerBase) < 22 || c.distanceTo(enemyBase) < 22) continue;
    plantForest(game, c, rand(5, 10) | 0);
  }
  for (let i = 0; i < 4; i++) {
    game.spawnResource('gold', new THREE.Vector3(rand(-half, half), 0, rand(-half, half)));
  }
  for (let i = 0; i < 5; i++) {
    game.spawnResource('berry', new THREE.Vector3(rand(-half, half), 0, rand(-half, half)));
  }

  // Decorative rocks.
  for (let i = 0; i < 14; i++) {
    const rock = buildRock();
    rock.position.set(rand(-half, half), 0, rand(-half, half));
    game.scene.add(rock);
  }

  return { playerBase, enemyBase };
}

function plantForest(game: Game, center: THREE.Vector3, count: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(8, 16);
    game.spawnResource('tree', new THREE.Vector3(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r));
  }
}

function plantBerries(game: Game, base: THREE.Vector3) {
  const dir = base.clone().negate().normalize();
  const c = base.clone().addScaledVector(dir, 14);
  for (let i = 0; i < 4; i++) {
    game.spawnResource('berry', new THREE.Vector3(c.x + rand(-3, 3), 0, c.z + rand(-3, 3)));
  }
}

function plantGold(game: Game, base: THREE.Vector3) {
  const dir = new THREE.Vector3(-base.x, 0, base.z).normalize();
  const c = base.clone().addScaledVector(dir, 16);
  game.spawnResource('gold', new THREE.Vector3(c.x + rand(-2, 2), 0, c.z + rand(-2, 2)));
  game.spawnResource('gold', new THREE.Vector3(c.x + rand(-4, 4), 0, c.z + rand(-4, 4)));
}
