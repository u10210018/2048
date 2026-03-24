export const GRID_SIZE = 4;

export type Direction = "up" | "down" | "left" | "right";

export type Tile = {
  id: number;
  value: number;
};

export type Board = Array<Array<Tile | null>>;

export type Position = {
  row: number;
  col: number;
};

export type TileMotion = {
  id: number;
  value: number;
  from: Position;
  to: Position;
  merged: boolean;
};

export type AnimatedTile = Tile & Position;

type MoveLineResult = {
  line: Array<Tile | null>;
  moved: boolean;
  scoreGained: number;
  nextTileId: number;
  reached2048: boolean;
  motions: Array<{
    tile: Tile;
    fromIndex: number;
    toIndex: number;
    merged: boolean;
  }>;
  mergedTiles: Array<{
    tile: Tile;
    atIndex: number;
  }>;
};

export type MoveResult = {
  board: Board;
  moved: boolean;
  scoreGained: number;
  nextTileId: number;
  reached2048: boolean;
  isGameOver: boolean;
  animation: {
    motions: TileMotion[];
    mergedTiles: AnimatedTile[];
    spawnedTile: AnimatedTile | null;
  };
};

type GameSnapshot = {
  board: Board;
  score: number;
  nextTileId: number;
};

function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function getEmptyPositions(board: Board): Array<{ row: number; col: number }> {
  return board.flatMap((row, rowIndex) =>
    row.flatMap((tile, colIndex) => (tile ? [] : [{ row: rowIndex, col: colIndex }])),
  );
}

function addRandomTile(
  board: Board,
  nextTileId: number,
): { board: Board; nextTileId: number; spawnedTile: AnimatedTile | null } {
  const emptyPositions = getEmptyPositions(board);

  if (emptyPositions.length === 0) {
    return { board, nextTileId, spawnedTile: null };
  }

  const positionIndex = Math.floor(Math.random() * emptyPositions.length);
  const position = emptyPositions[positionIndex];
  const nextBoard = cloneBoard(board);
  const spawnedTile = {
    id: nextTileId,
    value: Math.random() < 0.9 ? 2 : 4,
    row: position.row,
    col: position.col,
  };

  nextBoard[position.row][position.col] = {
    id: spawnedTile.id,
    value: spawnedTile.value,
  };

  return {
    board: nextBoard,
    nextTileId: nextTileId + 1,
    spawnedTile,
  };
}

function moveLine(line: Array<Tile | null>, nextTileId: number): MoveLineResult {
  const compactLine = line.flatMap((tile, index) => (tile ? [{ tile, index }] : []));
  const mergedLine: Array<Tile | null> = [];
  let scoreGained = 0;
  let reached2048 = false;
  let currentTileId = nextTileId;
  const motions: MoveLineResult["motions"] = [];
  const mergedTiles: MoveLineResult["mergedTiles"] = [];

  for (let index = 0; index < compactLine.length; index += 1) {
    const currentTile = compactLine[index];
    const nextTile = compactLine[index + 1];
    const targetIndex = mergedLine.length;

    if (nextTile && nextTile.tile.value === currentTile.tile.value) {
      const mergedValue = currentTile.tile.value * 2;
      const mergedTile = {
        id: currentTileId,
        value: mergedValue,
      };

      mergedLine.push(mergedTile);
      motions.push({
        tile: currentTile.tile,
        fromIndex: currentTile.index,
        toIndex: targetIndex,
        merged: true,
      });
      motions.push({
        tile: nextTile.tile,
        fromIndex: nextTile.index,
        toIndex: targetIndex,
        merged: true,
      });
      mergedTiles.push({
        tile: mergedTile,
        atIndex: targetIndex,
      });

      currentTileId += 1;
      scoreGained += mergedValue;
      reached2048 ||= mergedValue === 2048;
      index += 1;
      continue;
    }

    mergedLine.push(currentTile.tile);
    motions.push({
      tile: currentTile.tile,
      fromIndex: currentTile.index,
      toIndex: targetIndex,
      merged: false,
    });
  }

  while (mergedLine.length < GRID_SIZE) {
    mergedLine.push(null);
  }

  const moved = motions.some((motion) => motion.fromIndex !== motion.toIndex || motion.merged);

  return {
    line: mergedLine,
    moved,
    scoreGained,
    nextTileId: currentTileId,
    reached2048,
    motions,
    mergedTiles,
  };
}

