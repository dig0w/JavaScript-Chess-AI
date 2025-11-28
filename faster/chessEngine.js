import { BitBoard } from './BitBoard.js';
import { Zobrist } from './Zobrist.js';

export class ChessEngine {
    static pawnAttacksWhite = Array(64);
    static pawnAttacksBlack = Array(64);
    static knightAttacks = Array(64);
    static rookRays = Array(64);
    static bishopRays = Array(64);
    static queenRays = Array(64);
    static kingAttacks = Array(64);

    static initialized = false;

    constructor(board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', 'Q', '.', '.', '.'],
        ['.', '.', '.', 'P', 'Q', 'p', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
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

        // Moves
        this.castlingRights = {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        };
        this.enPassantSquare = null;

        if (!ChessEngine.initialized) {
            this.initAttackTables();
            ChessEngine.initialized = true;
        }

        this.turn = 0;

        this.promoPieces = ['q', 'r', 'b', 'n'];

        this.zobrist = new Zobrist();
        this.repetitionCount = new Map();

        this.gameCondition = 'PLAYING';
        this.logs = [];

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
        if (this.enPassantSquare) this.zobrist.xorEP(this.enPassantSquare);
        const prevEnPassant = this.enPassantSquare;
        this.enPassantSquare = null;

        // En-passant capture
        let isEnPassantCapture = false;
        if (isPawn && prevEnPassant && tc === prevEnPassant && !isCapture) {
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
            this.enPassantSquare = fc;
            this.zobrist.xorEP(fc);
        }

        this.zobrist.xorTurn();

        // Draw rules
        if (isPawn || isCapture || isEnPassantCapture) this.halfmoveClock = 0;
        else this.halfmoveClock++;

        const hash = this.zobrist.hash;
        this.repetitionCount.set(hash, (this.repetitionCount.get(hash) || 0) + 1);

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

            halfmoveClock: this.halfmoveClock,
            hash,

            gameCondition: this.gameCondition,
            turn: this.turn
        });

        // Game condition
        const result = this.evaluateEndConditions();
            if (result) this.gameCondition = result;

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

            halfmoveClock,
            hash,

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
        if (this.enPassantSquare) this.zobrist.xorEP(this.enPassantSquare);
        this.enPassantSquare = null;
        if (enPassantSquare) {
            this.enPassantSquare = enPassantSquare;
            this.zobrist.xorEP(enPassantSquare);
        }

        // Restore halfmove clock
        this.halfmoveClock = halfmoveClock;

        this.repetitionCount.set(hash, (this.repetitionCount.get(hash) || 1) - 1);

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


    getLegalMoves(fr, fc) {
        const piece = this.getPiece(fr, fc);
            if (this.isEmpty(piece)) return [];

        const isWhite = this.isWhite(piece);

        let attacks;
        const moves = [];

        const fsq = this.toSq(fr, fc);

        const ownOccupied = isWhite ? this.occupiedWhite : this.occupiedBlack;
        const enemyOccupied = isWhite ? this.occupiedBlack : this.occupiedWhite;

        switch (piece.toLowerCase()) {
            // Pawn
            case 'p':
                attacks = isWhite ? ChessEngine.pawnAttacksWhite[fsq].and(enemyOccupied)
                                  : ChessEngine.pawnAttacksBlack[fsq].and(enemyOccupied);

                // Add diagonal captures
                for (const t of attacks.allSquares()) moves.push([ Math.floor(t / 8), t % 8, null ]);

                // Add forward pushes
                const forward = isWhite ? fr - 1 : fr + 1;
                if (forward >= 0 && forward < 8) {
                    if (this.isEmpty(this.getPiece(forward, fc))) {
                        moves.push([forward, fc, null]);

                        // Double push from starting rank
                        const startRow = isWhite ? 6 : 1;
                        if (fr === startRow && this.isEmpty(this.getPiece(forward + (isWhite ? -1 : 1), fc))) {
                            moves.push([forward + (isWhite ? -1 : 1), fc, null]);
                        }
                    }
                }
                break;
            // Knight
            case 'n':
                attacks = ChessEngine.knightAttacks[fsq].and(enemyOccupied.not());
                for (const t of attacks.allSquares()) moves.push([Math.floor(t / 8), t % 8, null]);
                break;
            // Rook
            case 'r':
            // Bishop
            case 'b':
            // Queen
            case 'q':
                attacks = this.getSlidingAttacks(piece.toLowerCase(), fsq).and(enemyOccupied.not());
                for (const t of attacks.allSquares()) moves.push([Math.floor(t / 8), t % 8, null]);
                break;
            // King
            case 'k':
                attacks = ChessEngine.kingAttacks[fsq].and(enemyOccupied.not());
                for (const t of attacks.allSquares()) moves.push([Math.floor(t / 8), t % 8, null]);
                break;
        }

        return moves;
    }

