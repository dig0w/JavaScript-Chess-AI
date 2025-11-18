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

        this.boardEl = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');

        this.turn = 0;
        this.selected = null;
        this.possibleMoves = null;
    }

    BeginPlay() {
        this.boardEl = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');

        this.boardEl.style.gridTemplateRows = `repeat(${this.rows}, minmax(0, 1fr))`;
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, minmax(0, 1fr))`;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const sq = document.createElement('button');
                sq.classList.add('square');
                sq.dataset.r = r;
                sq.dataset.c = c;

                if ((r + c) % 2 === 0) {
                    sq.classList.add('dark');
                }

                const piece = this.board[r][c];
                if (piece !== '.') sq.textContent = piece;

                sq.onclick = (e) => this.onSquareClick(e);

                this.boardEl.appendChild(sq);
            }
        }

        this.turnDisplay.textContent = this.turn == 0 ? 'White' : 'Black'
    }

    onSquareClick(e) {
        const r = +e.target.dataset.r;
        const c = +e.target.dataset.c;

        // If there is a piece selected and clicked square is in possibleMoves → move it
        if (this.selected && this.possibleMoves.some(([rr, cc]) => rr === r && cc === c)) {

            // Move the piece
            this.MovePiece(r, c, this.selected.r, this.selected.c, this.selected.piece);

            // Clear selection and highlights
            this.selected = null;
            this.possibleMoves = [];
            this.highlightMoves(this.possibleMoves);

            // Switch turn
            this.turn = 1 - this.turn;
            this.turnDisplay.textContent = this.turn == 0 ? 'White' : 'Black'

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
                if (white) {
                    add(r - 1, c);                    // forward
                    if (this.isBlack(this.board[r - 1]?.[c])) add(r - 1, c);
                    if (this.inside(r - 1, c - 1) && this.isBlack(this.board[r - 1][c - 1])) moves.push([r - 1, c - 1]);
                    if (this.inside(r - 1, c + 1) && this.isBlack(this.board[r - 1][c + 1])) moves.push([r - 1, c + 1]);
                } else {
                    add(r + 1, c);
                    if (this.inside(r + 1, c - 1) && this.isWhite(this.board[r + 1][c - 1])) moves.push([r + 1, c - 1]);
                    if (this.inside(r + 1, c + 1) && this.isWhite(this.board[r + 1][c + 1])) moves.push([r + 1, c + 1]);
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

    MovePiece(newR, newC, oldR, oldC, piece) {
        // Move the piece
        this.board[newR][newC] = piece;
        this.board[oldR][oldC] = '.';

        const oldSquare = this.boardEl.querySelector(`.square[data-r="${oldR}"][data-c="${oldC}"]`);
        const newSquare = this.boardEl.querySelector(`.square[data-r="${newR}"][data-c="${newC}"]`);

        if (oldSquare) oldSquare.textContent = this.board[oldR][oldC] !== '.' ? this.board[oldR][oldC] : '';
        if (newSquare) newSquare.textContent = this.board[newR][newC] !== '.' ? this.board[newR][newC] : '';
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
}