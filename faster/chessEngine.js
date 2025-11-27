import { BitBoard } from './BitBoard.js';
import { Zobrist } from './Zobrist.js';

export class ChessEngine {
    constructor(board = [
        ['r', '.', '.', '.', 'k', '.', '.', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'P', 'p'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', 'b', '.', '.', '.', '.', '.'],
        ['.', '.', '.', 'P', '.', 'p', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', '.', '.', '.', 'K', '.', '.', 'R']
    ]) {
        this.rows = 8;
        this.cols = 8;

        this.pieces = {
            // White
            P: new BitBoard(),
            N: new BitBoard(),
            B: new BitBoard(),
            R: new BitBoard(),
            Q: new BitBoard(),
            K: new BitBoard(),
            // Black
            p: new BitBoard(),
            n: new BitBoard(),
            b: new BitBoard(),
            r: new BitBoard(),
            q: new BitBoard(),
            k: new BitBoard()
        };

        // Populate bitboards
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const piece = board[r][c];
                    if (piece === '.') continue;

                const square = (this.rows - 1 - r) * this.cols + c;
                const hi = square >= 32 ? 1 << (square - 32) : 0;
                const lo = square < 32 ? 1 << square : 0;

                this.pieces[piece] = this.pieces[piece].or(new BitBoard(hi, lo));
            }
        }

        // Combined occupancy
        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        this.castlingRights = {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        };
        this.enPassantSquare = null;

        this.turn = 0;

        this.promoPieces = ['q', 'r', 'b', 'n'];

        this.zobrist = new Zobrist();
        this.history = [];

        this.gameCondition = 'PLAYING';
        this.logs = [];
0

        this.renderer = null;
    }

    MovePiece(fr, fc, tr, tc, promotePiece = null) {
        if (!this.isLegalMove(fr, fc, tr, tc) || this.gameCondition !== 'PLAYING') return;

        // Get pieces
        const originalPiece = this.getPiece(fr, fc);
        const isWhite = this.isWhite(originalPiece);
        const isPawn = originalPiece.toLowerCase() === 'p';

        let movingPiece = originalPiece;
            if (promotePiece) {
                if (isPawn) {
                    promotePiece = isWhite ? promotePiece.toUpperCase() : promotePiece.toLowerCase()
                    movingPiece = promotePiece;
                } else {
                    promotePiece = null;
                }
            };
        let targetPiece = this.getPiece(tr, tc);

        const fSquare = this.toSq(fr, fc);
        const tSquare = this.toSq(tr, tc);

        // Promote
        if (this.renderer && isPawn && !promotePiece) {
            if ((isWhite && tr === 0) || (!isWhite && tr === this.rows - 1)) {
                this.renderer.Promote(fr, fc, tr, tc);
                return;
            }
        }

        this.zobrist.xorPiece(originalPiece, fr, fc);

        const isCapture = !this.isEmpty(targetPiece);
        if (isCapture) {
            this.zobrist.xorPiece(targetPiece, tr, tc);
            this.pieces[targetPiece].clearBit(tSquare);
        }

        // Reset En-passsant rights
        if (this.enPassantSquare) this.zobrist.xorEP(this.enPassantSquare.c);
        const prevEnPassant = this.enPassantSquare ? { r: this.enPassantSquare.r, c: this.enPassantSquare.c } : null;
        this.enPassantSquare = null;

        // En-passant capture
        let isEnPassantCapture = false;
        if (isPawn && prevEnPassant && tr === prevEnPassant.r && tc === prevEnPassant.c && !isCapture) {
            const capRow = isWhite ? tr + 1 : tr - 1;
            targetPiece = this.getPiece(capRow, tc);

            this.zobrist.xorPiece(targetPiece, capRow, tc);
            this.pieces[targetPiece].clearBit(this.toSq(capRow, tc));
            
            isEnPassantCapture = true;
        }

        // Castling
        let castle = 0;
        if (movingPiece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
            if (tc === 6) { // King-side
                const rPiece = this.getPiece(tr, 7);

                this.zobrist.xorPiece(rPiece, tr, 7);

                this.pieces[rPiece].clearBit(this.toSq(tr, 7));
                this.pieces[rPiece].setBit(this.toSq(tr, 5));

                this.zobrist.xorPiece(rPiece, tr, 5);

                castle = 1;
            } else if (tc === 2) { // Queen-side
                const rPiece = this.getPiece(tr, 0);

                this.zobrist.xorPiece(rPiece, tr, 0);

                this.pieces[rPiece].setBit(this.toSq(tr, 3));
                this.pieces[rPiece].clearBit(this.toSq(tr, 0));
                
                this.zobrist.xorPiece(rPiece, tr, 3);

                castle = 2;
            }
        }

        // Move piece
        this.pieces[originalPiece].clearBit(fSquare);
        this.pieces[movingPiece].setBit(tSquare);

        this.zobrist.xorPiece(movingPiece, tr, tc);

        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        // Castle rights
        this.zobrist.xorCastleRights(this.castlingRights);
        const prevCastlingRights = {
            whiteKingSide: this.castlingRights.whiteKingSide,
            whiteQueenSide: this.castlingRights.whiteQueenSide,
            blackKingSide: this.castlingRights.blackKingSide,
            blackQueenSide: this.castlingRights.blackQueenSide
        };
        if (movingPiece.toLowerCase() === 'k') {
            if (isWhite) {
                this.castlingRights.whiteKingSide = false;
                this.castlingRights.whiteQueenSide = false;
            } else {
                this.castlingRights.blackKingSide = false;
                this.castlingRights.blackQueenSide = false;
            }
        }
        if (movingPiece.toLowerCase() === 'r') {
            if (fr === 7 && fc === 0) this.castlingRights.whiteQueenSide = false;
            if (fr === 7 && fc === 7) this.castlingRights.whiteKingSide = false;
            if (fr === 0 && fc === 0) this.castlingRights.blackQueenSide = false;
            if (fr === 0 && fc === 7) this.castlingRights.blackKingSide = false;
        }
        this.zobrist.xorCastleRights(this.castlingRights);

        // En-passant rights
        if (isPawn && Math.abs(fr - tr) === 2) {
            this.enPassantSquare = { r: (fr + tr) / 2, c: fc };
            this.zobrist.xorEP(fc);
        }

        this.zobrist.xorTurn();
        this.history.push(this.zobrist.hash);

        // Store move
        this.logs.push({
            fr, fc, tr, tc,
            originalPiece,
            targetPiece,
            promotePiece,

            castle,
            castlingRights: prevCastlingRights,
            isEnPassantCapture,
            enPassantSquare: prevEnPassant,

            gameCondition: this.gameCondition,
            turn: this.turn
        });

        // Switch turn
        if (this.gameCondition == 'PLAYING') this.SwitchTurn();

        // UI
        if (this.renderer) {
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.UpdateGame();

            if (isEnPassantCapture) {
                const capRow = isWhite ? tr + 1 : tr - 1;
                this.renderer.UpdateSquare(capRow, tc);
            }

            if (castle == 1) {
                this.renderer.UpdateSquare(tr, 7);
                this.renderer.UpdateSquare(tr, 5);
            } else if (castle == 2) {
                this.renderer.UpdateSquare(tr, 3);
                this.renderer.UpdateSquare(tr, 0);
            }
        }
    }

