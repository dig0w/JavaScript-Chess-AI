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
<<<<<<< Updated upstream
        this.rows = board.length;
        this.cols = board[0].length;

        this.isNormal = this.rows == this.cols && this.rows == 8;
=======
        this.board = board;
        this.rows = board.length;
        this.cols = board[0].length;
>>>>>>> Stashed changes

        this.turn = 0;

        this.whiteAI = null;
        this.whiteKingChecked = false;
        this.whiteCaptures = [];
        this.whitePoints = 0;

        this.blackAI = null;
        this.blackKingChecked = false;
        this.blackCaptures = [];
        this.blackPoints = 0;

        this.piecePoints = {
            'p': 1,
            'b': 3,
            'n': 3,
            'r': 5,
            'q': 9,
            'k': 0
        };

        this.promoPieces = ['q', 'r', 'b', 'n'];

<<<<<<< Updated upstream
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
        if (!ChessEngine.initialized) {
            this.initMoveTables();
            ChessEngine.initialized = true;
        }

=======
>>>>>>> Stashed changes
        this.castlingRights = {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        };
        this.enPassantSquare = null;

<<<<<<< Updated upstream
        this.turn = 0;

        this.promoPieces = ['q', 'r', 'b', 'n'];
        this.piecePoints = { p: 1, b: 3, n: 3, r: 5, q: 9, k: 0 };

        this.halfmoveClock = 0;
        this.zobrist = new Zobrist(this.rows, this.cols);
        this.repetitionCount = new Map();
        this.repetitionCount.set(this.zobrist.hash, 1);
=======
        this.halfmoveClock = 0;
        this.positionHistory = [];
