import { BitBoard } from './BitBoard.js';
import { Zobrist } from './Zobrist.js';

export class ChessEngine {
    static pawnMovesWhite = Array(64);
    static pawnMovesBlack = Array(64);
    static knightMoves = Array(64);
    static rookRays = Array(64);
    static bishopRays = Array(64);
    static queenRays = Array(64);
    static kingMoves = Array(64);

    static initialized = false;

    constructor(board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
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
        this.enPassantSquare = -1;

        if (!ChessEngine.initialized) {
            this.initMoveTables();
            ChessEngine.initialized = true;
        }

        this.turn = 0;

        this.promoPieces = ['q', 'r', 'b', 'n'];
        this.piecePoints = { p: 1, b: 3, n: 3, r: 5, q: 9, k: 0 };

        this.zobrist = new Zobrist();
        this.repetitionCount = new Map();

        this.gameCondition = 'PLAYING';
        this.logs = [];

        this.whiteAI = null;
        this.blackAI = null;

        this.renderer = null;
    }


    MovePiece(fr, fc, tr, tc, promotePiece = null) {
        if (this.gameCondition !== 'PLAYING') return;

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
        this.enPassantSquare = -1;

        // En-passant capture
        let isEnPassantCapture = false;
        const { r: epr, c: epc } = this.fromSq(prevEnPassant);
        if (isPawn && prevEnPassant !== -1 && tr === epr && tc === epc && !isCapture) {
            const capRow = isWhite ? tr + 1 : tr - 1;
            targetPiece = this.getPiece(capRow, tc);
            
            if (!this.isEmpty(targetPiece)) {
                this.zobrist.xorPiece(targetPiece, capRow, tc);
                console.log(tr, tc, epr, epc, targetPiece, capRow, tc);
                this.pieces[targetPiece].clearBit(this.toSq(capRow, tc));
                
                isEnPassantCapture = true;
            };
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
            const epRow = (fr + tr) / 2;
            this.enPassantSquare = this.toSq(epRow, fc);
            this.zobrist.xorEP(this.enPassantSquare);
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
            if (isCapture || isEnPassantCapture) {
                if (isWhite) {
                    this.renderer.whiteCaptures.push(targetPiece);
                    this.renderer.whitePoints += this.piecePoints[targetPiece.toLowerCase()];
                } else {
                    this.renderer.blackCaptures.push(targetPiece);
                    this.renderer.blackPoints += this.piecePoints[targetPiece.toLowerCase()];
                }
            }

            if (promotePiece) {
                if (isWhite) {
                    this.renderer.whitePoints += this.piecePoints[promotePiece.toLowerCase()];
                } else {
                    this.renderer.blackPoints += this.piecePoints[promotePiece.toLowerCase()];
                }
            }

            this.renderer.whiteKingChecked = this.isKingInCheck(true);
            this.renderer.blackKingChecked = this.isKingInCheck(false);

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

            console.log(this.zobrist.hash);
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.UpdateGame();
            this.renderer.AddToLog();

            if (promotePiece) return this.renderer.PlaySound(3);
            else if (this.renderer.whiteKingChecked || this.renderer.blackKingChecked) return this.renderer.PlaySound(2);
            else if (isCapture) return this.renderer.PlaySound(1);
            else if (castle !== 0) return this.renderer.PlaySound(4);
            else return this.renderer.PlaySound(0);
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
        const isCapture = !this.isEmpty(targetPiece);

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

        if (isCapture && !isEnPassantCapture) {
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
        if (this.enPassantSquare > 0) this.zobrist.xorEP(this.enPassantSquare);
        this.enPassantSquare = -1;
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
            if (isCapture || isEnPassantCapture) {
                if (isWhite) {
                    this.renderer.whiteCaptures.splice(-1);
                    this.renderer.whitePoints -= this.piecePoints[targetPiece.toLowerCase()];
                } else {
                    this.renderer.blackCaptures.splice(-1);
                    this.renderer.blackPoints -= this.piecePoints[targetPiece.toLowerCase()];
                }
            }

            if (promotePiece) {
                if (isWhite) {
                    this.renderer.whitePoints -= this.piecePoints[promotePiece.toLowerCase()];
                } else {
                    this.renderer.blackPoints -= this.piecePoints[promotePiece.toLowerCase()];
                }
            }

            this.renderer.whiteKingChecked = this.isKingInCheck(true);
            this.renderer.blackKingChecked = this.isKingInCheck(false);

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

            console.log(this.zobrist.hash);
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.UpdateGame();
            this.renderer.RemoveFromLog();

            if (promotePiece) return this.renderer.PlaySound(3);
            else if (this.renderer.whiteKingChecked || this.renderer.blackKingChecked) return this.renderer.PlaySound(2);
            else if (isCapture) return this.renderer.PlaySound(1);
            else if (castle !== 0) return this.renderer.PlaySound(4);
            else return this.renderer.PlaySound(0);
        }
    }


    getLegalMoves(fr, fc) {
        const piece = this.getPiece(fr, fc);
            if (this.isEmpty(piece)) return [];

        const isWhite = this.isWhite(piece);

        let attacks;
        let moves = [];

        const fsq = this.toSq(fr, fc);

        const ownOccupied = isWhite ? this.occupiedWhite : this.occupiedBlack;
        const enemyOccupied = isWhite ? this.occupiedBlack : this.occupiedWhite;

        switch (piece.toLowerCase()) {
            // Pawn
            case 'p':
                attacks = isWhite ? ChessEngine.pawnMovesWhite[fsq].and(enemyOccupied)
                                  : ChessEngine.pawnMovesBlack[fsq].and(enemyOccupied);

                // Diagonal captures
                for (const tsq of attacks.allSquares()) {
                    const { r: tr, c: tc } = this.fromSq(tsq);

                    moves.push([ tr, tc, null ]);
                }

                // Forward pushes
                const dir = isWhite ? -1 : 1;
                const forward = fr + dir;
                if (forward >= 0 && forward < this.rows) {
                    if (this.isEmpty(this.getPiece(forward, fc))) {
                        moves.push([forward, fc, null]);

                        // Double push from starting rank
                        const startRow = isWhite ? 6 : 1;
                        if (fr === startRow && this.isEmpty(this.getPiece(forward + (isWhite ? -1 : 1), fc))) {
                            moves.push([forward + (isWhite ? -1 : 1), fc, null]);
                        }
                    }
                }

                // En-passant captures
                const epTarget = this.enPassantSquare;
                if (epTarget !== null && epTarget !== -1) {
                    const { r: epr, c: epc } = this.fromSq(epTarget);

                    if (Math.abs(epc - fc) === 1 && epr === fr + dir) moves.push([epr, epc, null]);
                }
                break;
            // Knight
            case 'n':
                attacks = ChessEngine.knightMoves[fsq].and(ownOccupied.not());
                for (const tsq of attacks.allSquares()) {
                    const { r: tr, c: tc } = this.fromSq(tsq);

                    moves.push([ tr, tc, null ]);
                }
                break;
            // Rook
            case 'r':
            // Bishop
            case 'b':
            // Queen
            case 'q':
                attacks = this.getSlidingMoves(piece.toLowerCase(), fsq).and(ownOccupied.not());
                for (const tsq of attacks.allSquares()) {
                    const { r: tr, c: tc } = this.fromSq(tsq);

                    moves.push([ tr, tc, null ]);
                }
                break;
            // King
            case 'k':
                attacks = ChessEngine.kingMoves[fsq].and(ownOccupied.not());
                for (const tsq of attacks.allSquares()) {
                    const { r: tr, c: tc } = this.fromSq(tsq);

                    if (this.isSquareAttacked(tr, tc, isWhite)) continue;

                    moves.push([ tr, tc, null ]);
                }

                // Castling
                const castleRow = isWhite ? 7 : 0;
                if (fr === castleRow && fc === 4) {
                    const kingSide = isWhite ? this.castlingRights.whiteKingSide : this.castlingRights.blackKingSide;
                    const queenSide = isWhite ? this.castlingRights.whiteQueenSide : this.castlingRights.blackQueenSide;

                    // King-side
                    if (kingSide &&
                        this.isEmpty(this.getPiece(castleRow, 5)) &&
                        this.isEmpty(this.getPiece(castleRow, 6)) &&
                        !this.isSquareAttacked(castleRow, 4, isWhite) &&
                        !this.isSquareAttacked(castleRow, 5, isWhite) &&
                        !this.isSquareAttacked(castleRow, 6, isWhite)
                    ) moves.push([ castleRow, 6, null ]);

                    // Queen-side
                    if (queenSide &&
                        this.isEmpty(this.getPiece(castleRow, 1)) &&
                        this.isEmpty(this.getPiece(castleRow, 2)) &&
                        this.isEmpty(this.getPiece(castleRow, 3)) &&
                        !this.isSquareAttacked(castleRow, 4, isWhite) &&
                        !this.isSquareAttacked(castleRow, 3, isWhite) &&
                        !this.isSquareAttacked(castleRow, 2, isWhite)
                    ) moves.push([ castleRow, 2, null ]);
                }

                break;
        }

        moves = moves.filter(m => this.moveKeepsKingSafe(fr, fc, m[0], m[1]));
        return moves;
    }

    getPlayerLegalMoves(isWhite) {
        const moves = [];

        // get list of bitboards for the side to move
        const pieceList = isWhite
            ? ['P','N','B','R','Q','K']
            : ['p','n','b','r','q','k'];

        for (const piece of pieceList) {
            let bb = this.pieces[piece].clone();  // copy so we can pop bits

            // iterate through every piece position (much faster than 64-square scan)
            for (let sq = bb.bitIndex(); sq !== -1; bb.clearBit(sq), sq = bb.bitIndex()) {
                const { r: fr, c: fc } = this.fromSq(sq);

                // getLegalMoves already returns only pseudo legal moves
                const targets = this.getLegalMoves(fr, fc);

                for (const [tr, tc, promote] of targets) {
                    moves.push({ fr, fc, tr, tc, promote });
                }
            }
        }

        return moves;
    }

    hasLegalMoves(isWhite) {
        const bb = isWhite 
            ? this.occupiedWhite.clone() 
            : this.occupiedBlack.clone();

        // While any piece exists
        while (bb.lo !== 0 || bb.hi !== 0) {
            const sq = bb.popLSB();
            const { r, c } = this.fromSq(sq);
            
            // getLegalMoves already filters legal & pins & check states
            if (this.getLegalMoves(r, c).length > 0)
                return true;
        }
        return false;
    }

    isSquareAttacked(r, c, isWhite) {
        const byWhite = !isWhite;
        const sq = this.toSq(r,c);

        // Enemy piece bitboards
        const P = this.pieces[ byWhite ? 'P' : 'p' ];
        const N = this.pieces[ byWhite ? 'N' : 'n' ];
        const B = this.pieces[ byWhite ? 'B' : 'b' ];
        const R = this.pieces[ byWhite ? 'R' : 'r' ];
        const Q = this.pieces[ byWhite ? 'Q' : 'q' ];
        const K = this.pieces[ byWhite ? 'K' : 'k' ];

        // Pawns
        const pawnBB = byWhite
            ? ChessEngine.pawnMovesBlack[sq]
            : ChessEngine.pawnMovesWhite[sq];

        if (!pawnBB.and(P).isZero()) return true;

        // Knights
        if (!ChessEngine.knightMoves[sq].and(N).isZero()) return true;

        // King
        if (!ChessEngine.kingMoves[sq].and(K).isZero()) return true;

        // Sliding pieces
        const rookAtk   = this.getSlidingMoves('r', sq);
        const bishopAtk = this.getSlidingMoves('b', sq);

        if (!rookAtk.and(R.or(Q)).isZero())   return true;
        if (!bishopAtk.and(B.or(Q)).isZero()) return true;

        return false;
    }

    isKingInCheck(isWhite) {
        const { r, c } = this.getKing(isWhite);

        return this.isSquareAttacked(r, c, isWhite);
    }

    moveKeepsKingSafe(fr, fc, tr, tc) {
        const movingPiece = this.getPiece(fr, fc);
        if (this.isEmpty(movingPiece)) return false;

        const isWhite = this.isWhite(movingPiece);

        const fromSq = this.toSq(fr, fc);
        const toSq   = this.toSq(tr, tc);

        // ---- QUICK SNAPSHOTS (CHEAP AND FAST) ---- //
        const pieceBB         = this.pieces[movingPiece];
        const capturedPiece   = this.getPiece(tr, tc);
        const capturedBB      = capturedPiece ? this.pieces[capturedPiece] : null;

        // Save occupancy before change
        const occW = this.occupiedWhite;
        const occB = this.occupiedBlack;

        // ---- APPLY TEMP MOVE ---- //

        // Remove from origin
        pieceBB.clearBit(fromSq);

        // Remove captured
        if (capturedBB) capturedBB.clearBit(toSq);

        // Move to target
        pieceBB.setBit(toSq);

        // Update occupancy (delta only, no OR spam)
        if (isWhite) {
            this.occupiedWhite = occW.clone();
            this.occupiedWhite.clearBit(fromSq);
            this.occupiedWhite.setBit(toSq);

            if (capturedBB) {
                this.occupiedBlack = occB.clone();
                this.occupiedBlack.clearBit(toSq);
            }
        } else {
            this.occupiedBlack = occB.clone();
            this.occupiedBlack.clearBit(fromSq);
            this.occupiedBlack.setBit(toSq);

            if (capturedBB) {
                this.occupiedWhite = occW.clone();
                this.occupiedWhite.clearBit(toSq);
            }
        }
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        // ---- CHECK KING SAFETY ---- //
        const safe = !this.isKingInCheck(isWhite);

        // ---- UNDO MOVE (REVERT EXACTLY) ---- //
        pieceBB.clearBit(toSq);
        pieceBB.setBit(fromSq);
        if (capturedBB) capturedBB.setBit(toSq);

        this.occupiedWhite = occW;
        this.occupiedBlack = occB;
        this.occupied      = occW.or(occB);

        return safe;
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

        if (this.insufficientMaterial(true) && this.insufficientMaterial(false)) return 'DRAW_DEAD_POSITION';

        if (this.halfmoveClock >= 100) return 'DRAW_50-MOVE_RULE';

        const historyHash = this.zobrist.hash;
        if (this.repetitionCount.get(historyHash) >= 3) return 'DRAW_THREEFOLD_REPETITION';

        return null;
    }

    insufficientMaterial(isWhite) {
        const P = !isWhite ? this.pieces.P : this.pieces.p;
        const N = !isWhite ? this.pieces.N : this.pieces.n;
        const B = !isWhite ? this.pieces.B : this.pieces.b;
        const R = !isWhite ? this.pieces.R : this.pieces.r;
        const Q = !isWhite ? this.pieces.Q : this.pieces.q;

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


    SwitchTurn() {
        this.turn = 1 - this.turn;

        if (this.turn == 0 && this.whiteAI) this.whiteAI?.Play();
        if (this.turn == 1 && this.blackAI) this.blackAI?.Play();
    }


    getKing(isWhite) {
        const kingChar = isWhite ? 'K' : 'k';
        const kingBB = this.pieces[kingChar];

        const sq = kingBB.bitIndex();
            if (sq === -1) return null;

        const { r, c } = this.fromSq(sq);

        return { r, c };
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


    getMoveNotation(fullMove) {
        if (!fullMove) return;

        const {
            fr, fc, tr, tc,
            originalPiece,
            targetPiece,
            promotePiece,

            castle,
            isEnPassantCapture
        } = fullMove;

        let notation = '';

        // Handle castling first
        if (castle === 1) {
            // King-side castling
            notation = 'O-O';
        } else if (castle === 2) {
            // Queen-side castling
            notation = 'O-O-O';
        } else {
            const squareName = (r, c) => {
                const file = String.fromCharCode('a'.charCodeAt(0) + c);
                const rank = (this.rows - r).toString();
                return file + rank;
            }

            let pieceLetter = originalPiece.toLowerCase() === 'p' ? '' : originalPiece.toUpperCase();

            // Capture?
            const isCapture = !this.isEmpty(targetPiece);

            // Origin + dest square names
            const fromSq = squareName(fr, fc);
            const toSq = squareName(tr, tc);

            // Build notation
            if (pieceLetter) notation += pieceLetter;

            // Pawn captures show file of origin
            if (!pieceLetter && isCapture) {
                const file = String.fromCharCode('a'.charCodeAt(0) + fc);
                notation += file;
            }

            if (isCapture) notation += 'x';

            notation += toSq;

            // Promotion
            if (promotePiece) {
                notation += '=' + promotePiece.toUpperCase();
            }
            if (isEnPassantCapture) {
                notation += ' e.p.';
            }
        }

        // Check / mate
        const whiteToMove = this.turn === 0;
        const opponentIsWhite = !whiteToMove;

        const oppInCheck = this.isKingInCheck(opponentIsWhite);
        const oppLegalMoves = this.hasLegalMoves(opponentIsWhite);

        if (!notation.startsWith('O-O') && oppInCheck && !oppLegalMoves) notation += '#';
        else if (!notation.startsWith('O-O') && oppInCheck && oppLegalMoves) notation += '+';

        return notation;
    }


    toSq(r, c) { return (this.rows - 1 - r) * this.cols + c; }
    fromSq(sq) { return { r: this.rows - 1 - Math.floor(sq / this.rows), c: sq % this.cols } }

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


    initMoveTables() {
        const add = (bb, sq) => bb.setBit(sq);
        const inBoard = (r,c) => r >= 0 && r < this.rows && c >= 0 && c < this.cols;

        // Loop squares 0..63
        for (let sq = 0; sq < 64; sq++) {
            const { r, c } = this.fromSq(sq);

            // Pawn moves
            let wbb = new BitBoard(), bbb = new BitBoard();

            // white pawns move up
            if (inBoard(r - 1, c - 1)) add(wbb, this.toSq(r - 1, c - 1));
            if (inBoard(r - 1, c + 1)) add(wbb, this.toSq(r - 1, c + 1));
            ChessEngine.pawnMovesWhite[sq] = wbb;

            // black pawns move down
            if (inBoard(r + 1, c - 1)) add(bbb, this.toSq(r + 1, c - 1));
            if (inBoard(r + 1, c + 1)) add(bbb, this.toSq(r + 1, c + 1));
            ChessEngine.pawnMovesBlack[sq] = bbb;

            // Knight
            let nbb = new BitBoard();

            const knightMoves = [
                [r + 2, c + 1], [r + 2, c - 1], [r - 2, c + 1], [r - 2, c - 1],
                [r + 1, c + 2], [r + 1, c - 2], [r - 1, c + 2], [r - 1, c - 2],
            ];
            for (const [rr, cc] of knightMoves) if (inBoard(rr, cc)) add(nbb, this.toSq(rr, cc));
            ChessEngine.knightMoves[sq] = nbb;

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
            ChessEngine.kingMoves[sq] = kbb;
        }
    }

    getSlidingMoves(type, fsq) {
        const occupied = this.occupied;
        const { r: fr, c: fc } = this.fromSq(fsq);

        let rays;
        switch(type) {
            case 'r': rays = ChessEngine.rookRays[fsq]; break;
            case 'b': rays = ChessEngine.bishopRays[fsq]; break;
            case 'q': rays = ChessEngine.queenRays[fsq]; break;
        }

        let moves = rays.clone();

        for (let tsq of rays.allSquares()) {
            if (occupied.has(tsq)) {
                const { r: tr, c: tc } = this.fromSq(tsq);

                const dirR = Math.sign(tr - fr);
                const dirC = Math.sign(tc - fc);

                let rr = tr + dirR;
                let cc = tc + dirC;
                while (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
                    moves.clearBit(this.toSq(rr, cc));
                    rr += dirR;
                    cc += dirC;
                }
            }
        }

        return moves;
    }
}