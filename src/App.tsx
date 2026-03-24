import { Description, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Icon, addIcon, type IconifyIcon } from "@iconify/react";
import { useEffect, useEffectEvent, useRef, useState, type TouchEvent } from "react";
import {
  type Board,
  type Direction,
  type MoveResult,
  type Tile,
  createInitialGame,
  moveBoard,
} from "./game";

const BEST_SCORE_KEY = "classic-2048-best-score";
const MOVE_ANIMATION_MS = 150;
const POP_ANIMATION_MS = 180;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type Notice = {
  tone: "success" | "info";
  message: string;
};

function createAppIcon(body: string): IconifyIcon {
  return {
    body,
    width: 24,
    height: 24,
  };
}

const appIcons = {
  "app:plus": createAppIcon(
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7v14"/>',
  ),
  "app:circle-x": createAppIcon(
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9l-6 6m0-6l6 6"/></g>',
  ),
  "app:trophy": createAppIcon(
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978m7-7.318v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978M18 9h1.5a1 1 0 0 0 0-5H18M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm0 0H4.5a1 1 0 0 1 0-5H6"/></g>',
  ),
  "app:gamepad-2": createAppIcon(
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 11h4M8 9v4m7-1h.01M18 10h.01m-.69-5H6.68a4 4 0 0 0-3.978 3.59l-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258q-.01-.075-.017-.151A4 4 0 0 0 17.32 5"/>',
  ),
  "app:book-open-text": createAppIcon(
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v14m4-9h2m-2-4h2M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4a4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3a3 3 0 0 0-3-3zm3-6h2M6 8h2"/>',
  ),
  "app:chevron-down": createAppIcon(
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9l6 6l6-6"/>',
  ),
  "app:arrow-right": createAppIcon(
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7l7 7l-7 7"/>',
  ),
  "app:rotate-ccw": createAppIcon(
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></g>',
  ),
  "app:download": createAppIcon(
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5l5-5"/><path d="M5 21h14"/></g>',
  ),
} satisfies Record<string, IconifyIcon>;

Object.entries(appIcons).forEach(([name, icon]) => {
  addIcon(name, icon);
});

type GameViewState = ReturnType<typeof createInitialGame> & {
  hasWon: boolean;
  keepPlaying: boolean;
  isGameOver: boolean;
};

type BoardTile = Tile & {
  row: number;
  col: number;
};

type RenderTile = BoardTile & {
  isSliding: boolean;
  isFresh: boolean;
  isMerged: boolean;
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

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(navigatorWithStandalone.standalone)
  );
}

function isAppleMobileDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  return new Intl.NumberFormat("zh-Hant-TW").format(value);
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

function getBoardTiles(board: Board): BoardTile[] {
  return board.flatMap((row, rowIndex) =>
    row.flatMap((tile, colIndex) => (tile ? [{ ...tile, row: rowIndex, col: colIndex }] : [])),
  );
}

function createSettledRenderTiles(
  board: Board,
  options?: {
    freshTileIds?: Set<number>;
    mergedTileIds?: Set<number>;
  },
): RenderTile[] {
  const freshTileIds = options?.freshTileIds ?? new Set<number>();
  const mergedTileIds = options?.mergedTileIds ?? new Set<number>();

  return getBoardTiles(board).map((tile) => ({
    ...tile,
    isSliding: false,
    isFresh: freshTileIds.has(tile.id),
    isMerged: mergedTileIds.has(tile.id),
  }));
}

function createMotionRenderTiles(moveResult: MoveResult, target: "from" | "to"): RenderTile[] {
  return moveResult.animation.motions.map((motion) => ({
    id: motion.id,
    value: motion.value,
    row: motion[target].row,
    col: motion[target].col,
    isSliding: target === "to",
    isFresh: false,
    isMerged: false,
  }));
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={scoreCardBaseClass}>
      <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-[#eee4da] uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl leading-none font-bold">{formatScore(value)}</p>
    </div>
  );
}

function AppIcon({ icon, className }: { icon: string; className?: string }) {
  return (
    <Icon
      icon={icon}
      aria-hidden="true"
      width="1em"
      height="1em"
      className={`shrink-0 ${className ?? ""}`}
    />
  );
}