function extractLine(board: Board, direction: Direction, index: number): Array<Tile | null> {
  switch (direction) {
    case "left":
      return [...board[index]];
    case "right":
      return [...board[index]].reverse();
    case "up":
      return board.map((row) => row[index]);
    case "down":
      return board.map((row) => row[index]).reverse();
  }
}

function writeLine(
  board: Board,
  direction: Direction,
  index: number,
  line: Array<Tile | null>,
): void {
  const values = direction === "right" || direction === "down" ? [...line].reverse() : line;

  values.forEach((tile, lineIndex) => {
    if (direction === "left" || direction === "right") {
      board[index][lineIndex] = tile;
      return;
    }

    board[lineIndex][index] = tile;
  });
}

function resolveLinePosition(
  direction: Direction,
  fixedIndex: number,
  lineIndex: number,
): Position {
  switch (direction) {
    case "left":
      return { row: fixedIndex, col: lineIndex };
    case "right":
      return { row: fixedIndex, col: GRID_SIZE - 1 - lineIndex };
    case "up":
      return { row: lineIndex, col: fixedIndex };
    case "down":
      return { row: GRID_SIZE - 1 - lineIndex, col: fixedIndex };
  }
}

function canMove(board: Board): boolean {
  if (getEmptyPositions(board).length > 0) {
    return true;
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = board[row][col];

      if (!tile) {
        continue;
      }

      const rightTile = board[row][col + 1];
      const downTile = board[row + 1]?.[col];

      if (rightTile?.value === tile.value || downTile?.value === tile.value) {
        return true;
      }
    }
  }

  return false;
}

export function createInitialGame(): GameSnapshot {
  let board = createEmptyBoard();
  let nextTileId = 1;

  const firstSpawn = addRandomTile(board, nextTileId);
  board = firstSpawn.board;
  nextTileId = firstSpawn.nextTileId;

  const secondSpawn = addRandomTile(board, nextTileId);

  return {
    board: secondSpawn.board,
    score: 0,
    nextTileId: secondSpawn.nextTileId,
  };
}

export function moveBoard(board: Board, direction: Direction, nextTileId: number): MoveResult {
  const nextBoard = createEmptyBoard();
  let currentTileId = nextTileId;
  let scoreGained = 0;
  let moved = false;
  let reached2048 = false;
  const motions: TileMotion[] = [];
  const mergedTiles: AnimatedTile[] = [];

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const currentLine = extractLine(board, direction, index);
    const moveResult = moveLine(currentLine, currentTileId);

    writeLine(nextBoard, direction, index, moveResult.line);

    currentTileId = moveResult.nextTileId;
    scoreGained += moveResult.scoreGained;
    moved ||= moveResult.moved;
    reached2048 ||= moveResult.reached2048;

    motions.push(
      ...moveResult.motions.map((motion) => ({
        id: motion.tile.id,
        value: motion.tile.value,
        from: resolveLinePosition(direction, index, motion.fromIndex),
        to: resolveLinePosition(direction, index, motion.toIndex),
        merged: motion.merged,
      })),
    );
    mergedTiles.push(
      ...moveResult.mergedTiles.map((mergedTile) => ({
        id: mergedTile.tile.id,
        value: mergedTile.tile.value,
        ...resolveLinePosition(direction, index, mergedTile.atIndex),
      })),
    );
  }

  if (!moved) {
    return {
      board,
      moved: false,
      scoreGained: 0,
      nextTileId,
      reached2048: false,
      isGameOver: !canMove(board),
      animation: {
        motions: [],
        mergedTiles: [],
        spawnedTile: null,
      },
    };
  }

  const withNewTile = addRandomTile(nextBoard, currentTileId);

  return {
    board: withNewTile.board,
    moved: true,
    scoreGained,
    nextTileId: withNewTile.nextTileId,
    reached2048,
    isGameOver: !canMove(withNewTile.board),
    animation: {
      motions,
      mergedTiles,
      spawnedTile: withNewTile.spawnedTile,
    },
  };
}
