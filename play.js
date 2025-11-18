import { isEmpty, isWhite, getLegalMoves } from './chess.js';

/*
    Upper case = white pieces
    Lower case = black pieces
*/

const initialBoard = [
    ['r', 'n', 'k', 'b', 'q'],
    ['p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P','P'],
    ['R', 'N', 'K', 'B', 'Q']
];

window.onload = (event) => {
    const boardEl = document.getElementById('board');
    const turnDisplay = document.getElementById('turn-display');

    const rows = initialBoard.length;
    const cols  = initialBoard[0].length;

    boardEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
    boardEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

    let board = initialBoard;

    let turn = 0;
    let selected = null;
    let possibleMoves = [];

    function renderBoard() {
        boardEl.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {

                const sq = document.createElement('button');
                sq.classList.add('square');
                sq.dataset.r = r;
                sq.dataset.c = c;

                if ((r + c) % 2 === 0) {
                    sq.classList.add('dark');
                }

                const piece = board[r][c];
                if (piece !== '.') sq.textContent = piece;

                sq.addEventListener('click', onSquareClick);

                console.log(isWhite(piece));

                boardEl.appendChild(sq);
            }
        }

        turnDisplay.textContent = turn == 0 ? 'White' : 'Black'
    }

    function onSquareClick(e) {
        const r = +e.target.dataset.r;
        const c = +e.target.dataset.c;

        console.log('Clicked', r, c);

        const piece = board[r][c];

        if (isEmpty(piece)) {
            selected = null;
            highlightMoves([]);
            e.target.blur();
            return;
        }

        const isWhiteTurn = turn === 0;
        const isWhitePiece = isWhite(piece);

        // If wrong color piece clicked → ignore
        if (isWhiteTurn !== isWhitePiece) {
            selected = null;
            highlightMoves([]);
            e.target.blur();
            return;
        }

        // Select piece
        selected = { r, c, piece };

        // Get possible moves for this piece
        possibleMoves = getLegalMoves(r, c, piece);

        console.log(possibleMoves);
    }

    function highlightMoves(moves) {
        document.querySelectorAll('.highlight').forEach(sq => sq.classList.remove('highlight'));
        moves.forEach(([r, c]) => {
            const sq = document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
            if (sq) sq.classList.add('highlight');
        });
    }

    renderBoard();
};