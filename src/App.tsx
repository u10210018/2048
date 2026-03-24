import { useEffect, useEffectEvent, useRef, useState, type TouchEvent } from "react";
import { type Direction, type Tile, createInitialGame, moveBoard } from "./game";

const BEST_SCORE_KEY = "classic-2048-best-score";

type GameViewState = ReturnType<typeof createInitialGame> & {
  hasWon: boolean;
  keepPlaying: boolean;
  isGameOver: boolean;
};

const scoreCardBaseClass =
  "rounded-[1.4rem] border border-black/5 bg-[#bbada0] px-4 py-3 text-center text-[#f9f6f2] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]";

function createGameState(): GameViewState {
  return {
    ...createInitialGame(),
    hasWon: false,
    keepPlaying: false,
    isGameOver: false,
  };
}

function readBestScore(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const storedValue = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsedValue = Number(storedValue);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function formatScore(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getDirectionFromKey(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

function getSwipeDirection(deltaX: number, deltaY: number): Direction | null {
  const minimumDistance = 28;

  if (Math.abs(deltaX) < minimumDistance && Math.abs(deltaY) < minimumDistance) {
    return null;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? "right" : "left";
  }

  return deltaY > 0 ? "down" : "up";
}

function getTileStyles(value: number): string {
  const styles: Record<number, string> = {
    2: "bg-[#eee4da] text-[#776e65]",
    4: "bg-[#ede0c8] text-[#776e65]",
    8: "bg-[#f2b179] text-[#f9f6f2]",
    16: "bg-[#f59563] text-[#f9f6f2]",
    32: "bg-[#f67c5f] text-[#f9f6f2]",
    64: "bg-[#f65e3b] text-[#f9f6f2]",
    128: "bg-[#edcf72] text-[#f9f6f2]",
    256: "bg-[#edcc61] text-[#f9f6f2]",
    512: "bg-[#edc850] text-[#f9f6f2]",
    1024: "bg-[#edc53f] text-[#f9f6f2]",
    2048: "bg-[#edc22e] text-[#f9f6f2]",
  };

  return styles[value] ?? "bg-[#3c3a32] text-[#f9f6f2]";
}

function getTileTextSize(value: number): string {
  if (value < 128) {
    return "text-3xl sm:text-4xl";
  }

  if (value < 1024) {
    return "text-2xl sm:text-3xl";
  }

  return "text-xl sm:text-2xl";
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={scoreCardBaseClass}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#eee4da]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold leading-none">{formatScore(value)}</p>
    </div>
  );
}

function TileCell({ tile }: { tile: Tile | null }) {
  return (
    <div className="relative aspect-square rounded-2xl bg-[#cdc1b4]/85">
      {tile ? (
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-2xl font-black tracking-[-0.06em] shadow-[0_10px_24px_rgba(140,119,97,0.18)] transition-all duration-150 ${getTileStyles(tile.value)} ${getTileTextSize(tile.value)}`}
        >
          {tile.value}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const [game, setGame] = useState<GameViewState>(() => createGameState());
  const [bestScore, setBestScore] = useState<number>(() => readBestScore());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const restartGame = useEffectEvent(() => {
    setGame(createGameState());
  });

  const continuePlaying = useEffectEvent(() => {
    setGame((previousGame) => ({
      ...previousGame,
      keepPlaying: true,
    }));
  });

  const playMove = useEffectEvent((direction: Direction) => {
    let nextBestScore = bestScore;

    setGame((previousGame) => {
      if (previousGame.isGameOver) {
        return previousGame;
      }

      if (previousGame.hasWon && !previousGame.keepPlaying) {
        return previousGame;
      }

      const moveResult = moveBoard(previousGame.board, direction, previousGame.nextTileId);

      if (!moveResult.moved) {
        return moveResult.isGameOver ? { ...previousGame, isGameOver: true } : previousGame;
      }

      const nextScore = previousGame.score + moveResult.scoreGained;
      nextBestScore = Math.max(nextBestScore, nextScore);

      return {
        ...moveResult,
        score: nextScore,
        hasWon: previousGame.hasWon || moveResult.reached2048,
        keepPlaying: previousGame.keepPlaying,
        isGameOver: moveResult.isGameOver,
      };
    });

    if (nextBestScore !== bestScore) {
      setBestScore(nextBestScore);
    }
  });

  useEffect(() => {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  }, [bestScore]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getDirectionFromKey(event.key);

      if (!direction) {
        return;
      }

      event.preventDefault();
      playMove(direction);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];

    if (!start) {
      return;
    }

    touchStartRef.current = null;

    const direction = getSwipeDirection(touch.clientX - start.x, touch.clientY - start.y);

    if (direction) {
      playMove(direction);
    }
  };

  const showWinOverlay = game.hasWon && !game.keepPlaying && !game.isGameOver;
  const showGameOverOverlay = game.isGameOver;

  return (
    <main className="min-h-screen px-4 py-6 text-[#5b5048] sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col rounded-[2rem] border border-white/65 bg-white/45 p-5 shadow-[0_25px_80px_rgba(110,93,74,0.14)] backdrop-blur md:p-8">
        <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <section className="flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center rounded-full border border-[#d4c2ab] bg-[#f7efe3] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#8b7355]">
                Classic 2048
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-[Georgia,'Times_New_Roman',serif] text-6xl font-bold leading-none tracking-[-0.08em] text-[#6a5845] sm:text-7xl">
                    2048
                  </p>
                  <p className="mt-3 max-w-md text-base leading-7 text-[#6d6158] sm:text-lg">
                    合併相同數字、一路推進到 2048。達標後仍可繼續挑戰更高分。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard label="Score" value={game.score} />
                  <ScoreCard label="Best" value={bestScore} />
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[#d8c9b7] bg-[#f8f2e8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={restartGame}
                  className="rounded-full bg-[#8f7a66] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f9f6f2] transition hover:bg-[#7a6655] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66]"
                >
                  New Game
                </button>
                <div className="rounded-full bg-[#ede3d2] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f7a66]">
                  {showGameOverOverlay ? "Game Over" : showWinOverlay ? "2048 Reached" : "Playing"}
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-6 text-[#74665a]">
                <p>
                  使用方向鍵或 <span className="font-semibold">WASD</span>{" "}
                  操作，手機上則可直接滑動棋盤。
                </p>
                <p>每一步只有真的移動或合併成功時，棋盤才會新增一個新方塊。</p>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[38rem]">
            <div
              className="relative aspect-square rounded-[2rem] border border-[#d3c1ab] bg-[#bbada0] p-3 shadow-[0_24px_50px_rgba(122,100,80,0.18)] sm:p-4 [touch-action:none]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="grid h-full grid-cols-4 gap-3 sm:gap-4">
                {game.board.flat().map((tile, index) => (
                  <TileCell key={index} tile={tile} />
                ))}
              </div>

              {(showWinOverlay || showGameOverOverlay) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-[#faf8ef]/78 p-6 text-center backdrop-blur-[2px]">
                  <div className="w-full max-w-sm rounded-[1.75rem] border border-[#decdb7] bg-[#fffaf3] px-6 py-7 shadow-[0_18px_40px_rgba(118,95,72,0.18)]">
                    <p className="font-[Georgia,'Times_New_Roman',serif] text-4xl font-bold tracking-[-0.06em] text-[#6f5d49]">
                      {showGameOverOverlay ? "Game Over" : "You Win"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#75675a]">
                      {showGameOverOverlay
                        ? "棋盤沒有可用的移動了，重新開始再挑一次。"
                        : "你已經合成 2048，可以繼續衝分，或直接重開新局。"}
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      {!showGameOverOverlay ? (
                        <button
                          type="button"
                          onClick={continuePlaying}
                          className="rounded-full bg-[#edc22e] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#5b4300] transition hover:bg-[#ddb01d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#edc22e]"
                        >
                          Continue
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={restartGame}
                        className="rounded-full bg-[#8f7a66] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f9f6f2] transition hover:bg-[#7a6655] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66]"
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
