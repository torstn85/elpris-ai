'use client';

import { useEffect, useRef, useState } from 'react';
import { CELL_SIZE, GRID, TICK_MS } from '@/lib/snake/gameConfig';
import {
  createInitialState,
  tick,
  type Direction,
  type GameState,
} from '@/lib/snake/gameLogic';

const CANVAS_WIDTH = GRID.COLS * CELL_SIZE;
const CANVAS_HEIGHT = GRID.ROWS * CELL_SIZE;

const COLOR_BG = '#0A2540';
const COLOR_SNAKE = '#00E5FF';
const COLOR_CHARGE = '#22C55E';

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function keyToDirection(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

export default function ElbilSnake() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const newDir = keyToDirection(e.key);
      if (!newDir) return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
      setState((prev) => {
        if (prev.status !== 'playing') return prev;
        if (OPPOSITE[prev.direction] === newDir) return prev;
        if (prev.direction === newDir) return prev;
        return { ...prev, direction: newDir };
      });
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = setInterval(() => {
      setState((prev) => tick(prev));
    }, TICK_MS.LEVEL_1);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = COLOR_SNAKE;
    for (const seg of state.snake) {
      ctx.fillRect(
        seg.x * CELL_SIZE,
        seg.y * CELL_SIZE,
        CELL_SIZE - 1,
        CELL_SIZE - 1,
      );
    }

    ctx.fillStyle = COLOR_CHARGE;
    ctx.fillRect(
      state.chargeStation.x * CELL_SIZE,
      state.chargeStation.y * CELL_SIZE,
      CELL_SIZE - 1,
      CELL_SIZE - 1,
    );
  }, [state]);

  function handleRestart() {
    setState(createInitialState());
  }

  return (
    <div>
      <h2 style={{ color: 'white', fontSize: 24, marginBottom: 8 }}>
        kWh laddat: {state.score}
      </h2>
      <div style={{ position: 'relative', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ display: 'block' }}
        />
        {state.status === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <p style={{ color: 'white', fontSize: 32, margin: 0 }}>Game Over</p>
            <button
              onClick={handleRestart}
              style={{
                padding: '8px 16px',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Spela igen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