    undoMove() {
        if (this.logs.length === 0) return;

        const lastMove = this.logs.pop();

        const {
            fr, fc, tr, tc,
            originalPiece,
            targetPiece,
            promotePiece,

            castle,
            castlingRights,
            isEnPassantCapture,
            enPassantSquare,

            gameCondition,
            turn
        } = lastMove;

        const isWhite = this.isWhite(originalPiece);

        this.zobrist.xorTurn();

        // Restore piece positions
        const tSquare = this.toSq(tr, tc);

        const fbb = this.pieces[originalPiece];
        if (promotePiece) {
            this.zobrist.xorPiece(promotePiece, tr, tc);
            this.pieces[promotePiece].clearBit(tSquare);
        } else {
            fbb.clearBit(tSquare);
            this.zobrist.xorPiece(originalPiece, tr, tc);
        }

        fbb.setBit(this.toSq(fr, fc));
        this.zobrist.xorPiece(originalPiece, fr, fc);

        if (!this.isEmpty(targetPiece) && !isEnPassantCapture) {
            this.zobrist.xorPiece(targetPiece, tr, tc);
            this.pieces[targetPiece].setBit(tSquare)
        };

        // Undo castling
        if (castle === 1) { // King-side
            const rPiece = this.getPiece(tr, 5);

            this.zobrist.xorPiece(rPiece, tr, 5);

            this.pieces[rPiece].setBit(this.toSq(tr, 7));
            this.pieces[rPiece].clearBit(this.toSq(tr, 5));

            this.zobrist.xorPiece(rPiece, tr, 7);
        } else if (castle === 2) { // Queen-side
            const rPiece = this.getPiece(tr, 3);

            this.zobrist.xorPiece(rPiece, tr, 3);

            this.pieces[rPiece].setBit(this.toSq(tr, 0));
            this.pieces[rPiece].clearBit(this.toSq(tr, 3));

            this.zobrist.xorPiece(rPiece, tr, 0);
        }

        // Undo En-passant capture
        if (isEnPassantCapture) {
            const capRow = isWhite ? tr + 1 : tr - 1;
            const pawn = isWhite ? 'p' : 'P';

            this.zobrist.xorPiece(targetPiece, capRow, tc);
            this.pieces[pawn].setBit(this.toSq(capRow, tc));
            this.pieces[pawn].clearBit(tSquare);
        }

        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        // Restore castling rights
        this.zobrist.xorCastleRights(this.castlingRights);
        this.castlingRights.whiteKingSide = castlingRights.whiteKingSide;
        this.castlingRights.whiteQueenSide = castlingRights.whiteQueenSide;
        this.castlingRights.blackKingSide = castlingRights.blackKingSide;
        this.castlingRights.blackQueenSide = castlingRights.blackQueenSide;
        this.zobrist.xorCastleRights(castlingRights);

        // Restore En-passant square
        if (this.enPassantSquare) this.zobrist.xorEP(this.enPassantSquare.c);
        this.enPassantSquare = null;
        if (enPassantSquare) {
            this.enPassantSquare = { r: enPassantSquare.r, c: enPassantSquare.c };
            this.zobrist.xorEP(enPassantSquare.c);
        }

        // Restore game condition and turn
        this.gameCondition = gameCondition;
        this.SwitchTurn();

        // UI updates
        if (this.renderer) {
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.UpdateGame();

            if (castle == 1) {
                this.renderer.UpdateSquare(tr, 7);
                this.renderer.UpdateSquare(tr, 5);
            } else if (castle == 2) {
                this.renderer.UpdateSquare(tr, 3);
                this.renderer.UpdateSquare(tr, 0);
            }

            if (isEnPassantCapture) {
                const capRow = isWhite ? tr + 1 : tr - 1;
                this.renderer.UpdateSquare(capRow, tc);
            }
        }
    }

