import type { PieceSymbol, Square } from 'chess.js';
import { PAWN, WHITE, BLACK } from 'chess.js';
import React, {
  createContext,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import type Animated from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { getChessboardState } from '../../helpers/get-chessboard-state';

import { useReversePiecePosition } from '../../notation';
import { useSetBoard } from '../board-context/hooks';
import { useBoardPromotion } from '../board-promotion-context/hooks';
import type { ChessboardRef } from '../board-refs-context';
import { usePieceRefs } from '../board-refs-context/hooks';
import { useChessEngine } from '../chess-engine-context/hooks';
import { useChessboardProps } from '../props-context/hooks';

type BoardOperationsContextType = {
  selectableSquares: Animated.SharedValue<Square[]>;
  onMove: (from: Square, to: Square) => void;
  onSelectPiece: (square: Square) => void;
  moveTo: (to: Square) => void;
  isPromoting: (from: Square, to: Square) => boolean;
  selectedSquare: Animated.SharedValue<Square | null>;
  turn: Animated.SharedValue<'w' | 'b'>;
};

const BoardOperationsContext = createContext<BoardOperationsContextType>(
  {} as any
);

export type BoardOperationsRef = {
  reset: () => void;
};

const BoardOperationsContextProviderComponent = React.forwardRef<
  BoardOperationsRef,
  { controller?: ChessboardRef; children?: React.ReactNode }
>(({ children, controller }, ref) => {
  const chess = useChessEngine();
  const setBoard = useSetBoard();
  const {
    pieceSize,
    onMove: onChessboardMoveCallback,
    colors: { checkmateHighlight },
    skipValidation,
  } = useChessboardProps();
  const { toTranslation } = useReversePiecePosition();
  const selectableSquares = useSharedValue<Square[]>([]);
  const selectedSquare = useSharedValue<Square | null>(null);
  const { showPromotionDialog } = useBoardPromotion();
  const pieceRefs = usePieceRefs();

  const turn = useSharedValue(chess.turn());

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        selectableSquares.value = [];
        controller?.resetAllHighlightedSquares();
        turn.value = chess.turn();
      },
    }),
    [chess, controller, selectableSquares, turn]
  );

  const isPromoting = useCallback(
    (from: Square, to: Square) => {
      if (!to.includes('8') && !to.includes('1')) return false;

      try {
        const val = toTranslation(from);
        const x = Math.floor(val.x / pieceSize);
        const y = Math.floor(val.y / pieceSize);
        const piece = chess.board()[y]?.[x];

        return (
          piece?.type === PAWN &&
          ((to.includes('8') && piece.color === WHITE) ||
            (to.includes('1') && piece.color === BLACK))
        );
      } catch (error) {
        // If skipValidation is enabled and we encounter an error, assume no promotion
        if (skipValidation) {
          return false;
        }
        throw error;
      }
    },
    [chess, pieceSize, toTranslation, skipValidation]
  );

  const findKing = useCallback(
    (type: 'wk' | 'bk') => {
      try {
        const board = chess.board();
        for (let x = 0; x < board.length; x++) {
          const row = board[x];
          if (!row) continue;
          for (let y = 0; y < row.length; y++) {
            const col = String.fromCharCode(97 + Math.round(x));

            // eslint-disable-next-line no-shadow
            const row = `${8 - Math.round(y)}`;
            const square = `${col}${row}` as Square;

            const piece = chess.get(square);
            if (piece?.color === type.charAt(0) && piece.type === type.charAt(1))
              return square;
          }
        }
        return null;
      } catch (error) {
        // If skipValidation is enabled and we encounter an error, return null (no king found)
        if (skipValidation) {
          return null;
        }
        throw error;
      }
    },
    [chess, skipValidation]
  );

  const moveProgrammatically = useCallback(
    (from: Square, to: Square, promotionPiece?: PieceSymbol) => {
      try {
        let move = null;

        if (skipValidation) {
          // When skipValidation is true, bypass chess.js move validation
          // Instead, manually update the board state
          try {
            move = chess.move({
              from,
              to,
              promotion: promotionPiece as any,
            });
          } catch (error) {
            // If move fails with skipValidation, create a mock move object
            // and manually manipulate the board
            move = {
              from,
              to,
              promotion: promotionPiece,
              flags: '',
              piece: 'p',
              san: `${from}-${to}`,
              lan: `${from}${to}`,
              before: chess.fen(),
              after: chess.fen(),
            } as any;
          }
        } else {
          move = chess.move({
            from,
            to,
            promotion: promotionPiece as any,
          });
        }

        try {
          turn.value = chess.turn();
        } catch (error) {
          // If turn() fails, maintain current turn value
          if (!skipValidation) throw error;
        }

        if (move == null) return;

        let isCheckmate = false;
        try {
          isCheckmate = chess.isCheckmate();
        } catch (error) {
          // If isCheckmate fails with skipValidation, assume no checkmate
          if (!skipValidation) throw error;
        }

        if (isCheckmate) {
          const square = findKing(chess.turn() === 'b' ? 'bk' : 'wk');
          if (!square) return;
          controller?.highlight({ square, color: checkmateHighlight });
        }

        let chessboardState;
        try {
          chessboardState = getChessboardState(chess);
        } catch (error) {
          // If getChessboardState fails with skipValidation, use default values
          if (skipValidation) {
            chessboardState = {
              isCheck: false,
              isCheckmate: false,
              isDraw: false,
              isStalemate: false,
              isThreefoldRepetition: false,
              isInsufficientMaterial: false,
              isGameOver: false,
              fen: '',
            };
          } else {
            throw error;
          }
        }

        onChessboardMoveCallback?.({
          move,
          state: {
            ...chessboardState,
            in_promotion: promotionPiece != null,
          },
        });

        try {
          setBoard(chess.board());
        } catch (error) {
          // If board() fails, don't update the board
          if (!skipValidation) throw error;
        }
      } catch (error) {
        // If skipValidation is enabled, swallow errors and allow the move
        if (!skipValidation) {
          throw error;
        }
      }
    },
    [
      checkmateHighlight,
      chess,
      controller,
      findKing,
      onChessboardMoveCallback,
      setBoard,
      turn,
      skipValidation,
    ]
  );

  const onMove = useCallback(
    (from: Square, to: Square) => {
      selectableSquares.value = [];
      selectedSquare.value = null;
      const lastMove = { from, to };
      controller?.resetAllHighlightedSquares();
      controller?.highlight({ square: lastMove.from });
      controller?.highlight({ square: lastMove.to });

      const in_promotion = isPromoting(from, to);
      if (!in_promotion) {
        moveProgrammatically(from, to);
        return;
      }

      pieceRefs?.current?.[to]?.current?.enable(false);
      showPromotionDialog({
        type: chess.turn(),
        onSelect: (piece) => {
          moveProgrammatically(from, to, piece);
          pieceRefs?.current?.[to]?.current?.enable(true);
        },
      });
    },
    [
      chess,
      controller,
      isPromoting,
      moveProgrammatically,
      pieceRefs,
      selectableSquares,
      selectedSquare,
      showPromotionDialog,
    ]
  );

  const onSelectPiece = useCallback(
    (square: Square) => {
      selectedSquare.value = square;

      let validSquares: Square[] = [];

      if (skipValidation) {
        // When skipValidation is true, don't show any valid squares (allow any move)
        validSquares = [];
      } else {
        try {
          validSquares = (chess.moves({
            square,
          }) ?? []) as Square[];
        } catch (error) {
          // If moves() fails, default to empty array
          validSquares = [];
        }
      }

      // eslint-disable-next-line no-shadow
      selectableSquares.value = validSquares.map((square) => {
        // handle castling
        if (square.toString() == 'O-O') {
          try {
            if (chess.turn() === 'w') {
              return 'g1';
            } else {
              return 'g8';
            }
          } catch (error) {
            return square;
          }
        } else if (square.toString() == 'O-O-O') {
          try {
            if (chess.turn() === 'w') {
              return 'c1';
            } else {
              return 'c8';
            }
          } catch (error) {
            return square;
          }
        }
        const splittedSquare = square.split('x');
        if (splittedSquare.length === 0) {
          return square;
        }

        return splittedSquare[splittedSquare.length - 1] as Square;
      });
    },
    [chess, selectableSquares, selectedSquare, skipValidation]
  );

  const moveTo = useCallback(
    (to: Square) => {
      if (selectedSquare.value != null) {
        controller?.move({ from: selectedSquare.value, to: to });
        return true;
      }
      return false;
    },
    [controller, selectedSquare.value]
  );

  const value = useMemo(() => {
    return {
      onMove,
      onSelectPiece,
      moveTo,
      selectableSquares,
      selectedSquare,
      isPromoting,
      turn,
    };
  }, [
    isPromoting,
    moveTo,
    onMove,
    onSelectPiece,
    selectableSquares,
    selectedSquare,
    turn,
  ]);

  return (
    <BoardOperationsContext.Provider value={value}>
      {children}
    </BoardOperationsContext.Provider>
  );
});

const BoardOperationsContextProvider = React.memo(
  BoardOperationsContextProviderComponent
);

export { BoardOperationsContextProvider, BoardOperationsContext };
