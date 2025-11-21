// [
//         ['r', 'n', 'k', 'b', 'q'],
//         ['p', 'p', 'p', 'p', 'p'],
//         ['.', '.', '.', '.', '.'],
//         ['P', 'P', 'P', 'P','P'],
//         ['R', 'N', 'K', 'B', 'Q']
//     ]

// [
//         ['.', '.', 'k', '.', '.'],
//         ['.', '.', '.', '.', '.'],
//         ['.', '.', '.', '.', '.'],
//         ['P', 'P', 'P', 'P','P'],
//         ['R', 'N', 'K', 'B', 'Q']
//     ]

// [
//         ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
//         ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
//         ['.', '.', '.', '.', '.', '.', '.', '.'],
//         ['.', '.', '.', '.', '.', '.', '.', '.'],
//         ['.', '.', '.', '.', '.', '.', '.', '.'],
//         ['.', '.', '.', '.', '.', '.', '.', '.'],
//         ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
//         ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
//     ]

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
        this.board = board;
        this.rows = board.length;
        this.cols = board[0].length;

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

        this.castlingRights = {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        };
        this.enPassantSquare = null;

        this.halfmoveClock = 0;
        this.positionHistory = [];

        this.gameCondition = 'PLAYING';
        this.log = [];
        this.lastMove = null;
        this.totalPlies = 0;

        this.renderer = null;
    }

    MovePiece(fr, fc, tr, tc, promotePiece = null) {
        if (!this.isLegalMove(fr, fc, tr, tc) || this.gameCondition !== 'PLAYING') return;

        // Get pieces
        const originalPiece = this.board[fr][fc];
        let movingPiece = originalPiece;
            if (promotePiece) movingPiece = this.turn == 0 ? promotePiece.toUpperCase() : promotePiece.toLowerCase();
        let targetPiece = this.board[tr][tc];

        // Promote
        if (movingPiece.toLowerCase() === 'p' && !promotePiece) {
            const isWhite = this.isWhite(movingPiece);

            if ((isWhite && tr === 0) || (!isWhite && tr === this.rows - 1)) {
                this.renderer?.Promote(fr, fc, tr, tc);
                return;
            }
        }

        // Castling
        let castle = 0;
        if (movingPiece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
            if (tc === 6) { // King-side
                this.board[tr][5] = this.board[tr][7];
                this.board[tr][7] = '.';

                this.renderer?.UpdateSquare(tr, 5);
                this.renderer?.UpdateSquare(tr, 7);

                castle = 1;
            } else if (tc === 2) { // Queen-side
                this.board[tr][3] = this.board[tr][0];
                this.board[tr][0] = '.';

                this.renderer?.UpdateSquare(tr, 3);
                this.renderer?.UpdateSquare(tr, 0);

                castle = 2;
            }
        }

        // En-passant capture
        let isEnPassantCapture = false;
        if (movingPiece.toLowerCase() === 'p' && this.enPassantSquare && tr === this.enPassantSquare.r && this.enPassantSquare.c && this.isEmpty(targetPiece)) {
            const capRow = this.isWhite(movingPiece) ? tr + 1 : tr - 1;
            targetPiece = this.board[capRow][tc];
            this.board[capRow][tc] = '.';

            this.renderer?.UpdateSquare(capRow, tc);

            isEnPassantCapture = true;
        }

        // Move piece
        this.board[tr][tc] = movingPiece;
        this.board[fr][fc] = '.';

        // Capture
        const isCapture = !this.isEmpty(targetPiece) && this.isWhite(movingPiece) !== this.isWhite(targetPiece);
        if (isCapture || isEnPassantCapture) {
            if (this.isWhite(movingPiece)) {
                this.whiteCaptures.push(targetPiece);
            } else {
                this.blackCaptures.push(targetPiece);
            }
        }

        // Draw rules
        if (movingPiece.toLowerCase() == 'p' || isCapture || isEnPassantCapture) this.halfmoveClock = 0;
        else this.halfmoveClock++;

        this.positionHistory.push(this.getPosition());

        // Piece points
        this.whitePoints = 0;
        this.blackPoints = 0;
        for (const [key, value] of Object.entries(this.piecePoints)) {
            this.whitePoints += this.getPieces(key.toLocaleUpperCase()).length * value;
            this.blackPoints += this.getPieces(key.toLocaleLowerCase()).length * value;
        }

        // King check
        this.whiteKingChecked = this.isKingInCheck(true);
        this.blackKingChecked = this.isKingInCheck(false);

        // Castle rights
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

        // En-passant rights
        this.enPassantSquare = null;
        if (movingPiece.toLowerCase() === 'p' && Math.abs(fr - tr) === 2) {
            const epRow = (fr + tr) / 2;
            this.enPassantSquare = { r: epRow, c: fc };
        }

        // Save move
        this.logMove(fr, fc, tr, tc, originalPiece, targetPiece, promotePiece, castle, isEnPassantCapture);
        this.lastMove = { fr, fc, tr, tc };
        this.totalPlies++;

        // Game condition
        const result = this.evaluateEndConditions();
        if (result) this.gameCondition = result;

        // Switch turn
        this.SwitchTurn();

        // UI
        this.renderer?.UpdateSquare(fr, fc);
        this.renderer?.UpdateSquare(tr, tc);
        this.renderer?.UpdateGame();

        if (promotePiece) return this.renderer?.PlaySound(3);
        else if (this.whiteKingChecked || this.blackKingChecked) return this.renderer?.PlaySound(2);
        else if (isCapture) return this.renderer?.PlaySound(1);
        else return this.renderer?.PlaySound(0);
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

                // Castling
                if (white) {
                    if (fr === 7 && fc === 4) {
                        // King-side
                        if (tr === 7 && tc === 6 &&
                            this.castlingRights.whiteKingSide &&
                            this.isEmpty(this.board[7][5]) &&
                            this.isEmpty(this.board[7][6]) &&
                            !this.isSquareAttacked(7, 4, true) &&
                            !this.isSquareAttacked(7, 5, true) &&
                            !this.isSquareAttacked(7, 6, true)
                        ) return true;

                        // Queen-side
                        if (tr === 7 && tc === 2 &&
                            this.castlingRights.whiteQueenSide &&
                            this.isEmpty(this.board[7][1]) &&
                            this.isEmpty(this.board[7][2]) &&
                            this.isEmpty(this.board[7][3]) &&
                            !this.isSquareAttacked(7, 4, true) &&
                            !this.isSquareAttacked(7, 3, true) &&
                            !this.isSquareAttacked(7, 2, true)
                        ) return true;
                    }
                } else {
                    if (fr === 0 && fc === 4) {
                        // King-side
                        if (tr === 0 && tc === 6 &&
                            this.castlingRights.blackKingSide &&
                            this.isEmpty(this.board[0][5]) &&
                            this.isEmpty(this.board[0][6]) &&
                            !this.isSquareAttacked(0, 4, false) &&
                            !this.isSquareAttacked(0, 5, false) &&
                            !this.isSquareAttacked(0, 6, false)
                        ) return true;

                        // Queen-side
                        if (tr === 0 && tc === 2 &&
                            this.castlingRights.blackQueenSide &&
                            this.isEmpty(this.board[0][1]) &&
                            this.isEmpty(this.board[0][2]) &&
                            this.isEmpty(this.board[0][3]) &&
                            !this.isSquareAttacked(0, 4, false) &&
                            !this.isSquareAttacked(0, 3, false) &&
                            !this.isSquareAttacked(0, 2, false)
                        ) return true;
                    }
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

    moveKeepsKingSafe(fr, fc, tr, tc) {
        const board = this.board;

        // Save original state
        const moving = board[fr][fc];
        const captured = board[tr][tc];

        // Simulate move
        board[tr][tc] = moving;
        board[fr][fc] = '.';

        // Does king survive?
        const safe = !this.isKingInCheck(this.isWhite(moving));

        // Undo move
        board[fr][fc] = moving;
        board[tr][tc] = captured;

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

        const historyKey = this.getPosition();
        if (this.positionHistory.filter(k => k === historyKey).length >= 3) {
            return 'DRAW_THREEFOLD_REPETITION';
        }

        return null;
    }

    logMove(fr, fc, tr, tc, movingPiece, targetPiece, promotePiece = null, castle = 0, isEnPassantCapture = false) {
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

        // Add to log
        this.log.push(notation);
    }

    SwitchTurn() {
        this.turn = 1 - this.turn;

        if (this.turn == 0 && this.whiteAI) this.whiteAI?.Play();
        if (this.turn == 1 && this.blackAI) this.blackAI?.Play();
    }

    getPosition() {
        return JSON.stringify({
            board: this.board.map(row => [...row]),
            turn: this.turn,
            castlingRights: {...this.castlingRights},
            enPassantSquare: this.enPassantSquare
        });
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


    minimalClone() {
        const clone = new ChessEngine(
            this.board.map(row => [...row])
        );

        clone.turn = this.turn;

        clone.whiteKingChecked = this.whiteKingChecked;
        clone.whitePoints = this.whitePoints;

        clone.blackKingChecked = this.blackKingChecked;
        clone.blackPoints = this.blackPoints;

        clone.castlingRights = {...this.castlingRights};;
        clone.enPassantSquare = this.enPassantSquare;

        clone.halfmoveClock = this.halfmoveClock;
        clone.positionHistory = [...this.positionHistory];

        clone.gameCondition = this.gameCondition;
        clone.totalPlies = this.totalPlies;

        return clone;
    }
}