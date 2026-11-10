import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';

export interface MoveResult {
  success: boolean;
  fen: string;
  san: string;
  captured?: PieceSymbol;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  turn: 'w' | 'b';
  winner?: 'white' | 'black' | 'draw';
  winReason?: string;
  error?: string;
}

export interface CapturedPieces {
  white: PieceSymbol[]; // captured by black
  black: PieceSymbol[]; // captured by white
  whiteScore: number;
  blackScore: number;
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Check if a move requires promotion
export function isPromotionMove(fen: string, from: string, to: string): boolean {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(from as Square);
    if (!piece || piece.type !== 'p') return false;

    // White pawn reaching rank 8
    if (piece.color === 'w' && to.endsWith('8')) return true;
    // Black pawn reaching rank 1
    if (piece.color === 'b' && to.endsWith('1')) return true;

    return false;
  } catch {
    return false;
  }
}

// Get all legal target squares for a selected piece
export function getLegalMovesForSquare(fen: string, square: string): string[] {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ square: square as Square, verbose: true });
    return moves.map((m) => m.to);
  } catch {
    return [];
  }
}

// Execute move with full chess.js validation
export function applyChessMove(
  fen: string,
  from: string,
  to: string,
  promotion: string = 'q'
): MoveResult {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: from as Square,
      to: to as Square,
      promotion: promotion as 'q' | 'r' | 'b' | 'n',
    });

    if (!move) {
      return {
        success: false,
        fen,
        san: '',
        isCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
        isStalemate: chess.isStalemate(),
        isGameOver: chess.isGameOver(),
        turn: chess.turn() as 'w' | 'b',
        error: 'Movimento inválido para esta peça.',
      };
    }

    const isCheck = chess.inCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();
    const isGameOver = chess.isGameOver();
    const turn = chess.turn() as 'w' | 'b';

    let winner: 'white' | 'black' | 'draw' | undefined = undefined;
    let winReason: string | undefined = undefined;

    if (isCheckmate) {
      // The player whose turn it was just delivered checkmate
      winner = turn === 'w' ? 'black' : 'white';
      winReason = 'Xeque-mate!';
    } else if (isStalemate) {
      winner = 'draw';
      winReason = 'Empate por afogamento (stalemate).';
    } else if (chess.isThreefoldRepetition()) {
      winner = 'draw';
      winReason = 'Empate por repetição tripla de lances.';
    } else if (chess.isInsufficientMaterial()) {
      winner = 'draw';
      winReason = 'Empate por material insuficiente.';
    } else if (isDraw) {
      winner = 'draw';
      winReason = 'Empate (regra dos 50 lances).';
    }

    return {
      success: true,
      fen: chess.fen(),
      san: move.san,
      captured: move.captured,
      isCheck,
      isCheckmate,
      isDraw,
      isStalemate,
      isGameOver,
      turn,
      winner,
      winReason,
    };
  } catch (err) {
    return {
      success: false,
      fen,
      san: '',
      isCheck: false,
      isCheckmate: false,
      isDraw: false,
      isStalemate: false,
      isGameOver: false,
      turn: 'w',
      error: err instanceof Error ? err.message : 'Erro ao processar jogada.',
    };
  }
}

// Calculate captured pieces by counting pieces on board vs standard set
export function getCapturedPieces(fen: string): CapturedPieces {
  const standardCount: Record<PieceSymbol, number> = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
    k: 1,
  };

  const currentWhite: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentBlack: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  try {
    const chess = new Chess(fen);
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          if (piece.color === 'w') {
            currentWhite[piece.type] = (currentWhite[piece.type] || 0) + 1;
          } else {
            currentBlack[piece.type] = (currentBlack[piece.type] || 0) + 1;
          }
        }
      }
    }
  } catch {
    // If invalid FEN, return empty
  }

  const whiteCaptured: PieceSymbol[] = []; // white pieces that were captured
  const blackCaptured: PieceSymbol[] = []; // black pieces that were captured

  (Object.keys(standardCount) as PieceSymbol[]).forEach((type) => {
    if (type === 'k') return;
    const missingWhite = Math.max(0, standardCount[type] - currentWhite[type]);
    const missingBlack = Math.max(0, standardCount[type] - currentBlack[type]);

    for (let i = 0; i < missingWhite; i++) whiteCaptured.push(type);
    for (let i = 0; i < missingBlack; i++) blackCaptured.push(type);
  });

  const whiteScore = blackCaptured.reduce((sum, p) => sum + PIECE_VALUES[p], 0);
  const blackScore = whiteCaptured.reduce((sum, p) => sum + PIECE_VALUES[p], 0);

  return {
    white: whiteCaptured,
    black: blackCaptured,
    whiteScore,
    blackScore,
  };
}

// Find square of King currently in check
export function getKingInCheckSquare(fen: string): string | null {
  try {
    const chess = new Chess(fen);
    if (!chess.inCheck()) return null;

    const turn = chess.turn();
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
          return `${files[c]}${ranks[r]}`;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