function BackgroundCell() {
  return <div className="relative aspect-square rounded-2xl bg-[#cdc1b4]/85" />;
}

function TileSprite({ tile }: { tile: RenderTile }) {
  const movementClass = tile.isSliding ? "board-tile--moving" : "board-tile--still";
  const emphasisClass = tile.isFresh
    ? "board-tile__surface--fresh"
    : tile.isMerged
      ? "board-tile__surface--merged"
      : "";

  return (
    <div
      className={`board-tile ${movementClass}`}
      style={{
        transform: `translate(calc(${tile.col} * (100% + var(--board-gap))), calc(${tile.row} * (100% + var(--board-gap))))`,
        zIndex: tile.isSliding ? 2 : 1,
      }}
    >
      <div
        className={`board-tile__surface flex items-center justify-center rounded-2xl font-black tracking-[-0.06em] shadow-[0_10px_24px_rgba(140,119,97,0.18)] ${emphasisClass} ${getTileStyles(tile.value)} ${getTileTextSize(tile.value)}`}
      >
        {tile.value}
      </div>
    </div>
  );
}

function App() {
  const initialRenderTilesRef = useRef<RenderTile[]>([]);
  const [game, setGame] = useState<GameViewState>(() => {
    const initialGame = createGameState();
    initialRenderTilesRef.current = createSettledRenderTiles(initialGame.board);
    return initialGame;
  });
  const [bestScore, setBestScore] = useState<number>(() => readBestScore());
  const [isHelpOpen, setIsHelpOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("help") === "1",
  );
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isAppInstalled, setIsAppInstalled] = useState(() => isStandaloneDisplay());
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [renderTiles, setRenderTiles] = useState<RenderTile[]>(() => initialRenderTilesRef.current);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameRef = useRef(game);
  const bestScoreRef = useRef(bestScore);
  const animationFrameRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const popTimerRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const clearAnimation = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    if (popTimerRef.current !== null) {
      window.clearTimeout(popTimerRef.current);
      popTimerRef.current = null;
    }
  };

  const finishWithBoard = useEffectEvent((board: Board) => {
    setRenderTiles(createSettledRenderTiles(board));
  });

  const animateMove = useEffectEvent((moveResult: MoveResult) => {
    clearAnimation();

    const highlightedTileIds = moveResult.animation.spawnedTile
      ? new Set([moveResult.animation.spawnedTile.id])
      : undefined;
    const mergedTileIds = new Set(moveResult.animation.mergedTiles.map((tile) => tile.id));

    isAnimatingRef.current = true;
    setRenderTiles(createMotionRenderTiles(moveResult, "from"));

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setRenderTiles(createMotionRenderTiles(moveResult, "to"));
    });

    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      isAnimatingRef.current = false;
      setRenderTiles(
        createSettledRenderTiles(moveResult.board, {
          freshTileIds: highlightedTileIds,
          mergedTileIds,
        }),
      );

      popTimerRef.current = window.setTimeout(() => {
        popTimerRef.current = null;
        finishWithBoard(moveResult.board);
      }, POP_ANIMATION_MS);
    }, MOVE_ANIMATION_MS);
  });

  const restartGame = useEffectEvent(() => {
    clearAnimation();
    isAnimatingRef.current = false;

    const nextGame = createGameState();
    gameRef.current = nextGame;
    setGame(nextGame);
    setRenderTiles(createSettledRenderTiles(nextGame.board));
  });

  const continuePlaying = useEffectEvent(() => {
    const nextGame = {
      ...gameRef.current,
      keepPlaying: true,
    };

    gameRef.current = nextGame;
    setGame(nextGame);
  });

  const openRestartConfirm = useEffectEvent(() => {
    setIsRestartConfirmOpen(true);
  });

  const closeRestartConfirm = useEffectEvent(() => {
    setIsRestartConfirmOpen(false);
  });

  const confirmRestart = useEffectEvent(() => {
    setIsRestartConfirmOpen(false);
    restartGame();
  });

  const closeInstallGuide = useEffectEvent(() => {
    setIsInstallGuideOpen(false);
  });

  const triggerInstall = useEffectEvent(async () => {
    if (installPromptEvent) {
      await installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;

      if (outcome === "dismissed") {
        setNotice({
          tone: "info",
          message: "已取消安裝，之後仍可再試一次。",
        });
      }

      setInstallPromptEvent(null);
      return;
    }

    setIsInstallGuideOpen(true);
  });

  const playMove = useEffectEvent((direction: Direction) => {
    if (isAnimatingRef.current) {
      return;
    }

    const previousGame = gameRef.current;

    if (previousGame.isGameOver || (previousGame.hasWon && !previousGame.keepPlaying)) {
      return;
    }

    const moveResult = moveBoard(previousGame.board, direction, previousGame.nextTileId);

    if (!moveResult.moved) {
      if (moveResult.isGameOver && !previousGame.isGameOver) {
        const nextGame = {
          ...previousGame,
          isGameOver: true,
        };

        gameRef.current = nextGame;
        setGame(nextGame);
      }

      return;
    }

    const nextScore = previousGame.score + moveResult.scoreGained;
    const nextGame = {
      ...moveResult,
      score: nextScore,
      hasWon: previousGame.hasWon || moveResult.reached2048,
      keepPlaying: previousGame.keepPlaying,
      isGameOver: moveResult.isGameOver,
    };

    gameRef.current = nextGame;
    setGame(nextGame);
    animateMove(moveResult);

    const nextBestScore = Math.max(bestScoreRef.current, nextScore);

    if (nextBestScore !== bestScoreRef.current) {
      bestScoreRef.current = nextBestScore;
      setBestScore(nextBestScore);
    }
  });

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  useEffect(() => {
    return () => {
      clearAnimation();
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  }, [bestScore]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const displayModeMedia = window.matchMedia("(display-mode: standalone)");

    const syncInstalledState = () => {
      setIsAppInstalled(isStandaloneDisplay());
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
      setNotice({
        tone: "success",
        message: "2048! 已安裝完成，現在可以像 App 一樣開啟。",
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    syncInstalledState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    displayModeMedia.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      displayModeMedia.removeEventListener("change", syncInstalledState);
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

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
  const canManualInstall = !isAppInstalled && installPromptEvent === null && isAppleMobileDevice();
  const showInstallAction = !isAppInstalled && (installPromptEvent !== null || canManualInstall);
  const statusIcon = showGameOverOverlay
    ? "app:circle-x"
    : showWinOverlay
      ? "app:trophy"
      : "app:gamepad-2";
  const statusLabel = showGameOverOverlay ? "無法移動" : showWinOverlay ? "已達 2048" : "遊玩中";

  return (
    <>
      <main className="min-h-screen px-4 py-5 text-[#5b5048] sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col rounded-4xl border border-white/65 bg-white/45 p-5 shadow-[0_25px_80px_rgba(110,93,74,0.14)] backdrop-blur md:p-8">
          {isOffline ? (
            <div className="mb-4 flex items-start gap-3 rounded-[1.35rem] border border-[#e0d0bb] bg-[#fff5e9] px-4 py-3 text-sm leading-6 text-[#7a695a] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <AppIcon icon="app:circle-x" className="mt-0.5 text-base text-[#b36a42]" />
              <div>
                <p className="font-semibold text-[#795f49]">目前為離線模式</p>
                <p>已快取的 2048! 仍可正常遊玩；重新連線後會自動恢復更新。</p>
              </div>
            </div>
          ) : null}

          <div className="grid flex-1 gap-5 sm:gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
            <section className="order-2 flex flex-col justify-between gap-4 sm:gap-6 lg:order-1">
              <div className="space-y-4 sm:space-y-5">
                <div className="inline-flex w-fit items-center rounded-full border border-[#d4c2ab] bg-[#f7efe3] px-4 py-2 text-[0.72rem] font-semibold tracking-[0.28em] text-[#8b7355] uppercase">
                  經典數字合併遊戲
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="font-[Georgia,'Times_New_Roman',serif] text-5xl leading-none font-bold tracking-[-0.08em] text-[#6a5845] sm:text-7xl">
                      2048!
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#6d6158] sm:mt-3 sm:text-lg sm:leading-7">
                      經典 2048 小遊戲，支援手機滑動、安裝成 App、離線遊玩與最佳分數保存。
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <ScoreCard label="分數" value={game.score} />
                    <ScoreCard label="最佳" value={bestScore} />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[#d8c9b7] bg-[#f8f2e8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={openRestartConfirm}
                      aria-label="開始新遊戲"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#8f7a66] text-[#f9f6f2] transition hover:bg-[#7a6655] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs sm:font-semibold sm:tracking-[0.18em] sm:uppercase"
                    >
                      <AppIcon icon="app:plus" className="text-base sm:text-sm" />
                      <span className="sr-only sm:not-sr-only">新遊戲</span>
                    </button>
                    {showInstallAction ? (
                      <button
                        type="button"
                        onClick={triggerInstall}
                        aria-label="安裝 2048! App"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c9b7] bg-[#fff8ee] text-[#8f7a66] transition hover:bg-[#f7efe2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs sm:font-semibold sm:tracking-[0.18em] sm:uppercase"
                      >
                        <AppIcon icon="app:download" className="text-base sm:text-sm" />
                        <span className="sr-only sm:not-sr-only">安裝 App</span>
                      </button>
                    ) : null}
                    <div
                      aria-label={statusLabel}
                      className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full bg-[#ede3d2] px-3 text-sm font-semibold tracking-[0.18em] text-[#8f7a66] sm:h-auto sm:px-4 sm:py-3 sm:uppercase"
                    >
                      <AppIcon icon={statusIcon} className="text-base" />
                      <span className="hidden sm:inline">{statusLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-expanded={isHelpOpen}
                    aria-label={isHelpOpen ? "收合玩法說明" : "展開玩法說明"}
                    onClick={() => {
                      setIsHelpOpen((previousValue) => !previousValue);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c9b7] bg-[#fff8ee] text-[#8f7a66] transition hover:bg-[#f7efe2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:font-semibold sm:tracking-[0.16em] sm:uppercase"
                  >
                    <AppIcon icon="app:book-open-text" className="text-base" />
                    <span className="sr-only sm:not-sr-only">玩法</span>
                    <AppIcon
                      icon="app:chevron-down"
                      className={`hidden text-base transition-transform duration-200 sm:inline-block ${isHelpOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                <div
                  className={`grid overflow-hidden transition-[grid-template-rows,margin-top,opacity] duration-200 ${
                    isHelpOpen
                      ? "mt-5 grid-rows-[1fr] opacity-100"
                      : "mt-0 grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-3 text-sm leading-6 text-[#74665a]">
                      <p>
                        使用方向鍵或 <span className="font-semibold">WASD</span>{" "}
                        操作；手機上則可直接滑動棋盤。
                      </p>
                      <p>每一步只有在真的移動或合併成功時，棋盤才會新增一個新方塊。</p>
                      <p>合成出 2048 後可以繼續挑戰更高分數。</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="order-1 mx-auto w-full max-w-152 lg:order-2">
              <div
                className="game-board relative aspect-square touch-none rounded-4xl border border-[#d3c1ab] bg-[#bbada0] shadow-[0_24px_50px_rgba(122,100,80,0.18)]"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="board-background grid h-full grid-cols-4">
                  {Array.from({ length: 16 }, (_, index) => (
                    <BackgroundCell key={index} />
                  ))}
                </div>

                <div className="board-tile-layer">
                  {renderTiles.map((tile) => (
                    <TileSprite key={tile.id} tile={tile} />
                  ))}
                </div>

                {(showWinOverlay || showGameOverOverlay) && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-4xl bg-[#faf8ef]/78 p-6 text-center backdrop-blur-[2px]">
                    <div className="w-full max-w-sm rounded-[1.75rem] border border-[#decdb7] bg-[#fffaf3] px-6 py-7 shadow-[0_18px_40px_rgba(118,95,72,0.18)]">
                      <p className="font-[Georgia,'Times_New_Roman',serif] text-4xl font-bold tracking-[-0.06em] text-[#6f5d49]">
                        {showGameOverOverlay ? "遊戲結束" : "你完成了 2048!"}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-[#75675a]">
                        {showGameOverOverlay
                          ? "棋盤沒有可用的移動了，重新開始再挑一次。"
                          : "你已經合成 2048!，可以繼續衝分，或直接重開新局。"}
                      </p>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        {!showGameOverOverlay ? (
                          <button
                            type="button"
                            onClick={continuePlaying}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#edc22e] px-5 py-3 text-sm font-semibold tracking-[0.18em] text-[#5b4300] uppercase transition hover:bg-[#ddb01d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#edc22e]"
                          >
                            <AppIcon icon="app:arrow-right" className="text-base" />
                            繼續挑戰
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={openRestartConfirm}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8f7a66] px-5 py-3 text-sm font-semibold tracking-[0.18em] text-[#f9f6f2] uppercase transition hover:bg-[#7a6655] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66]"
                        >
                          <AppIcon icon="app:rotate-ccw" className="text-base" />
                          重新開始
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

      <Dialog open={isRestartConfirmOpen} onClose={closeRestartConfirm} className="relative z-30">
        <div className="fixed inset-0 bg-[#faf8ef]/76 backdrop-blur-[3px]" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-[1.75rem] border border-[#decdb7] bg-[#fffaf3] px-6 py-7 text-center shadow-[0_18px_40px_rgba(118,95,72,0.18)]">
            <DialogTitle className="font-[Georgia,'Times_New_Roman',serif] text-3xl font-bold tracking-[-0.06em] text-[#6f5d49]">
              確定要開始新局？
            </DialogTitle>
            <Description className="mt-3 text-sm leading-6 text-[#75675a]">
              目前進度會直接清除。確認後會重新產生新的棋盤。
            </Description>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={closeRestartConfirm}
                className="inline-flex items-center justify-center rounded-full border border-[#d8c9b7] bg-[#fff8ee] px-5 py-3 text-sm font-semibold tracking-[0.18em] text-[#8f7a66] uppercase transition hover:bg-[#f7efe2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmRestart}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8f7a66] px-5 py-3 text-sm font-semibold tracking-[0.18em] text-[#f9f6f2] uppercase transition hover:bg-[#7a6655] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66]"
              >
                <AppIcon icon="app:rotate-ccw" className="text-base" />
                確認重開
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={isInstallGuideOpen} onClose={closeInstallGuide} className="relative z-30">
        <div className="fixed inset-0 bg-[#faf8ef]/76 backdrop-blur-[3px]" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-[1.75rem] border border-[#decdb7] bg-[#fffaf3] px-6 py-7 text-left shadow-[0_18px_40px_rgba(118,95,72,0.18)]">
            <DialogTitle className="font-[Georgia,'Times_New_Roman',serif] text-3xl font-bold tracking-[-0.06em] text-[#6f5d49]">
              將 2048! 加到主畫面
            </DialogTitle>
            <Description className="mt-3 text-sm leading-6 text-[#75675a]">
              {canManualInstall
                ? "在 iPhone 或 iPad 上可透過 Safari 的分享選單手動安裝。"
                : "你的瀏覽器目前沒有提供安裝提示，稍後可以再試一次。"}
            </Description>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[#75675a]">
              <li>1. 點一下瀏覽器底部或頂部的「分享」按鈕。</li>
              <li>2. 在選單中選擇「加入主畫面」。</li>
              <li>3. 確認名稱為「2048!」後完成安裝。</li>
            </ol>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeInstallGuide}
                className="inline-flex items-center justify-center rounded-full border border-[#d8c9b7] bg-[#fff8ee] px-5 py-3 text-sm font-semibold tracking-[0.18em] text-[#8f7a66] uppercase transition hover:bg-[#f7efe2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7a66]"
              >
                我知道了
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {notice ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center sm:justify-end">
          <div
            className={`pointer-events-auto max-w-sm rounded-[1.25rem] border px-4 py-3 text-sm leading-6 shadow-[0_14px_28px_rgba(110,93,74,0.16)] ${
              notice.tone === "success"
                ? "border-[#d6c3a5] bg-[#fff5df] text-[#715534]"
                : "border-[#d9cab6] bg-[#fffaf1] text-[#75675a]"
            }`}
          >
            {notice.message}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
