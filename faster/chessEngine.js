import { BitBoard } from "./BitBoard.js";

export class ChessEngine {
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

        this.castlingRights = {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        };
        this.enPassantSquare = null;

        this.turn = 0;

        this.promoPieces = ['q', 'r', 'b', 'n'];

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

        // Promote
        if (this.renderer && isPawn && !promotePiece) {
            if ((isWhite && tr === 0) || (!isWhite && tr === this.rows - 1)) {
                this.renderer.Promote(fr, fc, tr, tc);
                return;
            }
        }

        // Castling
        let castle = 0;
        if (movingPiece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
            if (tc === 6) { // King-side
                this.pieces[this.getPiece(tr, 7)].setBit((this.rows - 1 - tr) * this.cols + 5);

                this.pieces[this.getPiece(tr, 7)].clearBit((this.rows - 1 - tr) * this.cols + 7);

                castle = 1;
                if (this.renderer) {
                    this.renderer.UpdateSquare(tr, 5);
                    this.renderer.UpdateSquare(tr, 7);
                }
            } else if (tc === 2) { // Queen-side
                this.pieces[this.getPiece(tr, 0)].setBit((this.rows - 1 - tr) * this.cols + 3);

                this.pieces[this.getPiece(tr, 0)].clearBit((this.rows - 1 - tr) * this.cols + 0);
                
                castle = 2;
                if (this.renderer) {
                    this.renderer.UpdateSquare(tr, 3);
                    this.renderer.UpdateSquare(tr, 0);
                }
            }
        }

        // En-passant capture
        let isEnPassantCapture = false;
        if (isPawn && this.enPassantSquare && tr === this.enPassantSquare.r && tc === this.enPassantSquare.c && this.isEmpty(targetPiece)) {
            const capRow = this.isWhite(movingPiece) ? tr + 1 : tr - 1;
            targetPiece = this.getPiece(capRow, tc);

            this.pieces[targetPiece].clearBit((this.rows - 1 - capRow) * this.cols + tc);

            if (this.renderer) this.renderer.UpdateSquare(capRow, tc);

            isEnPassantCapture = true;
        }

        // Move piece
        const fSquare = (this.rows - 1 - fr) * this.cols + fc;
        const tSquare = (this.rows - 1 - tr) * this.cols + tc;

        const bb = this.pieces[movingPiece];
        bb.clearBit(fSquare);

        if (promotePiece) this.pieces[originalPiece].clearBit(fSquare);

        const isCapture = !this.isEmpty(targetPiece);
        if (isCapture) this.pieces[targetPiece].clearBit(tSquare);

        bb.setBit(tSquare);

        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        // Castle rights
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

        // En-passant rights
        const prevEnPassantSquare = this.enPassantSquare ? { r: this.enPassantSquare.r, c: this.enPassantSquare.c } : null;
        this.enPassantSquare = null;
        if (isPawn && Math.abs(fr - tr) === 2) {
            this.enPassantSquare = { r: (fr + tr) / 2, c: fc };
        }

        // Store move
        this.logs.push({
            fr, fc, tr, tc,
            originalPiece,
            targetPiece,
            promotePiece,

            castle,
            castlingRights: prevCastlingRights,
            isEnPassantCapture,
            enPassantSquare: prevEnPassantSquare,

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

        // Restore piece positions
        const tSquare = (this.rows - 1 - tr) * this.cols + tc;

        const fbb = this.pieces[originalPiece];
        fbb.clearBit(tSquare);
        fbb.setBit((this.rows - 1 - fr) * this.cols + fc);

        if (!this.isEmpty(targetPiece)) this.pieces[targetPiece].setBit(tSquare);

        if (promotePiece) this.pieces[promotePiece].clearBit(tSquare);

        // Undo castling
        if (castle === 1) { // King-side
            this.pieces[this.getPiece(tr, 5)].setBit((this.rows - 1 - tr) * this.cols + 7);

            this.pieces[this.getPiece(tr, 5)].clearBit((this.rows - 1 - tr) * this.cols + 5);

            if (this.renderer) {
                this.renderer.UpdateSquare(tr, 7);
                this.renderer.UpdateSquare(tr, 5);
            }
        } else if (castle === 2) { // Queen-side
            this.pieces[this.getPiece(tr, 3)].setBit((this.rows - 1 - tr) * this.cols + 0);

            this.pieces[this.getPiece(tr, 3)].clearBit((this.rows - 1 - tr) * this.cols + 3);

            if (this.renderer) {
                this.renderer.UpdateSquare(tr, 0);
                this.renderer.UpdateSquare(tr, 3);
            }
        }

        // Undo En-passant capture
        if (isEnPassantCapture) {
            const capRow = isWhite ? tr + 1 : tr - 1;
            const pawn = isWhite ? 'p' : 'P';

            this.pieces[pawn].setBit((this.rows - 1 - capRow) * this.cols + tc);

            this.pieces[pawn].clearBit((this.rows - 1 - tr) * this.cols + tc);

            if (this.renderer) this.renderer.UpdateSquare(capRow, tc);
        }

        this.occupiedWhite = this.pieces.P.or(this.pieces.N).or(this.pieces.B).or(this.pieces.R).or(this.pieces.Q).or(this.pieces.K);
        this.occupiedBlack = this.pieces.p.or(this.pieces.n).or(this.pieces.b).or(this.pieces.r).or(this.pieces.q).or(this.pieces.k);
        this.occupied = this.occupiedWhite.or(this.occupiedBlack);

        // Restore castling rights
        this.castlingRights.whiteKingSide = castlingRights.whiteKingSide;
        this.castlingRights.whiteQueenSide = castlingRights.whiteQueenSide;
        this.castlingRights.blackKingSide = castlingRights.blackKingSide;
        this.castlingRights.blackQueenSide = castlingRights.blackQueenSide;

        // Restore En-passant square
        this.enPassantSquare = enPassantSquare ? { r: enPassantSquare.r, c: enPassantSquare.c } : null;

        // Restore game condition and turn
        this.gameCondition = gameCondition;
        this.SwitchTurn();

        // UI updates
        if (this.renderer) {
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.UpdateGame();
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
            if (this.occupied.has((this.rows - 1 - r) * this.cols + c;)) return false;
            r += stepR;
            c += stepC;
        }
        return true;
    }

    getPiece(r, c) {
        const sq = (7 - r) * 8 + c;

        for (const [piece, bb] of Object.entries(this.pieces)) {
            if (bb.has(sq)) return piece;
        }

        return '.';
    }

    isWhite(p) { return p ? p !== '.' && p === p.toUpperCase() : null; }
    isBlack(p) { return p ? p !== '.' && p === p.toLowerCase() : null; }
    isEmpty(p) { return p ? p == '.' : null; }

    clone() {
        const clone = new ChessEngine();

        // Deep copy all piece bitboards
        clone.pieces = {...this.pieces};

        clone.occupiedWhite = this.occupiedWhite.clone();
        clone.occupiedBlack = this.occupiedBlack.clone();
        clone.occupied = this.occupied.clone();

        clone.turn = this.turn;

        clone.gameCondition = this.gameCondition;

        return clone;
    }
}