    isLegalMove(fr, fc, tr, tc) {
        const piece = this.getPiece(fr, fc);
            if (this.isEmpty(piece)) return false;

        const isWhite = this.isWhite(piece);
        const targetPiece = this.getPiece(tr, tc);

        // Cannot capture your own piece
        if (!this.isEmpty(targetPiece) && (isWhite === this.isWhite(targetPiece))) return false;

        const dr = tr - fr;
        const dc = tc - fc;

        const absR = Math.abs(dr);
        const absC = Math.abs(dc);

        let isLegal = false;

        switch (piece.toLowerCase()) {
            // Pawn
            case 'p':
                const direction = isWhite ? -1 : 1;
                const startRow = isWhite ? 6 : 1;

                // Single push forward
                if (dc === 0 && dr === direction && this.isEmpty(targetPiece)) isLegal = true;

                // Double push from starting row
                if (dc === 0 && fr === startRow && dr === 2 * direction) {
                    const midRow = fr + direction;
                    if (this.isEmpty(this.getPiece(midRow, fc)) && this.isEmpty(this.getPiece(tr, tc))) isLegal = true;
                }

                if (Math.abs(dc) === 1 && dr === direction) {
                    // Diagonal capture
                    if ((isWhite && this.isBlack(targetPiece)) || (!isWhite && this.isWhite(targetPiece))) isLegal = true;

                    // En-passant capture
                    if (this.enPassantSquare && this.enPassantSquare.r === tr && this.enPassantSquare.c === tc && this.isEmpty(this.getPiece([tr][tc]))) isLegal = true;
                }
                break;
            // Rook
            case 'r':
                if ((dr === 0 || dc === 0) && this.isPathClear(fr, fc, tr, tc)) isLegal = true;
                break;
            // Bishop
            case 'b':
                if (absR === absC && this.isPathClear(fr, fc, tr, tc)) isLegal = true;
                break;
            // Queen
            case 'q':
                if ((dr === 0 || dc === 0) && this.isPathClear(fr, fc, tr, tc)) isLegal = true;
                if (absR === absC && this.isPathClear(fr, fc, tr, tc)) isLegal = true;
                break;
            // Knight
            case 'n':
                isLegal = (absR === 2 && absC === 1) || (absR === 1 && absC === 2);
                break;
            // King
            case 'k':
                if (absR <= 1 && absC <= 1) isLegal = true;

                const castleRow = isWhite ? 7 : 0;
                const kingSide = isWhite ? this.castlingRights.whiteKingSide : this.castlingRights.blackKingSide;
                const queenSide = isWhite ? this.castlingRights.whiteQueenSide : this.castlingRights.blackQueenSide;

                // Castling
                if (fr === castleRow && fc === 4) {
                    // King-side
                    if (tr === castleRow && tc === 6 &&
                        kingSide &&
                        this.isEmpty(this.getPiece(castleRow, 5)) &&
                        this.isEmpty(this.getPiece(castleRow, 6))
                        // !this.isSquareAttacked(castleRow, 4, isWhite) &&
                        // !this.isSquareAttacked(castleRow, 5, isWhite) &&
                        // !this.isSquareAttacked(castleRow, 6, isWhite)
                    ) isLegal = true;;

                    // Queen-side
                    if (tr === castleRow && tc === 2 &&
                        queenSide &&
                        this.isEmpty(this.getPiece(castleRow, 1)) &&
                        this.isEmpty(this.getPiece(castleRow, 2)) &&
                        this.isEmpty(this.getPiece(castleRow, 3))
                        // !this.isSquareAttacked(castleRow, 4, isWhite) &&
                        // !this.isSquareAttacked(castleRow, 3, isWhite) &&
                        // !this.isSquareAttacked(castleRow, 2, isWhite)
                    ) isLegal = true;;
                }
                break;
        }

        // if (isLegal && this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;
        if (isLegal) return true;
    }

