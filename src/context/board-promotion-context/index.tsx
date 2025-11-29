import React, { useCallback, useMemo, useState } from 'react';
import type { Chess, PieceSymbol } from 'chess.js';
import { PromotionDialog } from './dialog';

export type BoardPromotionContextType = {
  showPromotionDialog: (_: {
    type: PromotionDialogType;
    onSelect?: (_: PieceSymbol) => void;
  }) => void;
  isPromoting: boolean;
};

const BoardPromotionContext = React.createContext<BoardPromotionContextType>({
  showPromotionDialog: () => {},
  isPromoting: false,
});

type PromotionDialogType = ReturnType<Chess['turn']>;

export type BoardPromotionContextState = {
  isDialogActive: boolean;
  type?: PromotionDialogType;
  onSelect?: (_: PieceSymbol) => void;
};

const BoardPromotionContextProvider: React.FC = React.memo(({ children }) => {
  const [dialog, setDialog] = useState<BoardPromotionContextState>({
    isDialogActive: false,
  });

  const showPromotionDialog: BoardPromotionContextType['showPromotionDialog'] =
    useCallback(({ type, onSelect }) => {
      setDialog({ isDialogActive: true, type, onSelect });
    }, []);

  const onSelect = useCallback(
    (piece: PieceSymbol) => {
      dialog.onSelect?.(piece);
      setDialog({ isDialogActive: false });
    },
    [dialog]
  );

  const value = useMemo(
    () => ({
      showPromotionDialog,
      isPromoting: dialog.isDialogActive,
    }),
    [dialog.isDialogActive, showPromotionDialog]
  );

  return (
    <BoardPromotionContext.Provider value={value}>
      {dialog.isDialogActive && (
        <PromotionDialog type="w" {...dialog} onSelect={onSelect} />
      )}
      {children}
    </BoardPromotionContext.Provider>
  );
});

export { BoardPromotionContextProvider, BoardPromotionContext };
