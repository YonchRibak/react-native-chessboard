# Skip Validation Example

This document demonstrates how to use the `skipValidation` prop to enable board editing mode with illegal positions.

## Problem

By default, chess.js validates all positions and moves. This means:
- Loading a FEN with missing kings will throw an error
- Attempting to move pieces in illegal positions will crash
- The board expects valid chess states at all times

## Solution

The `skipValidation` prop bypasses chess.js validation, allowing:
- ✅ Loading illegal FEN positions (missing kings, invalid castling, etc.)
- ✅ Moving any piece regardless of turn
- ✅ Placing pieces on any square
- ✅ No move validation or legal move highlighting
- ✅ No crashes from illegal board states

## Example 1: Illegal FEN Position (Missing Kings)

```tsx
import React from 'react';
import { View } from 'react-native';
import Chessboard from 'react-native-chessboard';

export default function IllegalPositionExample() {
  return (
    <View>
      <Chessboard
        fen="R2R2R1/8/8/8/8/8/8/R7 w KQkq - 0 1"  // Illegal: no kings!
        gestureEnabled={true}
        skipValidation={true}
        onMove={(data) => {
          console.log('Move:', data.move);
          console.log('New position:', data.state.fen);
        }}
      />
    </View>
  );
}
```

**Without skipValidation**: This would crash with "Cannot read property 'type' of null"

**With skipValidation**: Works perfectly! Users can move any rook to any square.

## Example 2: Board Editor Mode

```tsx
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Chessboard from 'react-native-chessboard';

export default function BoardEditor() {
  const [position, setPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1'); // Empty board

  return (
    <View>
      <Text>Board Editor - Move pieces anywhere!</Text>
      <Chessboard
        fen={position}
        gestureEnabled={true}
        skipValidation={true}
        onMove={(data) => {
          // In editor mode, you can manually construct FEN or track piece positions
          console.log('Piece moved from', data.move.from, 'to', data.move.to);
          setPosition(data.state.fen || position);
        }}
      />
    </View>
  );
}
```

## Example 3: Puzzle Setup

```tsx
import React from 'react';
import { View } from 'react-native';
import Chessboard from 'react-native-chessboard';

export default function PuzzleSetup() {
  // A puzzle position that might be illegal according to chess rules
  // but valid for the puzzle
  const puzzleFEN = "8/8/8/2k5/8/2K5/8/R7 w - - 0 1";

  return (
    <View>
      <Chessboard
        fen={puzzleFEN}
        gestureEnabled={true}
        skipValidation={true}
        onMove={(data) => {
          console.log('Move made:', data.move.san);
        }}
      />
    </View>
  );
}
```

## What Gets Bypassed

When `skipValidation={true}`:

1. **FEN Loading**: No validation when loading positions
2. **Move Validation**: All moves are allowed (no legal move checking)
3. **Turn Checking**: Any piece can be moved regardless of whose turn it is
4. **Check/Checkmate**: No check or checkmate detection (returns false)
5. **Game State**: Game state methods return safe defaults instead of errors
6. **Board State**: Errors from `chess.board()` are caught and handled

## What Still Works

- ✅ Rendering pieces on the board
- ✅ Gesture handling for drag and drop
- ✅ The `onMove` callback fires with move data
- ✅ Visual piece movement animations
- ✅ All UI features (highlighting, colors, etc.)

## Default Behavior (skipValidation={false})

When `skipValidation` is `false` or omitted (default):
- ✅ Normal chess rules enforced
- ✅ Only legal moves allowed
- ✅ Legal squares highlighted when picking up pieces
- ✅ Check and checkmate detection
- ✅ Turn-based movement (white moves, then black, etc.)
- ✅ All chess.js validation active

## Important Notes

1. **Not for normal chess games**: Use `skipValidation={true}` only for board editors, puzzle creators, or special use cases
2. **No undo/redo**: The undo functionality may not work correctly with illegal positions
3. **FEN output**: The FEN returned in `onMove` may not be accurate with illegal positions
4. **Mock move objects**: When moves fail, mock move objects are created to prevent crashes

## Testing the Fix

The following test case should work without errors:

```tsx
<Chessboard
  fen="R2R2R1/8/8/8/8/8/8/R7 w KQkq - 0 1"  // Missing kings
  gestureEnabled={true}
  skipValidation={true}
  onMove={(data) => console.log('Move:', data)}
/>
```

**Expected behavior**:
- Board renders without crashing
- All rooks can be picked up and moved
- Any square can be a drop target
- `onMove` callback fires successfully
- No "Cannot read property 'type'" errors
