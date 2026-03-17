import type { GridPoint } from '../layout/officeLayout';

const MOVES = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function key(point: GridPoint) {
  return `${point.x}:${point.y}`;
}

export function findPath(grid: boolean[][], start: GridPoint, end: GridPoint): GridPoint[] {
  if (start.x === end.x && start.y === end.y) return [start];

  const queue: GridPoint[] = [start];
  const visited = new Set([key(start)]);
  const parents = new Map<string, GridPoint>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const move of MOVES) {
      const next = { x: current.x + move.x, y: current.y + move.y };
      if (!grid[next.y]?.[next.x]) continue;

      const nextKey = key(next);
      if (visited.has(nextKey)) continue;

      visited.add(nextKey);
      parents.set(nextKey, current);

      if (next.x === end.x && next.y === end.y) {
        const path: GridPoint[] = [end];
        let cursor = current;
        while (!(cursor.x === start.x && cursor.y === start.y)) {
          path.unshift(cursor);
          cursor = parents.get(key(cursor))!;
        }
        path.unshift(start);
        return path;
      }

      queue.push(next);
    }
  }

  return [start];
}

