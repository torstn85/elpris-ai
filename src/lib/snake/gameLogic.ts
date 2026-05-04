// Pure-function speloglik för Elbil-Snake. Ingen React, ingen DOM.

import { GRID, INITIAL_SNAKE_LENGTH, POINTS } from './gameConfig';

export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GameStatus = 'playing' | 'paused' | 'gameover';

export interface GameState {
  snake: Position[];
  direction: Direction;
  chargeStation: Position;
  score: number;
  status: GameStatus;
  currentMoveCount: number;
  chargeStationsEaten: number;
}

export function getNextHead(head: Position, direction: Direction): Position {
  switch (direction) {
    case 'up':
      return { x: head.x, y: head.y - 1 };
    case 'down':
      return { x: head.x, y: head.y + 1 };
    case 'left':
      return { x: head.x - 1, y: head.y };
    case 'right':
      return { x: head.x + 1, y: head.y };
  }
}

export function isWallCollision(pos: Position): boolean {
  return pos.x < 0 || pos.x >= GRID.COLS || pos.y < 0 || pos.y >= GRID.ROWS;
}

export function isSelfCollision(pos: Position, snake: Position[]): boolean {
  return snake.some((seg) => seg.x === pos.x && seg.y === pos.y);
}

export function spawnChargeStation(snake: Position[]): Position {
  while (true) {
    const candidate: Position = {
      x: Math.floor(Math.random() * GRID.COLS),
      y: Math.floor(Math.random() * GRID.ROWS),
    };
    if (!isSelfCollision(candidate, snake)) {
      return candidate;
    }
  }
}

export function createInitialState(): GameState {
  const startX = Math.floor(GRID.COLS / 2);
  const startY = Math.floor(GRID.ROWS / 2);
  const snake: Position[] = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    snake.push({ x: startX - i, y: startY });
  }
  const chargeStation = spawnChargeStation(snake);
  return {
    snake,
    direction: 'right',
    chargeStation,
    score: 0,
    status: 'playing',
    currentMoveCount: 0,
    chargeStationsEaten: 0,
  };
}

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  const head = state.snake[0];
  const nextHead = getNextHead(head, state.direction);

  if (isWallCollision(nextHead)) {
    return {
      ...state,
      status: 'gameover',
      currentMoveCount: state.currentMoveCount + 1,
    };
  }

  const pickup =
    nextHead.x === state.chargeStation.x &&
    nextHead.y === state.chargeStation.y;

  // Tail flyttas innan vi prövar self-collision: utan pickup försvinner sista
  // segmentet, och då är det giltigt att flytta huvudet dit.
  const bodyAfterMove = pickup ? state.snake : state.snake.slice(0, -1);

  if (isSelfCollision(nextHead, bodyAfterMove)) {
    return {
      ...state,
      status: 'gameover',
      currentMoveCount: state.currentMoveCount + 1,
    };
  }

  const newSnake: Position[] = [nextHead, ...bodyAfterMove];

  if (pickup) {
    return {
      ...state,
      snake: newSnake,
      chargeStation: spawnChargeStation(newSnake),
      score: state.score + POINTS.CHARGE_STATION,
      currentMoveCount: state.currentMoveCount + 1,
      chargeStationsEaten: state.chargeStationsEaten + 1,
    };
  }

  return {
    ...state,
    snake: newSnake,
    currentMoveCount: state.currentMoveCount + 1,
  };
}
