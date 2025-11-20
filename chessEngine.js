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

export class ChessEngine {
    constructor(board = [
        ['r', 'n', 'k', 'b', 'q'],
        ['p', 'p', 'p', 'p', 'p'],
        ['.', '.', '.', '.', '.'],
        ['P', 'P', 'P', 'P','P'],
        ['R', 'N', 'K', 'B', 'Q']
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
        }

        this.halfmoveClock = 0;
        this.positionHistory = [];

        this.gameCondition = 'PLAYING';
        this.log = [];
        this.lastMove = null;

        this.renderer = null;
    }

    MovePiece(fr, fc, tr, tc, promotePiece = null) {
        if (!this.isLegalMove(fr, fc, tr, tc) || this.gameCondition !== 'PLAYING') return;

        const originalPiece = this.board[fr][fc];
        let movingPiece = originalPiece;
            if (promotePiece) movingPiece = this.turn == 0 ? promotePiece.toUpperCase() : promotePiece.toLowerCase();
        const targetPiece = this.board[tr][tc];

        if (movingPiece.toLowerCase() === 'p' && !promotePiece) {
            const isWhite = this.isWhite(movingPiece);

            if ((isWhite && tr === 0) || (!isWhite && tr === this.rows - 1)) {
                this.renderer?.Promote(fr, fc, tr, tc);
                return;
            }
        }

        this.board[tr][tc] = movingPiece;
        this.board[fr][fc] = '.';

        const isCapture = !this.isEmpty(targetPiece) && this.isWhite(movingPiece) !== this.isWhite(targetPiece);

        if (isCapture) {
            if (this.isWhite(movingPiece)) {
                this.whiteCaptures.push(targetPiece);
            } else {
                this.blackCaptures.push(targetPiece);
            }
        }

        if (movingPiece.toLowerCase() == 'p' || isCapture) {
            this.halfmoveClock = 0;
        } else {
            this.halfmoveClock++;
        }

        this.positionHistory.push(this.getPosition());

        this.whitePoints = 0;
        this.blackPoints = 0;
        for (const [key, value] of Object.entries(this.piecePoints)) {
            this.whitePoints += this.getPieces(key.toLocaleUpperCase()).length * value;
            this.blackPoints += this.getPieces(key.toLocaleLowerCase()).length * value;
        }

        this.logMove(fr, fc, tr, tc, originalPiece, targetPiece, promotePiece);

        this.whiteKingChecked = this.isKingInCheck(true);
        this.blackKingChecked = this.isKingInCheck(false);

        this.lastMove = { fr, fc, tr, tc };

        const result = this.evaluateEndConditions();
        if (result) {
            this.gameCondition = result;
            console.log('GAME OVER:', this.gameCondition);
        }

        this.SwitchTurn();

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
            case 'p':
                if (white) {
                    // Move forward into empty square
                    if (dr === -1 && dc === 0 && this.isEmpty(target) && this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;

                    // Capture diagonally
                    if (dr === -1 && absC === 1 && this.isBlack(target) && this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;
                } else {
                    if (dr === 1 && dc === 0 && this.isEmpty(target) && this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;

                    if (dr === 1 && absC === 1 && this.isWhite(target) && this.moveKeepsKingSafe(fr, fc, tr, tc)) return true;
                }
                return false;

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
                return absR <= 1 && absC <= 1 && this.moveKeepsKingSafe(fr, fc, tr, tc);
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

                // -------- PROMOTION HANDLING ----------
                if (isPawn && tr === promoteRank) {
                    // add 4 promotion options
                    const promoPieces = isWhite
                        ? ['Q', 'R', 'B', 'N']
                        : ['q', 'r', 'b', 'n'];

                    for (const promote of promoPieces) {
                        moves.push([ tr, tc, promote ]);
                    }

                    continue; // skip adding a normal move
                }

                // ---------- NORMAL MOVE ----------
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
                            promote: promote // or call your promotion logic later
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

    isKingInCheck(white) {
        const kingChar = white ? 'K' : 'k';
        const kings = this.getPieces(kingChar);
        const { r: kr, c: kc } = kings[0] ? kings[0] : { r: -1, c: -1 };

        if (kr === -1) return true; // king missing → checkmate by definition

        // Check all enemy moves: does any attack the king?
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.board[r][c];
                if (p === '.' || this.isWhite(p) === white) continue;

                if (this.isLegalMove(r, c, kr, kc)) {
                    return true;
                }
            }
        }

        return false;
    }

    moveKeepsKingSafe(fr, fc, tr, tc) {
        const board = this.board;

        // Save original state
        const moving = board[fr][fc];
        const captured = board[tr][tc];

        // Apply the move
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

    logMove(fr, fc, tr, tc, movingPiece, targetPiece, promotePiece = null) {
        let notation = '';
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

        // Check / mate
        const whiteToMove = this.turn === 0; // before SwitchTurn
        const opponentIsWhite = !whiteToMove;

        const oppInCheck = this.isKingInCheck(opponentIsWhite);
        const oppLegalMoves = this.hasLegalMoves(opponentIsWhite);

        if (oppInCheck && !oppLegalMoves) notation += '#';
        else if (oppInCheck && oppLegalMoves) notation += '+';

        // Push to this.log
        this.log.push(notation);
    }

    SwitchTurn() {
        this.turn = 1 - this.turn;

        if (this.turn == 0 && this.whiteAI) this.whiteAI?.Play();
        if (this.turn == 1 && this.blackAI) this.blackAI?.Play();
    }

    getPosition() {
        return JSON.stringify({
            board: this.board,
            turn: this.turn
        });
    }

    // check if (r,c) is inside board
    inside(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    // check if piece is white
    isWhite(p) {
        return p ? p !== '.' && p === p.toUpperCase() : null;
    }

    // check if piece is black
    isBlack(p) {
        return p ? p !== '.' && p === p.toLowerCase() : null;
    }

    // check if piece is empty
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
            this.board.map(row => [...row]) // deep copy of board
        );

        clone.turn = this.turn;

        clone.whiteKingChecked = this.whiteKingChecked;
        clone.whiteCaptures = [...this.whiteCaptures];
        clone.whitePoints = this.whitePoints;

        clone.blackKingChecked = this.blackKingChecked;
        clone.blackCaptures = [...this.blackCaptures];
        clone.blackPoints = this.blackPoints;

        clone.halfmoveClock = this.halfmoveClock;
        clone.positionHistory = [...this.positionHistory];

        clone.gameCondition = this.gameCondition;
        clone.log = [...this.log];  // new array, not shared

        clone.renderer = null;       // no UI
        clone.whiteAI = null;        // prevent AI triggers
        clone.blackAI = null;

        return clone;
    }

    minimalClone() {
        const clone = new ChessEngine(
            this.board.map(row => [...row]) // deep copy of board
        );

        clone.turn = this.turn;

        clone.whiteKingChecked = this.whiteKingChecked;
        clone.whitePoints = this.whitePoints;

        clone.blackKingChecked = this.blackKingChecked;
        clone.blackPoints = this.blackPoints;

        clone.halfmoveClock = this.halfmoveClock;
        clone.positionHistory = [...this.positionHistory];

        clone.gameCondition = this.gameCondition;

        return clone;
    }
}