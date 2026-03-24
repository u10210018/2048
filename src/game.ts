export const GRID_SIZE = 4;

export type Direction = "up" | "down" | "left" | "right";

export type Tile = {
  id: number;
  value: number;
};

export type Board = Array<Array<Tile | null>>;

type MoveLineResult = {
  line: Array<Tile | null>;
  moved: boolean;
  scoreGained: number;
  nextTileId: number;
  reached2048: boolean;
};

export type MoveResult = {
  board: Board;
  moved: boolean;
  scoreGained: number;
  nextTileId: number;
  reached2048: boolean;
  isGameOver: boolean;
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

function addRandomTile(board: Board, nextTileId: number): { board: Board; nextTileId: number } {
  const emptyPositions = getEmptyPositions(board);

  if (emptyPositions.length === 0) {
    return { board, nextTileId };
  }

  const positionIndex = Math.floor(Math.random() * emptyPositions.length);
  const position = emptyPositions[positionIndex];
  const nextBoard = cloneBoard(board);

  nextBoard[position.row][position.col] = {
    id: nextTileId,
    value: Math.random() < 0.9 ? 2 : 4,
  };

  return {
    board: nextBoard,
    nextTileId: nextTileId + 1,
  };
}

function moveLine(line: Array<Tile | null>, nextTileId: number): MoveLineResult {
  const compactLine = line.filter((tile): tile is Tile => tile !== null);
  const mergedLine: Array<Tile | null> = [];
  let scoreGained = 0;
  let reached2048 = false;
  let currentTileId = nextTileId;

  for (let index = 0; index < compactLine.length; index += 1) {
    const currentTile = compactLine[index];
    const nextTile = compactLine[index + 1];

    if (nextTile && nextTile.value === currentTile.value) {
      const mergedValue = currentTile.value * 2;

      mergedLine.push({
        id: currentTileId,
        value: mergedValue,
      });

      currentTileId += 1;
      scoreGained += mergedValue;
      reached2048 ||= mergedValue === 2048;
      index += 1;
      continue;
    }

    mergedLine.push(currentTile);
  }

  while (mergedLine.length < GRID_SIZE) {
    mergedLine.push(null);
  }

  const moved = mergedLine.some((tile, index) => tile?.id !== line[index]?.id);

  return {
    line: mergedLine,
    moved,
    scoreGained,
    nextTileId: currentTileId,
    reached2048,
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

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const currentLine = extractLine(board, direction, index);
    const moveResult = moveLine(currentLine, currentTileId);

    writeLine(nextBoard, direction, index, moveResult.line);

    currentTileId = moveResult.nextTileId;
    scoreGained += moveResult.scoreGained;
    moved ||= moveResult.moved;
    reached2048 ||= moveResult.reached2048;
  }

  if (!moved) {
    return {
      board,
      moved: false,
      scoreGained: 0,
      nextTileId,
      reached2048: false,
      isGameOver: !canMove(board),
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
  };
}
