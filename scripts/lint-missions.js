#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const missionsDir = path.join(repoRoot, 'src', 'game', 'data', 'missions');
const tilesDir = path.join(repoRoot, 'src', 'world', 'tiles');

const errors = [];

const missionFiles = (await readdir(missionsDir)).filter((file) => file.endsWith('.json'));

const missionIdToFile = new Map();

function parseJsonFile(filePath) {
  return readFile(filePath, 'utf8').then((data) => JSON.parse(data));
}

function withinBounds(value, max, epsilon = 1e-6) {
  return value >= -epsilon && value <= max + epsilon;
}

for (const missionFile of missionFiles) {
  const missionPath = path.join(missionsDir, missionFile);
  let mission;
  try {
    mission = await parseJsonFile(missionPath);
  } catch (err) {
    errors.push(`Failed to parse mission file ${missionFile}: ${(err && err.message) || err}`);
    continue;
  }

  const missionId = mission?.id;
  if (typeof missionId !== 'string' || missionId.trim() === '') {
    errors.push(`Mission file ${missionFile} is missing a valid string id`);
    continue;
  }

  if (missionIdToFile.has(missionId)) {
    const otherFile = missionIdToFile.get(missionId);
    errors.push(`Mission id "${missionId}" is duplicated between ${otherFile} and ${missionFile}`);
  } else {
    missionIdToFile.set(missionId, missionFile);
  }

  const mapFileName = missionFile.replace('_mission.json', '_map.json');
  const mapPath = path.join(tilesDir, mapFileName);
  let map;
  try {
    map = await parseJsonFile(mapPath);
  } catch (err) {
    errors.push(
      `Missing or invalid map file for ${missionFile}. Expected ${mapFileName}. ${(err && err.message) || err}`,
    );
    continue;
  }

  const mapWidth = Number(map?.width);
  const mapHeight = Number(map?.height);
  if (!Number.isFinite(mapWidth) || !Number.isFinite(mapHeight)) {
    errors.push(`Map file ${mapFileName} is missing numeric width/height`);
    continue;
  }

  const contextLabel = `${missionId} (${missionFile})`;

  const checkPoint = (point, fieldName) => {
    if (typeof point !== 'object' || point === null) {
      errors.push(`${contextLabel}: ${fieldName} is not an object with tx/ty`);
      return;
    }
    const { tx, ty } = point;
    if (typeof tx !== 'number' || !Number.isFinite(tx)) {
      errors.push(`${contextLabel}: ${fieldName} has invalid tx value (${tx})`);
    } else if (!withinBounds(tx, mapWidth - 1)) {
      errors.push(`${contextLabel}: ${fieldName}.tx (${tx}) is outside map width 0-${mapWidth - 1}`);
    }
    if (typeof ty !== 'number' || !Number.isFinite(ty)) {
      errors.push(`${contextLabel}: ${fieldName} has invalid ty value (${ty})`);
    } else if (!withinBounds(ty, mapHeight - 1)) {
      errors.push(`${contextLabel}: ${fieldName}.ty (${ty}) is outside map height 0-${mapHeight - 1}`);
    }
  };

  if (mission.startPos) {
    checkPoint(mission.startPos, 'startPos');
  } else {
    errors.push(`${contextLabel}: missing startPos`);
  }

  if (!Array.isArray(mission.objectives) || mission.objectives.length === 0) {
    errors.push(`${contextLabel}: objectives must be a non-empty array`);
  } else {
    const objectiveIds = new Map();
    for (const [index, objective] of mission.objectives.entries()) {
      const objectiveLabel = `${fieldName('objectives', index)}`;
      const objId = objective?.id;
      if (typeof objId !== 'string' || objId.trim() === '') {
        errors.push(`${contextLabel}: ${objectiveLabel} is missing a valid id`);
      } else if (objectiveIds.has(objId)) {
        const firstIndex = objectiveIds.get(objId);
        errors.push(
          `${contextLabel}: objective id "${objId}" is duplicated at indices ${firstIndex} and ${index}`,
        );
      } else {
        objectiveIds.set(objId, index);
      }

      if (objective?.requires) {
        if (!Array.isArray(objective.requires)) {
          errors.push(`${contextLabel}: ${objectiveLabel} has invalid requires (expected array)`);
        } else {
          for (const requirement of objective.requires) {
            if (!objectiveIds.has(requirement)) {
              errors.push(
                `${contextLabel}: ${objectiveLabel} requires "${requirement}" which is not defined before it`,
              );
            }
          }
        }
      }

      if (objective?.at) {
        checkPoint(objective.at, `${objectiveLabel}.at`);
      } else {
        errors.push(`${contextLabel}: ${objectiveLabel} is missing an at coordinate`);
      }

      if (objective?.radiusTiles !== undefined && typeof objective.radiusTiles !== 'number') {
        errors.push(`${contextLabel}: ${objectiveLabel}.radiusTiles must be a number if present`);
      }
    }
  }

  if (Array.isArray(mission.enemySpawns)) {
    for (const [index, spawn] of mission.enemySpawns.entries()) {
      if (spawn?.at) {
        checkPoint(spawn.at, `${fieldName('enemySpawns', index)}.at`);
      } else {
        errors.push(`${contextLabel}: ${fieldName('enemySpawns', index)} is missing an at coordinate`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Mission data lint failed with the following issues:');
  for (const message of errors) {
    console.error(` - ${message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`✓ Checked ${missionFiles.length} mission file(s); no issues found.`);
}

function fieldName(base, index) {
  return `${base}[${index}]`;
}