    isLegalMove2(fr, fc, tr, tc) {
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
                if (fr === startRow && dc === 0 && dr === 2 * direction) {
                    const midRow = fr + direction;
                    if (this.isEmpty(this.getPiece(midRow, fc)) && this.isEmpty(targetPiece)) isLegal = true;
                }

                if (absC === 1 && dr === direction) {
                    // Diagonal capture
                    if (!this.isEmpty(targetPiece) && this.isWhite(targetPiece) != isWhite) isLegal = true;

                    // En-passant capture
                    if (this.enPassantSquare === tc && this.isEmpty(targetPiece)) isLegal = true;
                }
                break;
            // Knight
            case 'n':
                isLegal = (absR === 2 && absC === 1) || (absR === 1 && absC === 2);
                break;
            // Rook
            case 'r':
                isLegal = (dr === 0 || dc === 0) && this.isPathClear(fr, fc, tr, tc);
                break;
            // Bishop
            case 'b':
                isLegal = absR === absC && this.isPathClear(fr, fc, tr, tc);
                break;
            // Queen
            case 'q':
                if ((dr === 0 || dc === 0) || absR === absC) isLegal = this.isPathClear(fr, fc, tr, tc);
                break;
            // King
            case 'k':
                if (absR <= 1 && absC <= 1) isLegal = true;

                const castleRow = isWhite ? 7 : 0;

                // Castling
                if (fr === castleRow && fc === 4) {
                    const kingSide = isWhite ? this.castlingRights.whiteKingSide : this.castlingRights.blackKingSide;
                    const queenSide = isWhite ? this.castlingRights.whiteQueenSide : this.castlingRights.blackQueenSide;

                    // King-side
                    if (tr === castleRow && tc === 6 &&
                        kingSide &&
                        this.isEmpty(this.getPiece(castleRow, 5)) &&
                        this.isEmpty(this.getPiece(castleRow, 6)) &&
                        !this.isSquareAttacked(castleRow, 4, isWhite) &&
                        !this.isSquareAttacked(castleRow, 5, isWhite) &&
                        !this.isSquareAttacked(castleRow, 6, isWhite)
                    ) isLegal = true;

                    // Queen-side
                    if (tr === castleRow && tc === 2 &&
                        queenSide &&
                        this.isEmpty(this.getPiece(castleRow, 1)) &&
                        this.isEmpty(this.getPiece(castleRow, 2)) &&
                        this.isEmpty(this.getPiece(castleRow, 3)) &&
                        !this.isSquareAttacked(castleRow, 4, isWhite) &&
                        !this.isSquareAttacked(castleRow, 3, isWhite) &&
                        !this.isSquareAttacked(castleRow, 2, isWhite)
                    ) isLegal = true;
                }
                break;
        }

