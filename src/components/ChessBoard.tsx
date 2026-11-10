import React, { useState } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import { ChessPiece } from './ChessPiece';
import { getLegalMovesForSquare, isPromotionMove, getKingInCheckSquare } from '../lib/chessEngine';
import { LastMoveInfo } from '../lib/supabase';

interface ChessBoardProps {
  fen: string;
  playerColor: 'w' | 'b' | 'spectator';
  orientation: 'w' | 'b';
  interactive: boolean; // Is it this player's turn to move?
  lastMove: LastMoveInfo | null;
  onMakeMove: (from: string, to: string, promotion?: string) => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  playerColor,
  orientation,
  interactive,
  lastMove,
  onMakeMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Parse FEN to get current board array
  let chessInstance: Chess;
  try {
    chessInstance = new Chess(fen);
  } catch {
    chessInstance = new Chess();
  }

  const inCheckSquare = getKingInCheckSquare(fen);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = orientation === 'w' ? files : [...files].reverse();
  const displayRanks = orientation === 'w' ? ranks : [...ranks].reverse();

  const handleSquareClick = (sq: string) => {
    if (pendingPromotion) return;

    // If already selected, check if target square is a legal move
    if (selectedSquare) {
      if (legalMoves.includes(sq)) {
        // Check promotion
        if (isPromotionMove(fen, selectedSquare, sq)) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }

        // Execute move
        onMakeMove(selectedSquare, sq);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // If clicked the same square, deselect
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Try selecting new piece
    if (!interactive) return;

    const piece = chessInstance.get(sq as Square);
    if (!piece) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Only allow selecting pieces of player's assigned color
    if (playerColor !== 'spectator' && piece.color !== playerColor) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Only allow selecting if it matches turn
    if (piece.color !== chessInstance.turn()) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const moves = getLegalMovesForSquare(fen, sq);
    setSelectedSquare(sq);
    setLegalMoves(moves);
  };

  const handlePromotionSelect = (pieceType: string) => {
    if (pendingPromotion) {
      onMakeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
      setPendingPromotion(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Drag and Drop support
  const handleDragStart = (e: React.DragEvent, sq: string) => {
    if (!interactive || pendingPromotion) {
      e.preventDefault();
      return;
    }
    const piece = chessInstance.get(sq as Square);
    if (!piece || (playerColor !== 'spectator' && piece.color !== playerColor) || piece.color !== chessInstance.turn()) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', sq);
    setSelectedSquare(sq);
    setLegalMoves(getLegalMovesForSquare(fen, sq));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSq: string) => {
    e.preventDefault();
    const fromSq = e.dataTransfer.getData('text/plain');
    if (!fromSq || fromSq === targetSq) return;

    const moves = getLegalMovesForSquare(fen, fromSq);
    if (moves.includes(targetSq)) {
      if (isPromotionMove(fen, fromSq, targetSq)) {
        setPendingPromotion({ from: fromSq, to: targetSq });
      } else {
        onMakeMove(fromSq, targetSq);
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  return (
    <div className="relative select-none w-full max-w-[560px] aspect-square rounded-xl shadow-2xl p-2 bg-[#2c2724] border-4 border-[#3d3732]">
      {/* 8x8 Board Container */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-lg overflow-hidden border border-[#1e1b18]">
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const sq = `${file}${rank}`;
            const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 !== 0;

            const piece = chessInstance.get(sq as Square);
            const isSelected = selectedSquare === sq;
            const isLegalTarget = legalMoves.includes(sq);
            const isLastMoveFrom = lastMove?.from === sq;
            const isLastMoveTo = lastMove?.to === sq;
            const isCheckSquare = inCheckSquare === sq;

            // Square background colors (classic chess.com tournament theme)
            let squareBg = isLight ? 'bg-[#ebecd0]' : 'bg-[#739552]';

            if (isLastMoveFrom || isLastMoveTo) {
              squareBg = isLight ? 'bg-[#f5f682]' : 'bg-[#b9ca43]';
            }
            if (isSelected) {
              squareBg = 'bg-[#f7ec59]';
            }

            return (
              <div
                key={sq}
                onClick={() => handleSquareClick(sq)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, sq)}
                className={`relative flex items-center justify-center transition-colors cursor-pointer ${squareBg} ${
                  isCheckSquare ? 'ring-4 ring-inset ring-red-600 bg-red-400/40' : ''
                }`}
                style={{
                  touchAction: 'manipulation',
                }}
              >
                {/* Coordinate labels */}
                {fIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-bold leading-none pointer-events-none ${
                      isLight ? 'text-[#739552]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-bold leading-none pointer-events-none ${
                      isLight ? 'text-[#739552]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* King in check red pulse */}
                {isCheckSquare && (
                  <div className="absolute inset-0 bg-red-500/30 animate-pulse pointer-events-none rounded-sm" />
                )}

                {/* Piece */}
                {piece && (
                  <div
                    draggable={interactive && (playerColor === 'spectator' || piece.color === playerColor)}
                    onDragStart={(e) => handleDragStart(e, sq)}
                    className={`w-[85%] h-[85%] flex items-center justify-center transition-transform active:scale-105 ${
                      interactive && (playerColor === 'spectator' || piece.color === playerColor)
                        ? 'cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer'
                    }`}
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Valid move target indicators */}
                {isLegalTarget && !piece && (
                  <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black/25 pointer-events-none shadow-inner" />
                )}
                {isLegalTarget && piece && (
                  <div className="absolute inset-1 rounded-full border-4 border-black/30 pointer-events-none" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Promotion Choice Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-[#1f242d] border border-amber-500/40 rounded-2xl p-5 shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in-95">
            <h3 className="text-amber-400 font-bold text-base sm:text-lg mb-1">Promoção de Peão</h3>
            <p className="text-xs text-gray-300 mb-4">Escolha a peça para transformar seu peão:</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'q', label: 'Rainha' },
                { type: 'r', label: 'Torre' },
                { type: 'b', label: 'Bispo' },
                { type: 'n', label: 'Cavalo' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => handlePromotionSelect(type)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-800 hover:bg-amber-600/30 border border-gray-700 hover:border-amber-400 transition-all hover:scale-105 active:scale-95"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <ChessPiece type={type} color={playerColor === 'b' ? 'b' : 'w'} />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-200 mt-1">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPendingPromotion(null);
                setSelectedSquare(null);
                setLegalMoves([]);
              }}
              className="mt-4 text-xs text-gray-400 hover:text-gray-200 underline"
            >
              Cancelar jogada
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
