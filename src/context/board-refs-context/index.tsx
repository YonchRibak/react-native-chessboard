import type { Move, Square } from 'chess.js';
import React, {
  createContext,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  ChessboardState,
  getChessboardState,
} from '../../helpers/get-chessboard-state';
import type { ChessPieceRef } from '../../components/piece';
import type { HighlightedSquareRefType } from '../../components/highlighted-squares/highlighted-square';

import { useChessEngine } from '../chess-engine-context/hooks';
import { useSetBoard } from '../board-context/hooks';
import { useChessboardProps } from '../props-context/hooks';

const PieceRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<ChessPieceRef>
> | null> | null>(null);

const SquareRefsContext = createContext<React.MutableRefObject<Record<
  Square,
  React.MutableRefObject<HighlightedSquareRefType>
> | null> | null>(null);

export type ChessboardRef = {
  undo: () => void;
  move: (_: {
    from: Square;
    to: Square;
  }) => Promise<Move | undefined> | undefined;
  highlight: (_: { square: Square; color?: string }) => void;
  resetAllHighlightedSquares: () => void;
  resetBoard: (fen?: string) => void;
  getState: () => ChessboardState;
};

const BoardRefsContextProviderComponent = React.forwardRef<
  ChessboardRef,
  { children?: React.ReactNode }
>(({ children }, ref) => {
  const chess = useChessEngine();
  let board: ReturnType<typeof chess.board>;
  try {
    board = chess.board();
  } catch (error) {
    // If board() fails, use an empty 8x8 array
    board = Array(8).fill(null).map(() => Array(8).fill(null)) as any;
  }
  const setBoard = useSetBoard();
  const { skipValidation } = useChessboardProps();

  // There must be a better way of doing this.
  const generateBoardRefs = useCallback(() => {
    let acc = {};
    for (let x = 0; x < board.length; x++) {
      const row = board[x];
      for (let y = 0; y < row.length; y++) {
        const col = String.fromCharCode(97 + Math.round(x));
        // eslint-disable-next-line no-shadow
        const row = `${8 - Math.round(y)}`;
        const square = `${col}${row}` as Square;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        acc = { ...acc, [square]: useRef(null) };
      }
    }
    return acc as any;
  }, [board]);

  const pieceRefs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<ChessPieceRef>
  > | null> = useRef(generateBoardRefs());

  const squareRefs: React.MutableRefObject<Record<
    Square,
    React.MutableRefObject<HighlightedSquareRefType>
  > | null> = useRef(generateBoardRefs());

  useImperativeHandle(
    ref,
    () => ({
      move: ({ from, to }) => {
        return pieceRefs?.current?.[from].current?.moveTo?.(to);
      },
      undo: () => {
        try {
          chess.undo();
          setBoard(chess.board());
        } catch (error) {
          // If undo fails with skipValidation, silently fail
          if (!skipValidation) throw error;
        }
      },
      highlight: ({ square, color }) => {
        squareRefs.current?.[square].current.highlight({
          backgroundColor: color,
        });
      },
      resetAllHighlightedSquares: () => {
        try {
          for (let x = 0; x < board.length; x++) {
            const row = board[x];
            if (!row) continue;
            for (let y = 0; y < row.length; y++) {
              const col = String.fromCharCode(97 + Math.round(x));
              // eslint-disable-next-line no-shadow
              const row = `${8 - Math.round(y)}`;
              const square = `${col}${row}` as Square;
              squareRefs.current?.[square].current.reset();
            }
          }
        } catch (error) {
          // If reset fails, silently fail
          if (!skipValidation) throw error;
        }
      },
      getState: () => {
        try {
          return getChessboardState(chess);
        } catch (error) {
          // If getChessboardState fails with skipValidation, return default values
          if (skipValidation) {
            return {
              isCheck: false,
              isCheckmate: false,
              isDraw: false,
              isStalemate: false,
              isThreefoldRepetition: false,
              isInsufficientMaterial: false,
              isGameOver: false,
              fen: '',
            };
          }
          throw error;
        }
      },
      resetBoard: (fen) => {
        try {
          chess.reset();
          if (fen) chess.load(fen, { skipValidation });
          setBoard(chess.board());
        } catch (error) {
          // If reset/load fails with skipValidation, silently fail
          if (!skipValidation) throw error;
        }
      },
    }),
    [board, chess, setBoard, skipValidation]
  );

  return (
    <PieceRefsContext.Provider value={pieceRefs}>
      <SquareRefsContext.Provider value={squareRefs}>
        {children}
      </SquareRefsContext.Provider>
    </PieceRefsContext.Provider>
  );
});

const BoardRefsContextProvider = React.memo(BoardRefsContextProviderComponent);

export { PieceRefsContext, SquareRefsContext, BoardRefsContextProvider };