        return isLegal && this.moveKeepsKingSafe(fr, fc, tr, tc);
    }

    getLegalMoves2(fr, fc) {
        const piece = this.getPiece(fr, fc);
            if (this.isEmpty(piece)) return [];

        const moves = [];
        const isWhite = this.isWhite(piece);
        const isPawn = piece.toLowerCase() === 'p';

        // last rank based on side
        const promoteRank = isWhite ? 0 : this.rows - 1;

        const meOccupied = isWhite ? this.occupiedWhite : this.occupiedBlack;

        for (let tr = 0; tr < this.rows; tr++) {
            for (let tc = 0; tc < this.cols; tc++) {
                const sq = this.toSq(tr, tc);

                if (meOccupied.has(sq)) continue;

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

    hasLegalMoves(isWhite) {
        const meOccupied = isWhite ? this.occupiedWhite : this.occupiedBlack;

        for (let fr = 0; fr < this.rows; fr++) {
            for (let fc = 0; fc < this.cols; fc++) {
                const fsq = this.toSq(fr, fc);

                if (!meOccupied.has(fsq)) continue;

                // Try every square
                for (let tr = 0; tr < this.rows; tr++) {
                    for (let tc = 0; tc < this.cols; tc++) {
                        const tsq = this.toSq(tr, tc);

                        if (meOccupied.has(tsq)) continue;

                        if (this.isLegalMove(fr, fc, tr, tc)) return true;
                    }
                }
            }
        }

        return false;
    }


    evaluateEndConditions() {
        const whiteTurn = this.turn === 0;

        if (!this.hasLegalMoves(!whiteTurn)) {
            if (this.isKingInCheck(!whiteTurn)) {
                return !whiteTurn ? 'BLACK_WINS_CHECKMATE' : 'WHITE_WINS_CHECKMATE';
            } else {
                return 'DRAW_STALEMATE';
            }
        }

        if (this.insufficientMaterial()) return 'DRAW_DEAD_POSITION';

        if (this.halfmoveClock >= 100) return 'DRAW_50-MOVE_RULE';

        const historyHash = this.zobrist.hash;
        if (this.repetitionCount.get(historyHash) >= 3) return 'DRAW_THREEFOLD_REPETITION';

        return null;
    }

    SwitchTurn() {
        this.turn = 1 - this.turn;

        if (this.turn == 0 && this.whiteAI) this.whiteAI?.Play();
        if (this.turn == 1 && this.blackAI) this.blackAI?.Play();
    }


    isSquareAttacked(fr, fc, isWhite = true) {
        const enemyOccupied = isWhite ? this.occupiedBlack : this.occupiedWhite;

        // Check all enemy moves
        for (const piece of Object.keys(this.pieces)) {
            if (this.isWhite(piece) === isWhite) continue; // skip own pieces

            const bb = this.pieces[piece].and(enemyOccupied); // only occupied by enemy
            let sq = bb.bitIndex();

            while (sq >= 0) {
                const r = this.rows - 1 - Math.floor(sq / this.rows);
                const c = sq % this.cols;
                
                if (this.isLegalMove(r, c, fr, fc)) return true;
                
                bb.clearBit(sq);
                sq = bb.bitIndex();
            }
        }

        return false;
    }

    getKing(isWhite) {
        const kingChar = isWhite ? 'K' : 'k';
        const kingBB = this.pieces[kingChar];

        // Get the king's square
        const sq = kingBB.bitIndex();
        if (sq === -1) return true; // king missing = checkmate by definition

        const kr = this.rows - 1 - Math.floor(sq / this.rows);
        const kc = sq % this.cols;

        return { r: kr, c: kc };
    }

    isKingInCheck(isWhite) {
        const { r, c } = this.getKing(isWhite);

        return this.isSquareAttacked(r, c, isWhite);
    }

    moveKeepsKingSafe(fr, fc, tr, tc) {
        const movingPiece = this.getPiece(fr, fc);
            if (this.isEmpty(movingPiece)) return false;

        const isWhite = this.isWhite(movingPiece);
        const targetPiece = this.getPiece(tr, tc);

        // Simulate move on bitboards
        const fromSq = this.toSq(fr, fc);
        const toSq   = this.toSq(tr, tc);

        // Remove moving piece from original square
        this.pieces[movingPiece].clearBit(fromSq);

        // Remove captured piece (if any)
        if (!this.isEmpty(targetPiece)) {
            this.pieces[targetPiece].clearBit(toSq);
        }

        // Place moving piece on target square
        this.pieces[movingPiece].setBit(toSq);

        // Update occupied boards
        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        // Check king safety
        const safe = !this.isKingInCheck(isWhite);

        // Undo simulated move
        this.pieces[movingPiece].clearBit(toSq);
        this.pieces[movingPiece].setBit(fromSq);
        if (!this.isEmpty(targetPiece)) {
            this.pieces[targetPiece].setBit(toSq);
        }

        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        return safe;
    }


    insufficientMaterial() {
        const whiteTurn = this.turn === 0;

        const P = !whiteTurn ? this.pieces.P : this.pieces.p;
        const N = !whiteTurn ? this.pieces.N : this.pieces.n;
        const B = !whiteTurn ? this.pieces.B : this.pieces.b;
        const R = !whiteTurn ? this.pieces.R : this.pieces.r;
        const Q = !whiteTurn ? this.pieces.Q : this.pieces.q;

        // Any pawn/rook/queen = always mating potential
        if (!P.isZero() || !R.isZero() || !Q.isZero()) return false;

        const knights = N.countBits();
        const bishops = B.countBits();

        // King only
        if (knights === 0 && bishops === 0) return true;

        // Single minor piece (B or N)
        if ((knights === 1 && bishops === 0) || (knights === 0 && bishops === 1))
            return true;

        // Two knights cannot force mate
        if (knights === 2 && bishops === 0) return true;

        // Bishop vs Bishop but same colour = dead
        if (bishops === 2 && knights === 0) {
            // extract square colors for both bishops
            const squares = B.allSquares();
            const c1 = (squares[0] + Math.floor(squares[0] / 8)) % 2;
            const c2 = (squares[1] + Math.floor(squares[1] / 8)) % 2;
            if (c1 === c2) return true;
        }

        return false;
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

    toSq(r, c) { return (this.rows - 1 - r) * this.cols + c; }
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


    initAttackTables() {
        const add = (bb, sq) => bb.setBit(sq);
        const inBoard = (r,c) => r >= 0 && r < 8 && c >= 0 && c < 8;

        // Loop squares 0..63
        for (let sq = 0; sq < 64; sq++) {
            let r = sq >> 3, c = sq & 7;

            // Pawn moves
            let wbb = new BitBoard(), bbb = new BitBoard();

            // white pawns attack up
            if (inBoard(r - 1, c - 1)) add(wbb, (r - 1) * 8 + (c - 1));
            if (inBoard(r - 1, c + 1)) add(wbb, (r - 1) * 8 + (c + 1));
            ChessEngine.pawnAttacksWhite[sq] = wbb;

            // black pawns attack down
            if (inBoard(r + 1, c - 1)) add(bbb, (r + 1) * 8 + (c - 1));
            if (inBoard(r + 1, c + 1)) add(bbb, (r + 1) * 8 + (c + 1));
            ChessEngine.pawnAttacksBlack[sq] = bbb;

            // Knight
            let nbb = new BitBoard();

            const knightMoves = [
                [r + 2, c + 1], [r + 2, c - 1], [r - 2, c + 1], [r - 2, c - 1],
                [r + 1, c + 2], [r + 1, c - 2], [r - 1, c + 2], [r - 1, c - 2],
            ];
            for (const [rr, cc] of knightMoves) if (inBoard(rr, cc)) add(nbb, this.toSq(rr, cc));
            ChessEngine.knightAttacks[sq] = nbb;

            // Rook, Bishop and Queen
            // Directions for rook and bishop sliding
            const rookDirs   = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const bishopDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                
                let rookBB   = new BitBoard();
                let bishopBB = new BitBoard();

            // Rook rays
            for (const [dr,dc] of rookDirs) {
                let rr = r + dr, cc = c + dc;
                while (inBoard(rr,cc)) {
                    add(rookBB, this.toSq(rr, cc));
                    rr += dr; cc += dc;
                }
            }

            // Bishop rays
            for (const [dr,dc] of bishopDirs) {
                let rr = r + dr, cc = c + dc;
                while (inBoard(rr,cc)) {
                    add(bishopBB, this.toSq(rr, cc));
                    rr += dr; cc += dc;
                }
            }

            ChessEngine.rookRays[sq]   = rookBB;
            ChessEngine.bishopRays[sq] = bishopBB;

            // Queen = rook + bishop
            let q = rookBB.clone().or(bishopBB);
            ChessEngine.queenRays[sq] = q;

            // King moves
            let kbb = new BitBoard();

            for (let dr =- 1; dr <= 1; dr++) for (let dc=- 1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                let rr = r + dr, cc = c + dc;
                if (inBoard(rr, cc)) add(kbb, this.toSq(rr, cc));
            }
            ChessEngine.kingAttacks[sq] = kbb;
        }
    }

    getSlidingAttacks(type, fsq) {
        const occupied = this.occupied;
        const r = Math.floor(fsq / 8);
        const c = fsq % 8;
        let attacks = new BitBoard();

        const directions = {
            'r': [[-1,0],[1,0],[0,-1],[0,1]],
            'b': [[-1,-1],[-1,1],[1,-1],[1,1]],
            'q': [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
        }[type];

        for (const [dr, dc] of directions) {
            let rr = r + dr;
            let cc = c + dc;
            while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                const sq = this.toSq(rr, cc);
                attacks.setBit(sq);
                if (occupied.has(sq)) break; // stop at blocker
                rr += dr;
                cc += dc;
            }
        }

        return attacks;
    }
}