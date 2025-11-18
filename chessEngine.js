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
        this.whiteCaptures = [];
        this.whiteCapturesPoints = 0;
        this.blackCaptures = [];
        this.blackCapturesPoints = 0;

        this.piecePoints = {
            'p': 1,
            'b': 3,
            'n': 3,
            'r': 5,
            'q': 9,
        }

        this.renderer = null;
    }

    onSquareClick(e) {
        const r = +e.target.dataset.r;
        const c = +e.target.dataset.c;

        // If there is a piece selected and clicked square is in possibleMoves → move it
        if (this.selected && this.possibleMoves.some(([rr, cc]) => rr === r && cc === c)) {

            // Move the piece
            this.PieceToSquare(r, c, this.selected.piece);
            this.PieceToSquare(r, c, '.');


            // Clear selection and highlights
            this.selected = null;
            this.possibleMoves = [];
            this.highlightMoves(this.possibleMoves);

            // switch turn
            this.turn = 1 - this.turn;
            this.turnDisplay.texnewContent = this.turn == 0 ? 'White' : 'Black'

            return;
        }

        const piece = this.board[r][c];

        if (this.isEmpty(piece)) {
            this.selected = null;
            this.possibleMoves = [];
            this.highlightMoves(this.possibleMoves);
            e.target.blur();
            return;
        }

        const isWhiteTurn = this.turn === 0;
        const isWhitePiece = this.isWhite(piece);

        // If wrong color piece clicked → ignore
        if (isWhiteTurn !== isWhitePiece) {
            this.selected = null;
            this.possibleMoves = [];
            this.highlightMoves(this.possibleMoves);
            e.target.blur();
            return;
        }

        // Select piece
        this.selected = { r, c, piece };

        // Get possible moves for this piece
        this.possibleMoves = this.getLegalMoves(r, c, piece);

        this.highlightMoves(this.possibleMoves);
        console.log(this.possibleMoves);
    }

    highlightMoves(moves) {
        document.querySelectorAll('.highlight').forEach(sq => sq.classList.remove('highlight'));

        moves.forEach(([r, c]) => {
            const sq = document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
            if (sq) sq.classList.add('highlight');
        });
    }

    getLegalMoves(r, c, piece) {
        const moves = [];
        const white = this.isWhite(piece);

        const add = (rr, cc) => {
            if (!this.inside(rr, cc)) return;

            const target = this.board[rr][cc];

            if (target === '.') {
                moves.push([rr, cc]);
                return;
            }

            // Capture enemy
            if (white && this.isBlack(target)) moves.push([rr, cc]);
            if (!white && this.isWhite(target)) moves.push([rr, cc]);
        };

        const addSlide = (dr, dc) => {
            let rr = r + dr;
            let cc = c + dc;
            while (this.inside(rr, cc)) {
                const target = this.board[rr][cc];
                if (target === '.') {
                    moves.push([rr, cc]);
                } else {
                    if (white && this.isBlack(target)) moves.push([rr, cc]);
                    if (!white && this.isWhite(target)) moves.push([rr, cc]);
                    break;
                }
                rr += dr;
                cc += dc;
            }
        };

        switch (piece.toLowerCase()) {
            // Pawn
            case 'p':
                // direction: white moves up (r-1), black moves down (r+1)
                const dir = white ? -1 : 1;
                const forwardR = r + dir;

                // 1) Forward move — only if inside and empty
                if (this.inside(forwardR, c) && this.board[forwardR][c] === '.') {
                    moves.push([forwardR, c]);
                }

                // 2) Diagonal captures — only if inside and enemy piece present
                if (this.inside(forwardR, c - 1)) {
                    const target = this.board[forwardR][c - 1];
                    if (white && this.isBlack(target)) moves.push([forwardR, c - 1]);
                    if (!white && this.isWhite(target)) moves.push([forwardR, c - 1]);
                }
                if (this.inside(forwardR, c + 1)) {
                    const target = this.board[forwardR][c + 1];
                    if (white && this.isBlack(target)) moves.push([forwardR, c + 1]);
                    if (!white && this.isWhite(target)) moves.push([forwardR, c + 1]);
                }

                break;

            // Knight
            case 'n':
                [
                    [r - 2, c - 1], [r - 2, c + 1],
                    [r + 2, c - 1], [r + 2, c + 1],
                    [r - 1, c - 2], [r - 1, c + 2],
                    [r + 1, c - 2], [r + 1, c + 2]
                ].forEach(([rr, cc]) => add(rr, cc));
                break;

            // Bishop
            case 'b':
                addSlide(-1, -1);
                addSlide(-1, 1);
                addSlide(1, -1);
                addSlide(1, 1);
                break;

            // Rock
            case 'r':
                addSlide(-1, 0);
                addSlide(1, 0);
                addSlide(0, -1);
                addSlide(0, 1);
                break;

            // Queen
            case 'q':
                addSlide(-1, 0);
                addSlide(1, 0);
                addSlide(0, -1);
                addSlide(0, 1);
                addSlide(-1, -1);
                addSlide(-1, 1);
                addSlide(1, -1);
                addSlide(1, 1);
                break;

            // King
            case 'k':
                [
                    [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
                    [r - 1, c - 1], [r - 1, c + 1],
                    [r + 1, c - 1], [r + 1, c + 1]
                ].forEach(([rr, cc]) => add(rr, cc));
                break;
        }

        return moves;
    }





    MovePiece(fr, fc, tr, tc) {
        if (!this.isLegalMove(fr, fc, tr, tc)) return

        const movingPiece = this.board[fr][fc];
        const targetPiece = this.board[tr][tc];

        this.board[tr][tc] = movingPiece;
        this.board[fr][fc] = '.';

        if (!this.isEmpty(targetPiece) && this.isWhite(movingPiece) !== this.isWhite(targetPiece)) {
            if (this.isWhite(movingPiece)) {
                this.whiteCaptures.push(targetPiece);
                this.whiteCapturesPoints += this.piecePoints[targetPiece];
            } else {
                this.blackCaptures.push(targetPiece);
                this.blackCapturesPoints += this.piecePoints[targetPiece];
            }
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
                    if (dr === -1 && dc === 0 && this.isEmpty(target)) return true;

                    // Capture diagonally
                    if (dr === -1 && absC === 1 && this.isBlack(target)) return true;
                } else {
                    if (dr === 1 && dc === 0 && this.isEmpty(target)) return true;

                    if (dr === 1 && absC === 1 && this.isWhite(target)) return true;
                }
                return false;

            // Rook
            case 'r':
                if (dr !== 0 && dc !== 0) return false;
                return this.isPathClear(fr, fc, tr, tc);

            // Bishop
            case 'b':
                if (absR !== absC) return false;
                return this.isPathClear(fr, fc, tr, tc);

            // Queen
            case 'q':
                if (dr === 0 || dc === 0) return this.isPathClear(fr, fc, tr, tc);

                if (absR === absC) return this.isPathClear(fr, fc, tr, tc);

                return false;

            // Knight
            case 'n':
                return (
                    (absR === 2 && absC === 1) ||
                    (absR === 1 && absC === 2)
                );

            // King
            case 'k':
                return absR <= 1 && absC <= 1;
        }

        return false;
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
}