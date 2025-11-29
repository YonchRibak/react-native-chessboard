import type { Chess } from 'chess.js';

type ChessboardStateFunctions = Pick<
  Chess,
  | 'isCheck'
  | 'isCheckmate'
  | 'isDraw'
  | 'isStalemate'
  | 'isThreefoldRepetition'
  | 'isInsufficientMaterial'
  | 'isGameOver'
  | 'fen'
>;

type RecordReturnTypes<T> = {
  readonly [P in keyof T]: T[P] extends () => any ? ReturnType<T[P]> : T[P];
};

export type ChessboardState = RecordReturnTypes<ChessboardStateFunctions>;

export const getChessboardState = (chess: Chess): ChessboardState => {
  return {
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    isThreefoldRepetition: chess.isThreefoldRepetition(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
    isGameOver: chess.isGameOver(),
    fen: chess.fen(),
  };
};
