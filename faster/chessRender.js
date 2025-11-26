import { delay } from '../utils.js';

export class ChessRender {
    constructor(engine = null) {
        this.engine = engine;
        engine.renderer = this;

        this.boardEl = null;
        this.turnDisplay = null;
        this.logDisplay = null;
        this.whiteCaptures = null;
        this.blackCaptures = null;
        this.promotionScreen = null;
        this.endScreen = null;

        this.lastSelected = null;
        this.blurredTime = null;
        this.lastPromote = null;

        this.assetPrefix = '../assets/chess.com_';
        this.sounds = [
            this.assetPrefix + 'move-self' + '.mp3',
            this.assetPrefix + 'capture' + '.mp3',
            this.assetPrefix + 'move-check' + '.mp3',
            this.assetPrefix + 'promote' + '.mp3',
            this.assetPrefix + 'castle' + '.mp3',
        ]
        this.playableSounds = [];
    }

    BeginPlay() {
        this.boardEl = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');
        this.logDisplay = document.getElementById('log-display');
        this.whiteCaptures = document.getElementById('whiteOpponent').children[1];
        this.blackCaptures = document.getElementById('blackOpponent').children[1];
        this.promotionScreen = document.getElementById('promotion-screen');
        this.endScreen = document.getElementById('end-screen');

        this.boardEl.style.gridTemplateRows = `repeat(${this.engine.rows}, minmax(0, 1fr))`;
        this.boardEl.style.gridTemplateColumns = `repeat(${this.engine.cols}, minmax(0, 1fr))`;
        
        this.promotionScreen.style.height = (100 / this.engine.rows) * 4 + '%';
        this.promotionScreen.style.width = 100 / this.engine.cols + '%';

        for (let row = 0; row < this.engine.rows; row++) {
            for (let col = 0; col < this.engine.cols; col++) {
                const sq = document.createElement('button');
                sq.classList.add('square');
                sq.dataset.rank = this.engine.rows - row;
                sq.dataset.file = String.fromCharCode(97 + col);

                sq.dataset.row = row;
                sq.dataset.col = col;

                if ((row + col) % 2 === 1) {
                    sq.classList.add('dark');
                }

                sq.onclick = (e) => this.onSquareClick(e);
                sq.onblur = (e) => this.onSquareBlur(e);

                this.boardEl.appendChild(sq);

                this.UpdateSquare(row, col);
            }
        }

        this.UpdateGame();

        for (let i = 0; i < this.promotionScreen.children.length; i++) {
            this.promotionScreen.children[i].onclick = (e) => this.onPromoClick(e);
            this.promotionScreen.children[i].onblur = (e) => this.onPromoBlur(e);
        }

        for (let i = 0; i < this.sounds.length; i++) {
            this.playableSounds.push(new Audio(this.sounds[i]));
        }

        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('square')) {
                if (this.lastSelected !== null) {
                    this.lastSelected = null;
                    this.desHighlightMoves();
                }
            }

            if (!e.target.classList.contains('square') || (e.target.classList.contains('square') && !e.target.classList.contains('promotion'))) {
                if (this.lastPromote !== null) {
                    this.lastPromote = null;
                    this.promotionScreen.classList.add('hidden');
                }
            }
        });
    }

    UpdateSquare(row, col) {
        const sq = this.boardEl.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
            if (!sq) return;

        const piece = this.engine.getPiece(row, col);

        if (piece == '.') {
            sq.style.setProperty('--bg-img', ``);
            return;
        }

        sq.style.setProperty('--bg-img', `url(${this.assetPrefix + (this.engine.isWhite(piece) ? 'w' : 'b') + piece.toLowerCase()}.png)`);
    }

    UpdateGame() {
        this.turnDisplay.textContent = this.engine.turn == 0 ? 'White' : 'Black';
    }

    onSquareClick(e) {
        // Case 0: not his turn -> deselect
        if ((this.engine.turn == 0 && this.engine.whiteAI != null) || (this.engine.turn == 1 && this.engine.blackAI != null)) {
            console.log('AIs turn');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        const row = +e.target.dataset.row;
        const col = +e.target.dataset.col;

        const clickedSame =
            this.lastSelected &&
            this.lastSelected.row === row &&
            this.lastSelected.col === col;

        // Case 1: clicking same square -> deselect
        if (clickedSame) {
            console.log('Deselected same square');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 2: blur happened too recently -> avoid unwanted deselection
        if ((new Date() - this.blurredTime) >= 300 && this.lastSelected !== null) {
            console.log('Deselected due to blur timing');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 3: has previous target and a valid new target -> move piece
        if (this.lastSelected != null && this.engine.isLegalMove(this.lastSelected?.row, this.lastSelected?.col, row, col)) {
            console.log('Move from', this.lastSelected?.row, this.lastSelected?.col, 'to', row, col);
            this.engine.MovePiece(this.lastSelected?.row, this.lastSelected?.col, row, col);

            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        const piece = this.engine.getPiece(row, col);

        // Case 4: click on empty square -> clear selection
        if (this.engine.isEmpty(piece)) {
            console.log('Clicked empty -> clear selection');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 5: click on piece of the oponent → clear selection
        if ((this.engine.isWhite(piece) && this.engine.turn != 0) || (this.engine.isBlack(piece) && this.engine.turn != 1)) {
            console.log('Clicked oponent piece -> clear selection');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 6: click on a piece -> select        
        this.lastSelected = { row, col };

        this.highlightMoves(row, col);
    }

    onSquareBlur(e) {
        this.blurredTime = new Date();
    }

    highlightMoves(row, col) {
        this.desHighlightMoves();

        const moves = this.engine.getLegalMoves(row, col);

        
        moves.forEach(([row, col, promote]) => {
            const sq = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
            if (sq) sq.classList.add('highlight');
        });
    }

    desHighlightMoves() {
        document.querySelectorAll('.highlight').forEach(sq => sq.classList.remove('highlight'));
    }

    async Promote(fr, fc, tr, tc) {
        this.promotionScreen.classList.remove('black');
        await delay(100);

        this.lastPromote = { fr, fc, tr, tc };

        // Compute vertical offset
        const isBlack = tr !== 0;
        const y = isBlack ? (tr - 3) * 25 : tr * 25;  // since you're dividing by 4

        // Apply transform
        this.promotionScreen.style.transform = `translate(${tc * 100}%, ${y}%)`;

        if (isBlack) this.promotionScreen.classList.add('black');

        this.promotionScreen.classList.remove('hidden');

        // Focus first selectable piece
        const first = this.promotionScreen.querySelector('[data-piece]');
        if (first) first.focus();
    }
    onPromoClick(e) {
        const newPiece = e.target.dataset.piece;
            if (!newPiece) return;

        const { fr, fc, tr, tc } = this.lastPromote;

        this.engine.MovePiece(fr, fc, tr, tc, newPiece);

        this.lastPromote = null;
        this.promotionScreen.classList.add('hidden');
        e.target.blur();
    }
    onPromoBlur(e) {
        this.blurredTime = new Date();
    }
}