    getLegalMoves(fr, fc) {
        const piece = this.getPiece(fr, fc);
            if (this.isEmpty(piece)) return [];

        const moves = [];
        const isWhite = this.isWhite(piece);
        const isPawn = piece.toLowerCase() === 'p';

        // last rank based on side
        const promoteRank = isWhite ? 0 : this.rows - 1;

        for (let tr = 0; tr < this.rows; tr++) {
            for (let tc = 0; tc < this.cols; tc++) {
                const targetPiece = this.getPiece(tr, tc);

                if (isWhite == this.isWhite(targetPiece) && !this.isEmpty(targetPiece)) continue;
                if (!this.isLegalMove(fr, fc, tr, tc)) continue;

                // Promotion
                if (isPawn && tr === promoteRank) {
                    for (const promote of this.promoPieces) {
                        moves.push([ tr, tc, promote ]);
                    }

                    continue;
                }

                moves.push([ tr, tc, null ]);
            }
        }

        return moves;
    }

    SwitchTurn() {
        this.turn = 1 - this.turn;

        if (this.turn == 0 && this.whiteAI) this.whiteAI?.Play();
        if (this.turn == 1 && this.blackAI) this.blackAI?.Play();
    }

    isPathClear(fr, fc, tr, tc) {
        const stepR = Math.sign(tr - fr);
        const stepC = Math.sign(tc - fc);

        let r = fr + stepR;
        let c = fc + stepC;

        while (r !== tr || c !== tc) {
            if (this.occupied.has((this.rows - 1 - r) * this.cols + c)) return false;
            r += stepR;
            c += stepC;
        }
        return true;
    }

    getPiece(r, c) {
        const sq = this.toSq(r, c);

        // Fast exit
        if (!this.occupied.has(sq)) return '.';

        const isWhite = this.occupiedWhite.has(sq);

        if (isWhite) {
            if (this.pieces.P.has(sq)) return 'P';
            if (this.pieces.N.has(sq)) return 'N';
            if (this.pieces.B.has(sq)) return 'B';
            if (this.pieces.R.has(sq)) return 'R';
            if (this.pieces.Q.has(sq)) return 'Q';
            if (this.pieces.K.has(sq)) return 'K';
        } else {
            if (this.pieces.p.has(sq)) return 'p';
            if (this.pieces.n.has(sq)) return 'n';
            if (this.pieces.b.has(sq)) return 'b';
            if (this.pieces.r.has(sq)) return 'r';
            if (this.pieces.q.has(sq)) return 'q';
            if (this.pieces.k.has(sq)) return 'k';
        }

        return '.';
    }

    toSq(r, c) {
        return (this.rows - 1 - r) * this.cols + c;
    }

    isWhite(p) { return p ? p !== '.' && p === p.toUpperCase() : null; }
    isBlack(p) { return p ? p !== '.' && p === p.toLowerCase() : null; }
    isEmpty(p) { return p ? p == '.' : null; }

    clone() {
        const clone = new ChessEngine();

        // Deep copy all piece bitboards
        clone.pieces = {};
        for (const [piece, bb] of Object.entries(this.pieces)) {
            clone.pieces[piece] = bb.clone();
        }

        clone.occupiedWhite = this.occupiedWhite.clone();
        clone.occupiedBlack = this.occupiedBlack.clone();
        clone.occupied = this.occupied.clone();

        clone.turn = this.turn;

        clone.gameCondition = this.gameCondition;

        return clone;
    }
}
