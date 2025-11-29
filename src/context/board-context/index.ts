import type { Chess } from 'chess.js';
import React, { createContext } from 'react';

const BoardContext = createContext<ReturnType<Chess['board']>>(
  {} as any
);

const BoardSetterContext = createContext<
  React.Dispatch<React.SetStateAction<ReturnType<Chess['board']>>>
>({} as any);

export { BoardContext, BoardSetterContext };