>>>>>>> Stashed changes

        this.gameCondition = 'PLAYING';
        this.logs = [];
        this.totalPlies = 0;

        this.hash = 0;
        this.zobrist = {
            piece: {},   // [piece][square]
            castle: {},  // castling rights
            ep: new Array(8).fill(0), // EP file hashes
            side: Math.floor(Math.random() * 2**32)
        };
        this.initZobrist();

        this.renderer = null;
        this.count = 0;
    }

    MovePiece(fr, fc, tr, tc, promotePiece = null) {
<<<<<<< Updated upstream
        if (this.gameCondition !== 'PLAYING') {
            console.error('GAME CONDITION', { fr, fc, tr, tc, promote: promotePiece });
            return false;
        }

        // Get pieces
        const originalPiece = this.getPiece(fr, fc);
            if (this.isEmpty(originalPiece)) {
                console.error('EMPTY PIECE');
                return false;
            }
            if (this.isWhite(originalPiece) == (this.turn == 1)) {
                console.error('OPP PIECE');
                return false;
            }
        const isWhite = this.isWhite(originalPiece);
        const isPawn = originalPiece.toLowerCase() === 'p';

=======
        if (!this.isLegalMove(fr, fc, tr, tc) || this.gameCondition !== 'PLAYING') return;

        // Get pieces
        const originalPiece = this.board[fr][fc];
>>>>>>> Stashed changes
        let movingPiece = originalPiece;
            if (promotePiece) movingPiece = this.turn == 0 ? promotePiece.toUpperCase() : promotePiece.toLowerCase();
        let targetPiece = this.board[tr][tc];

        // Promote
        if (this.renderer && movingPiece.toLowerCase() === 'p' && !promotePiece) {
            const isWhite = this.isWhite(movingPiece);

            if ((isWhite && tr === 0) || (!isWhite && tr === this.rows - 1)) {
                this.renderer.Promote(fr, fc, tr, tc);
                return false;
            }
        }

        this.zobristXorPiece(originalPiece, fr, fc);

        // Castling
        let castle = 0;
        if (movingPiece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
            if (tc === 6) { // King-side
                this.zobristXorPiece(this.board[tr][7], tr, 7);

                this.board[tr][5] = this.board[tr][7];
                this.board[tr][7] = '.';

                this.zobristXorPiece(this.board[tr][5], tr, 5);

                if (this.renderer) {
                    this.renderer.UpdateSquare(tr, 5);
                    this.renderer.UpdateSquare(tr, 7);
                }

                castle = 1;
            } else if (tc === 2) { // Queen-side
                this.zobristXorPiece(this.board[tr][0], tr, 0);

                this.board[tr][3] = this.board[tr][0];
                this.board[tr][0] = '.';

                this.zobristXorPiece(this.board[tr][3], tr, 3);

                if (this.renderer) {
                    this.renderer.UpdateSquare(tr, 3);
                    this.renderer.UpdateSquare(tr, 0);
                }

                castle = 2;
            }
        }

        // En-passant capture
        let isEnPassantCapture = false;
        if (movingPiece.toLowerCase() === 'p' && this.enPassantSquare && tr === this.enPassantSquare.r && tc === this.enPassantSquare.c && this.isEmpty(targetPiece)) {
            const capRow = this.isWhite(movingPiece) ? tr + 1 : tr - 1;
            targetPiece = this.board[capRow][tc];
            this.board[capRow][tc] = '.';

            this.zobristXorPiece(targetPiece, capRow, tc);

            if (this.renderer) this.renderer.UpdateSquare(capRow, tc);

            isEnPassantCapture = true;
        }
        
        // Move piece
        this.board[tr][tc] = movingPiece;
        this.board[fr][fc] = '.';

        this.zobristXorPiece(movingPiece, tr, tc);

        const isCapture = !this.isEmpty(targetPiece) && this.isWhite(movingPiece) !== this.isWhite(targetPiece);
        if (this.renderer) {
            // Capture
            if (isCapture || isEnPassantCapture) {
                if (this.isWhite(movingPiece)) {
                    this.whiteCaptures.push(targetPiece);
                } else {
                    this.blackCaptures.push(targetPiece);
                }
            }

            // King check
            this.whiteKingChecked = this.isKingInCheck(true);
            this.blackKingChecked = this.isKingInCheck(false);

            // Piece points
            this.whitePoints = 0;
            this.blackPoints = 0;
            for (const [key, value] of Object.entries(this.piecePoints)) {
                this.whitePoints += this.getPieces(key.toLocaleUpperCase()).length * value;
                this.blackPoints += this.getPieces(key.toLocaleLowerCase()).length * value;
            }
        }

        if (isCapture) {
            this.zobristXorPiece(targetPiece, tr, tc);
        }

        // Draw rules
        if (movingPiece.toLowerCase() == 'p' || isCapture || isEnPassantCapture) this.halfmoveClock = 0;
        else this.halfmoveClock++;

        this.positionHistory.push(this.getPositionKey());

        // Castle rights
        const prevCastlingRights = {
            whiteKingSide: this.castlingRights.whiteKingSide,
            whiteQueenSide: this.castlingRights.whiteQueenSide,
            blackKingSide: this.castlingRights.blackKingSide,
            blackQueenSide: this.castlingRights.blackQueenSide
        };

        if (movingPiece.toLowerCase() === 'k') {
            if (this.isWhite(movingPiece)) {
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
<<<<<<< Updated upstream
        if (isCapture && targetPiece.toLowerCase() === 'r') {
            if (tr === 7 && tc === 0) this.castlingRights.whiteQueenSide = false;
            if (tr === 7 && tc === 7) this.castlingRights.whiteKingSide = false;
            if (tr === 0 && tc === 0) this.castlingRights.blackQueenSide = false;
            if (tr === 0 && tc === 7) this.castlingRights.blackKingSide = false;
        }
        this.zobrist.xorCastleRights(this.castlingRights);
=======
>>>>>>> Stashed changes

        // En-passant rights
        const prevEnPassantSquare = this.enPassantSquare ? { r: this.enPassantSquare.r, c: this.enPassantSquare.c } : null;
        this.enPassantSquare = null;
        if (movingPiece.toLowerCase() === 'p' && Math.abs(fr - tr) === 2) {
            const epRow = (fr + tr) / 2;
            this.enPassantSquare = { r: epRow, c: fc };
        }

        this.zobristXorEP();
        this.zobristXorCastleRights();

        this.hash ^= this.zobrist.side;

        // Store move
        this.logs.push({
            fr, fc, tr, tc,
            originalPiece,
            movingPiece,
            targetPiece,
            promotePiece,

            castle,
            isEnPassantCapture,
            enPassantCaptureRow: isEnPassantCapture ? (this.isWhite(movingPiece) ? tr + 1 : tr - 1) : null,
            enPassantSquare: prevEnPassantSquare,
            castlingRights: prevCastlingRights,
            
            halfmoveClock: this.halfmoveClock,

            whiteKingChecked: this.whiteKingChecked,
            blackKingChecked: this.blackKingChecked,
            whiteCapturesLength: this.whiteCaptures.length,
            blackCapturesLength: this.blackCaptures.length,

            gameCondition: this.gameCondition,
            turn: this.turn
        });
        this.totalPlies++;

        // Game condition
        const result = this.evaluateEndConditions();
            if (result) this.gameCondition = result;

        // Switch turn
        if (this.gameCondition == 'PLAYING') this.SwitchTurn();

        // UI
        if (this.renderer) {
<<<<<<< Updated upstream
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

            this.renderer.whiteKingChecked = this.isKingInCheck(true);
            this.renderer.blackKingChecked = this.isKingInCheck(false);

            console.log(this.zobrist.hash);
=======
>>>>>>> Stashed changes
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.AddToLog();
            this.renderer.UpdateGame();

<<<<<<< Updated upstream
            if (promotePiece) this.renderer.PlaySound(3);
            else if (this.renderer.whiteKingChecked || this.renderer.blackKingChecked) this.renderer.PlaySound(2);
            else if (isCapture) this.renderer.PlaySound(1);
            else if (castle !== 0) this.renderer.PlaySound(4);
            else this.renderer.PlaySound(0);
=======
            if (promotePiece) return this.renderer.PlaySound(3);
            else if (this.whiteKingChecked || this.blackKingChecked) return this.renderer.PlaySound(2);
            else if (isCapture) return this.renderer.PlaySound(1);
            else if (castle !== 0) return this.renderer.PlaySound(4);
            else return this.renderer.PlaySound(0);
>>>>>>> Stashed changes
        }

        return true;
    }

    undoMove() {
        if (this.logs.length === 0) return false;

        const lastMove = this.logs.pop();
        this.positionHistory.pop();

        const {
            fr, fc, tr, tc,
            originalPiece,
            movingPiece,
            targetPiece,
            promotePiece,

            castle,
            isEnPassantCapture,
            enPassantCaptureRow,
            enPassantSquare,
            castlingRights,

            halfmoveClock,

            whiteKingChecked,
            blackKingChecked,
            whiteCapturesLength,
            blackCapturesLength,

            gameCondition,
            turn
        } = lastMove;

        const white = this.isWhite(movingPiece);

        this.hash ^= this.zobrist.side;

        // Restore piece positions
        this.board[fr][fc] = originalPiece;
        this.board[tr][tc] = targetPiece;

        // Undo en passant capture
        if (isEnPassantCapture && enPassantCaptureRow != null) {
            const pawn = white ? 'p' : 'P';

            const capRow = enPassantCaptureRow;
            this.board[capRow][tc] = pawn;
            this.board[white ? capRow - 1 : capRow + 1][tc] = '.';

            this.zobristXorPiece(targetPiece, capRow, tc);

            if (this.renderer) this.renderer.UpdateSquare(capRow, tc);
        }

        // Undo castling
        if (castle === 1) { // King-side
            this.zobristXorPiece(this.board[tr][5], tr, 5);

            this.board[tr][7] = this.board[tr][5];
            this.board[tr][5] = '.';

            this.zobristXorPiece(this.board[tr][7], tr, 7);

            if (this.renderer) {
                this.renderer.UpdateSquare(tr, 7);
                this.renderer.UpdateSquare(tr, 5);
            }
        } else if (castle === 2) { // Queen-side
            this.zobristXorPiece(this.board[tr][3], tr, 3);

            this.board[tr][0] = this.board[tr][3];
            this.board[tr][3] = '.';

            this.zobristXorPiece(this.board[tr][0], tr, 0);

            if (this.renderer) {
                this.renderer.UpdateSquare(tr, 0);
                this.renderer.UpdateSquare(tr, 3);
            }
        }

        this.zobristXorCastleRights();

        // Restore castling rights
        this.castlingRights.whiteKingSide = castlingRights.whiteKingSide;
        this.castlingRights.whiteQueenSide = castlingRights.whiteQueenSide;
        this.castlingRights.blackKingSide = castlingRights.blackKingSide;
        this.castlingRights.blackQueenSide = castlingRights.blackQueenSide;

        this.zobristXorEP();

        // Restore en passant square
        this.enPassantSquare = enPassantSquare ? { r: enPassantSquare.r, c: enPassantSquare.c } : null;

        if (!this.isEmpty(targetPiece)) {
            this.zobristXorPiece(targetPiece, tr, tc);
        }

        this.zobristXorPiece(movingPiece, tr, tc);
        this.zobristXorPiece(originalPiece, fr, fc);

        // Restore halfmove clock
        this.halfmoveClock = halfmoveClock;

        // Restore king check flags
        this.whiteKingChecked = whiteKingChecked;
        this.blackKingChecked = blackKingChecked;

        // Restore captures arrays lengths
        this.whiteCaptures.length = whiteCapturesLength;
        this.blackCaptures.length = blackCapturesLength;

        // Restore game condition and turn
        const prevGameCondition = this.gameCondition;
        this.gameCondition = gameCondition;
<<<<<<< Updated upstream
        this.SwitchTurn(prevGameCondition !== 'PLAYING');

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

            this.renderer.whiteKingChecked = this.isKingInCheck(true);
            this.renderer.blackKingChecked = this.isKingInCheck(false);

            console.log(this.zobrist.hash);
=======
        this.turn = turn;

        this.totalPlies--;

        // UI updates
        if (this.renderer) {
>>>>>>> Stashed changes
            this.renderer.UpdateSquare(fr, fc);
            this.renderer.UpdateSquare(tr, tc);
            this.renderer.RemoveFromLog();
<<<<<<< Updated upstream

            if (promotePiece) this.renderer.PlaySound(3);
            else if (this.renderer.whiteKingChecked || this.renderer.blackKingChecked) this.renderer.PlaySound(2);
            else if (isCapture) this.renderer.PlaySound(1);
            else if (castle !== 0) this.renderer.PlaySound(4);
            else this.renderer.PlaySound(0);
=======
            this.renderer.UpdateGame();
>>>>>>> Stashed changes
        }

        return true;
    }

    isLegalMove(fr, fc, tr, tc) {
        if (!this.inside(tr, tc)) return false;

        const piece = this.board[fr][fc];
            if (this.isEmpty(piece)) return false;

        const white = this.isWhite(piece);
        const target = this.board[tr][tc];

        // Cannot capture your own piece
        if (!this.isEmpty(target) && (white === this.isWhite(target))) return false;

        const dr = tr - fr;
        const dc = tc - fc;

        const absR = Math.abs(dr);
        const absC = Math.abs(dc);

        switch (piece.toLowerCase()) {
            // Pawn
            case 'p': {
                const direction = white ? -1 : 1;
                const startRow = white ? 6 : 1;

                // Single push forward
                if (dc === 0 && dr === direction && this.isEmpty(target) && this.moveKeepsKingSafe(fr, fc, tr, tc)) {
                    return true;
                }

<<<<<<< Updated upstream
                // Forward pushes
                const dir = isWhite ? -1 : 1;
                const forward = fr + dir;
                if (forward >= 0 && forward < this.rows) {
                    if (this.isEmpty(this.getPiece(forward, fc))) {
                        moves.push([forward, fc, null]);

                        // Double push from starting rank
                        if (this.isNormal) {
                            const startRow = isWhite ? 6 : 1;
                            if (fr === startRow && this.isEmpty(this.getPiece(forward + (isWhite ? -1 : 1), fc))) {
                                moves.push([forward + (isWhite ? -1 : 1), fc, null]);
                            }
                        }
                    }
                }

                // Promotion
                const promoteRank = isWhite ? 0 : this.rows - 1;
                for (let i = 0; i < moves.length; i++) {
                    if (moves[i][0] == promoteRank && moves[i][2] == null) {
                        for (const promote of this.promoPieces) {
                            moves.push([ moves[i][0], moves[i][1], promote ]);
                        }

                        moves.splice(i, 1);
                        i--;
                    }
                }

                // En-passant captures
                if (this.isNormal) {
                    const epTarget = this.enPassantSquare;
                    if (epTarget !== null && epTarget !== -1) {
                        const { r: epr, c: epc } = this.fromSq(epTarget);

                        if (Math.abs(epc - fc) === 1 && epr === fr + dir) moves.push([epr, epc, null]);
                    }
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
=======
                // Double push from starting row
                if (dc === 0 && fr === startRow && dr === 2 * direction) {
                    const midRow = fr + direction;
                    if (this.isEmpty(this.board[midRow][fc]) && this.isEmpty(this.board[tr][tc]) && this.moveKeepsKingSafe(fr, fc, tr, tc)) {
                        return true;
                    }
                }

                if (Math.abs(dc) === 1 && dr === direction) {
                    // Diagonal capture
                    if ((white && this.isBlack(target)) || (!white && this.isWhite(target))) {
                        if (this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;
                    }

                    // En-passant capture
                    if (this.enPassantSquare && this.enPassantSquare.r === tr && this.enPassantSquare.c === tc && this.isEmpty(this.board[tr][tc])) {
                        return true;
                    }
                }

                return false;
            }
>>>>>>> Stashed changes
            // Rook
            case 'r':
                if (dr !== 0 && dc !== 0) return false;
                return this.isPathClear(fr, fc, tr, tc) && this.moveKeepsKingSafe(fr, fc, tr, tc);
            // Bishop
            case 'b':
                if (absR !== absC) return false;
                return this.isPathClear(fr, fc, tr, tc) && this.moveKeepsKingSafe(fr, fc, tr, tc);
            // Queen
            case 'q':
                if (dr === 0 || dc === 0) return this.isPathClear(fr, fc, tr, tc) && this.moveKeepsKingSafe(fr, fc, tr, tc);

                if (absR === absC) return this.isPathClear(fr, fc, tr, tc) && this.moveKeepsKingSafe(fr, fc, tr, tc);

                return false;
            // Knight
            case 'n':
                return (
                    (absR === 2 && absC === 1) ||
                    (absR === 1 && absC === 2)
                ) && this.moveKeepsKingSafe(fr, fc, tr, tc);
            // King
            case 'k':
                if (absR <= 1 && absC <= 1 && this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;

                const startRow = white ? 7 : 0;
                const kingSide = white ? this.castlingRights.whiteKingSide : this.castlingRights.blackKingSide;
                const queenSide = white ? this.castlingRights.whiteQueenSide : this.castlingRights.blackQueenSide;

                // Castling
<<<<<<< Updated upstream
                if (this.isNormal) {
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
                }
                break;
=======
                if (fr === startRow && fc === 4) {
                    // King-side
                    if (tr === startRow && tc === 6 &&
                        kingSide &&
                        this.isEmpty(this.board[startRow][5]) &&
                        this.isEmpty(this.board[startRow][6]) &&
                        !this.isSquareAttacked(startRow, 4, white) &&
                        !this.isSquareAttacked(startRow, 5, white) &&
                        !this.isSquareAttacked(startRow, 6, white)
                    ) return true;

                    // Queen-side
                    if (tr === startRow && tc === 2 &&
                        queenSide &&
                        this.isEmpty(this.board[startRow][1]) &&
                        this.isEmpty(this.board[startRow][2]) &&
                        this.isEmpty(this.board[startRow][3]) &&
                        !this.isSquareAttacked(startRow, 4, white) &&
                        !this.isSquareAttacked(startRow, 3, white) &&
                        !this.isSquareAttacked(startRow, 2, white)
                    ) return true;
                }
                return false;
        }

        return false;
    }

    getLegalMoves(fr, fc) {
        const piece = this.board[fr][fc];
        if (this.isEmpty(piece)) return [];

        const moves = [];
        const isPawn = piece.toLowerCase() === 'p';
        const isWhite = this.isWhite(piece);

        // last rank based on side
        const promoteRank = isWhite ? 0 : this.rows - 1;

        for (let tr = 0; tr < this.rows; tr++) {
            for (let tc = 0; tc < this.cols; tc++) {
                if (isWhite == this.isWhite(this.board[tr][tc]) && !this.isEmpty(this.board[tr][tc])) continue;
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
>>>>>>> Stashed changes
        }

        return moves;
    }

    getPlayerLegalMoves(white) {
        const moves = [];

        for (let fr = 0; fr < this.rows; fr++) {
            for (let fc = 0; fc < this.cols; fc++) {
                if ((white && this.isWhite(this.board[fr][fc])) || (!white && this.isBlack(this.board[fr][fc]))) {
                    const legalTargets = this.getLegalMoves(fr, fc);

                    for (const [tr, tc, promote] of legalTargets) {
                        moves.push({
                            fr,
                            fc,
                            tr,
                            tc,
                            promote: promote
                        });
                    }
                }
            }
        }

        return moves;
    }

    hasLegalMoves(white) {
        for (let fr = 0; fr < this.rows; fr++) {
            for (let fc = 0; fc < this.cols; fc++) {
                const piece = this.board[fr][fc];
                if (piece === '.' || this.isWhite(piece) !== white) continue;

                // Try every square
                for (let tr = 0; tr < this.rows; tr++) {
                    for (let tc = 0; tc < this.cols; tc++) {

                        if (!this.isLegalMove(fr, fc, tr, tc)) continue;

                        // Simulate move
                        const backupFrom = this.board[fr][fc];
                        const backupTo   = this.board[tr][tc];

                        this.board[tr][tc] = backupFrom;
                        this.board[fr][fc] = '.';

                        const kingInCheck = this.isKingInCheck(white);

                        // Undo move
                        this.board[fr][fc] = backupFrom;
                        this.board[tr][tc] = backupTo;

                        if (!kingInCheck) return true;
                    }
                }
            }
        }
        return false;
    }

    isSquareAttacked(fr, fc, white = this.isWhite(this.board[fr][fc])) {
        // Check all enemy moves
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.board[r][c];
                if (p === '.' || this.isWhite(p) === white) continue;

                if (this.isLegalMove(r, c, fr, fc)) {
                    return true;
                }
            }
        }

        return false;
    }

    isKingInCheck(white) {
        const kingChar = white ? 'K' : 'k';
        const kings = this.getPieces(kingChar);
        const { r: kr, c: kc } = kings[0] ? kings[0] : { r: -1, c: -1 };

        if (kr === -1) return true; // king missing = checkmate by definition

        return this.isSquareAttacked(kr, kc)
    }

<<<<<<< Updated upstream
    moveKeepsKingSafe(fr, fc, tr, tc, oppKing = false) {
        const movingPiece = this.getPiece(fr, fc);
        if (this.isEmpty(movingPiece)) return false;
=======
    moveKeepsKingSafe(fr, fc, tr, tc) {
        const board = this.board;
>>>>>>> Stashed changes

        // Save original state
        const moving = board[fr][fc];
        const captured = board[tr][tc];

        // Simulate move
        board[tr][tc] = moving;
        board[fr][fc] = '.';

        // Does king survive?
        const safe = !this.isKingInCheck(this.isWhite(moving));

<<<<<<< Updated upstream
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
        const safe = !this.isKingInCheck(isWhite !== oppKing);

        // ---- UNDO MOVE (REVERT EXACTLY) ---- //
        pieceBB.clearBit(toSq);
        pieceBB.setBit(fromSq);
        if (capturedBB) capturedBB.setBit(toSq);

        this.occupiedWhite = occW;
        this.occupiedBlack = occB;
        this.occupied      = occW.or(occB);
=======
        // Undo move
        board[fr][fc] = moving;
        board[tr][tc] = captured;
>>>>>>> Stashed changes

        return safe;
    }

    insufficientMaterial() {
        let pieces = [];
        let bishops = [];

        for (let r = 0; r < this.board.length; r++) {
            for (let c = 0; c < this.board[r].length; c++) {
                const p = this.board[r][c];
                if (p === '.') continue;

                pieces.push(p);

                // Track bishop square color
                if (p.toLowerCase() === 'b') {
                    const isDark = (r + c) % 2 === 0;
                    bishops.push(isDark);
                }
            }
        }

        // Strip kings so we only count minor pieces
        const minors = pieces.filter(p => p.toLowerCase() !== 'k');

        // 1) Kings only
        if (minors.length === 0) return true;

        // 2) Single minor piece (K+B vs K or K+N vs K)
        if (minors.length === 1) {
            const p = minors[0].toLowerCase();
            if (p === 'b' || p === 'n') return true;
            return false;
        }

        // 3) Two bishops and BOTH are on same color squares (K+BB vs K)
        if (minors.length === 2 && minors.every(p => p.toLowerCase() === 'b')) {
            const allDark = bishops.every(v => v === true);
            const allLight = bishops.every(v => v === false);
            if (allDark || allLight) return true;
        }

        // Anything else can mate
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

        if (this.insufficientMaterial()) {
            return 'DRAW_DEAD_POSITION';
        }

        if (this.halfmoveClock >= 100) {
            return 'DRAW_50-MOVE_RULE';
        }

        const historyKey = this.getPositionKey();
        if (this.positionHistory.filter(k => k === historyKey).length >= 3) {
            return 'DRAW_THREEFOLD_REPETITION';
        }

        return null;
    }

<<<<<<< Updated upstream
    insufficientMaterial(isWhite) {
        const P = !isWhite ? this.pieces.P : this.pieces.p;
        const N = !isWhite ? this.pieces.N : this.pieces.n;
        const B = !isWhite ? this.pieces.B : this.pieces.b;
        const R = !isWhite ? this.pieces.R : this.pieces.r;
        const Q = !isWhite ? this.pieces.Q : this.pieces.q;

        // Any pawn/rook/queen = always mating potential
        if (!P.isZero() || !R.isZero() || !Q.isZero()) return false;

        const knights = N.popcount();
        const bishops = B.popcount();

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


    SwitchTurn(callPlay = false) {
        if (!callPlay) this.turn = 1 - this.turn;

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


=======
>>>>>>> Stashed changes
    getMoveNotation(fullMove) {
        if (!fullMove) return;

        const {
            fr, fc, tr, tc,
            originalPiece,
            movingPiece,
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
            let pieceLetter = movingPiece.toLowerCase() === 'p' ? '' : movingPiece.toUpperCase();

            // Capture?
            const isCapture = !this.isEmpty(targetPiece);

            // Origin + dest square names
            const fromSq = this.squareName(fr, fc);
            const toSq = this.squareName(tr, tc);

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

            // En-Passant
            if (isEnPassantCapture) {
                notation += ' e.p.';
            }

            // Check / mate
            const whiteToMove = this.gameCondition === 'PLAYING' ? !(this.turn === 0) : this.turn === 0;
            const opponentIsWhite = !whiteToMove;

            const oppInCheck = opponentIsWhite ? this.renderer.whiteKingChecked : this.renderer.blackKingChecked;
            const oppLegalMoves = this.hasLegalMoves(opponentIsWhite);

            if (oppInCheck && !oppLegalMoves) notation += '#';
            else if (oppInCheck && oppLegalMoves) notation += '+';
        }

<<<<<<< Updated upstream
=======
        // Check / mate
        const whiteToMove = this.turn === 0;
        const opponentIsWhite = !whiteToMove;

        const oppInCheck = this.isKingInCheck(opponentIsWhite);
        const oppLegalMoves = this.hasLegalMoves(opponentIsWhite);

        if (!notation.startsWith('O-O') && oppInCheck && !oppLegalMoves) notation += '#';
        else if (!notation.startsWith('O-O') && oppInCheck && oppLegalMoves) notation += '+';

>>>>>>> Stashed changes
        return notation;
    }

    SwitchTurn() {
        this.turn = 1 - this.turn;

        if (this.turn == 0 && this.whiteAI) this.whiteAI?.Play();
        if (this.turn == 1 && this.blackAI) this.blackAI?.Play();
    }

    getPositionKey() {
        const board = this.board;
        const out = [];

        for (let r = 0; r < 8; r++) {
            const row = board[r];
            // push raw chars
            for (let c = 0; c < 8; c++) out.push(row[c]);
            out.push('|');
        }

        // turn
        out.push(this.turn, ' ');

        // castling
        const cr = this.castlingRights;
        if (cr.whiteKingSide) out.push('K');
        if (cr.whiteQueenSide) out.push('Q');
        if (cr.blackKingSide) out.push('k');
        if (cr.blackQueenSide) out.push('q');
        out.push(' ');

        // en passant
        const ep = this.enPassantSquare;
        if (ep) {
            out.push(
                ep.r < 10 ? ep.r : String(ep.r), // avoid template literal
                ',',
                ep.c < 10 ? ep.c : String(ep.c)
            );
        } else {
            out.push('-');
        }

        return out.join('');
    }

    inside(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    isWhite(p) {
        return p ? p !== '.' && p === p.toUpperCase() : null;
    }

    isBlack(p) {
        return p ? p !== '.' && p === p.toLowerCase() : null;
    }

    isEmpty(p) {
        return p ? p == '.' : null;
    }

    isPathClear(fr, fc, tr, tc) {
        const stepR = Math.sign(tr - fr);
        const stepC = Math.sign(tc - fc);

        let r = fr + stepR;
        let c = fc + stepC;

        while (r !== tr || c !== tc) {
            if (this.board[r][c] !== '.') return false;
            r += stepR;
            c += stepC;
        }

        return true;
    }

    getPieces(piece) {
        const pieces = []

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === piece) {
                    pieces.push({ r, c })
                }
            }
        }

        return pieces;
    }

    squareName(r, c) {
        const file = String.fromCharCode('a'.charCodeAt(0) + c);
        const rank = (this.rows - r).toString();
        return file + rank;
    }

    clone() {
        const clone = new ChessEngine(
            this.board.map(row => [...row])
        );

<<<<<<< Updated upstream
        clone.castlingRights = {
            whiteKingSide: this.castlingRights.whiteKingSide,
            whiteQueenSide: this.castlingRights.whiteQueenSide,
            blackKingSide: this.castlingRights.blackKingSide,
            blackQueenSide: this.castlingRights.blackQueenSide
        };
        clone.enPassantSquare = this.enPassantSquare;

        clone.zobrist = this.zobrist.clone();
        clone.repetitionCount = new Map(this.repetitionCount);

        clone.halfmoveClock = this.halfmoveClock;

=======
>>>>>>> Stashed changes
        clone.turn = this.turn;

        clone.whiteKingChecked = this.whiteKingChecked;
        clone.whitePoints = this.whitePoints;

        clone.blackKingChecked = this.blackKingChecked;
        clone.blackPoints = this.blackPoints;

        clone.castlingRights = {
            whiteKingSide: this.castlingRights.whiteKingSide,
            whiteQueenSide: this.castlingRights.whiteQueenSide,
            blackKingSide: this.castlingRights.blackKingSide,
            blackQueenSide: this.castlingRights.blackQueenSide
        };
        clone.enPassantSquare = this.enPassantSquare ? { r: this.enPassantSquare.r, c: this.enPassantSquare.c } : null;

        clone.halfmoveClock = this.halfmoveClock;
        clone.positionHistory = [...this.positionHistory];

        clone.gameCondition = this.gameCondition;
        clone.totalPlies = this.totalPlies;

        return clone;
    }

    initZobrist() {
        const pieces = ['P','N','B','R','Q','K','p','n','b','r','q','k'];
        this.zobrist.piece = {};

        for (const p of pieces) {
            this.zobrist.piece[p] = [];
            for (let i = 0; i < 64; i++) {
                this.zobrist.piece[p][i] = Math.floor(Math.random() * 2**32);
            }
        }

        // Castling rights (4 booleans)
        this.zobrist.castle.whiteKingSide  = Math.floor(Math.random() * 2**32);
        this.zobrist.castle.whiteQueenSide = Math.floor(Math.random() * 2**32);
        this.zobrist.castle.blackKingSide  = Math.floor(Math.random() * 2**32);
        this.zobrist.castle.blackQueenSide = Math.floor(Math.random() * 2**32);

        // En passant for each file
        for (let f = 0; f < 8; f++) {
            this.zobrist.ep[f] = Math.floor(Math.random() * 2**32);
        }
    }

    zobristXorPiece(piece, r, c) {
        if (this.isEmpty(piece)) return;

        const sq = r * 8 + c;
        this.hash ^= this.zobrist.piece[piece][sq];
    }

    zobristXorCastleRights() {
        const cr = this.castlingRights;

        if (cr.whiteKingSide)  this.hash ^= this.zobrist.castle.whiteKingSide;
        if (cr.whiteQueenSide) this.hash ^= this.zobrist.castle.whiteQueenSide;
        if (cr.blackKingSide)  this.hash ^= this.zobrist.castle.blackKingSide;
        if (cr.blackQueenSide) this.hash ^= this.zobrist.castle.blackQueenSide;
    }

    zobristXorEP() {
        if (this.enPassantSquare) {
            this.hash ^= this.zobrist.ep[this.enPassantSquare.c];
        }
    }
}