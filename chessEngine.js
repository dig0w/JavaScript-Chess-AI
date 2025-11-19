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
        ['.', '.', '.', '.','.'],
        ['.', '.', 'K', '.', '.']
    ]) {
        this.board = board;
        this.rows = board.length;
        this.cols = board[0].length;

        this.turn = 0;

        this.whiteKingChecked = false;
        this.whiteCaptures = [];
        this.whiteCapturesPoints = 0;

        this.blackKingChecked = false;
        this.blackCaptures = [];
        this.blackCapturesPoints = 0;

        this.piecePoints = {
            'p': 1,
            'b': 3,
            'n': 3,
            'r': 5,
            'q': 9,
            'k': 0
        }

        this.gameCondition = 'PLAYING';

        this.renderer = null;
    }

    MovePiece(fr, fc, tr, tc) {
        if (!this.isLegalMove(fr, fc, tr, tc) || this.gameCondition !== 'PLAYING') return;

        const movingPiece = this.board[fr][fc];
        const targetPiece = this.board[tr][tc];

        this.board[tr][tc] = movingPiece;
        this.board[fr][fc] = '.';

        if (!this.isEmpty(targetPiece) && this.isWhite(movingPiece) !== this.isWhite(targetPiece)) {
            if (this.isWhite(movingPiece)) {
                this.whiteCaptures.push(targetPiece);
                this.whiteCapturesPoints += this.piecePoints[targetPiece.toLowerCase()];
            } else {
                this.blackCaptures.push(targetPiece);
                this.blackCapturesPoints += this.piecePoints[targetPiece.toLowerCase()];
            }
        }

        this.SwitchTurn();

        this.whiteKingChecked = this.isKingInCheck(true);
        this.blackKingChecked = this.isKingInCheck(false);

        const result = this.evaluateEndConditions();
        if (result) {
            this.gameCondition = result;
            console.log('GAME OVER:', this.gameCondition);
        }
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

        for (let tr = 0; tr < this.rows; tr++) {
            for (let tc = 0; tc < this.cols; tc++) {
                if (this.isLegalMove(fr, fc, tr, tc)) {
                    moves.push([tr, tc]);
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
    
    evaluateEndConditions() {
        const whiteTurn = this.turn === 0;

        const kingInCheck = this.isKingInCheck(whiteTurn);
        const hasMoves = this.hasLegalMoves(whiteTurn);

        if (!hasMoves) {
            if (kingInCheck) {
                return whiteTurn ? 'BLACK_WINS_CHECKMATE' : 'WHITE_WINS_CHECKMATE';
            } else {
                return 'DRAW_STALEMATE';
            }
        }

        return null;
    }

    SwitchTurn() {
        this.turn = 1 - this.turn;
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
}