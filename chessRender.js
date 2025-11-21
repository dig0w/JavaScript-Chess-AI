import { delay } from './utils.js';

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

        this.assetPrefix = 'assets/chess.com_';
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

        for (let r = 0; r < this.engine.rows; r++) {
            for (let c = 0; c < this.engine.cols; c++) {
                const sq = document.createElement('button');
                sq.classList.add('square');
                sq.dataset.r = r;
                sq.dataset.c = c;

                sq.dataset.rank = this.engine.rows - r;
                sq.dataset.file = String.fromCharCode(97 + c);

                if ((r + c) % 2 === 0) {
                    sq.classList.add('dark');
                }

                sq.onclick = (e) => this.onSquareClick(e);
                sq.onblur = (e) => this.onSquareBlur(e);

                this.boardEl.appendChild(sq);

                this.UpdateSquare(r, c);
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

    UpdateSquare(r, c) {
        const sq = this.boardEl.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
            if (!sq) return;
        
        const piece = this.engine.board[r][c];
        
        if (this.engine.isEmpty(this.engine.board[r][c])) {
            sq.style.setProperty('--bg-img', ``);
            // sq.style.backgroundImage = null;
            return;
        }

        sq.style.setProperty('--bg-img', `url(${this.assetPrefix + (this.engine.isWhite(piece) ? 'w' : 'b') + piece.toLowerCase()}.png)`);
        // sq.style.backgroundImage = 'url(' + this.assetPrefix + (this.engine.isWhite(piece) ? 'w' : 'b') + piece.toLowerCase() + '.png)';
    }

    async UpdateGame() {
        this.UpdateCheck();
        this.UpdateCaptures();
        this.UpdateTurn();
        this.UpdateLog();

        // Highlight last move
        document.querySelectorAll('.selected').forEach(sq => sq.classList.remove('selected'));
        document.querySelectorAll('.light-selected').forEach(sq => sq.classList.remove('light-selected'));
        if (this.engine.lastMove) {
            const fsq = this.boardEl.querySelector(`.square[data-r="${this.engine.lastMove.fr}"][data-c="${this.engine.lastMove.fc}"]`);
                if (!fsq) return;
            const tsq = this.boardEl.querySelector(`.square[data-r="${this.engine.lastMove.tr}"][data-c="${this.engine.lastMove.tc}"]`);
                if (!tsq) return;
            
            fsq.classList.add('light-selected');
            tsq.classList.add('selected');
        }

        await delay(200);

        if (this.engine.gameCondition.startsWith('WHITE_WINS')) {
            this.endScreen.classList.remove('hidden');

            this.endScreen.classList.add('won');

            this.endScreen.children[0].children[0].children[0].textContent = 'White Won!';
            this.endScreen.children[0].children[0].children[1].textContent = 'by ' + this.engine.gameCondition.split('_').slice(2).join(' ').toLowerCase();
        } else if (this.engine.gameCondition.startsWith('BLACK_WINS')) {
            this.endScreen.classList.remove('hidden');

            this.endScreen.classList.add('won');

            this.endScreen.children[0].children[0].children[0].textContent = 'Black Won!';
            this.endScreen.children[0].children[0].children[1].textContent = 'by ' + this.engine.gameCondition.split('_').slice(2).join(' ').toLowerCase();
        } else if (this.engine.gameCondition.startsWith('DRAW')) {
            this.endScreen.classList.remove('hidden');

            this.endScreen.classList.add('draw');

            this.endScreen.children[0].children[0].children[0].textContent = 'Draw!';
            this.endScreen.children[0].children[0].children[1].textContent = 'by ' + this.engine.gameCondition.split('_').slice(1).join(' ').toLowerCase();
        }
    }

    UpdateCheck() {
        document.querySelectorAll('.checked').forEach(sq => sq.classList.remove('checked'));

        if (this.engine.whiteKingChecked) {
            const kingChar = 'K';
            const kings = this.engine.getPieces(kingChar);
            const { r: kr, c: kc } = kings[0] ? kings[0] : { r: -1, c: -1 };

            const sq = document.querySelector(`.square[data-r="${kr}"][data-c="${kc}"]`);
            if (sq) sq.classList.add('checked');
        }
        if (this.engine.blackKingChecked) {
            const kingChar = 'k';
            const kings = this.engine.getPieces(kingChar);
            const { r: kr, c: kc } = kings[0] ? kings[0] : { r: -1, c: -1 };

            const sq = document.querySelector(`.square[data-r="${kr}"][data-c="${kc}"]`);
            if (sq) sq.classList.add('checked');
        }
    }

    UpdateCaptures() {
        this.whiteCaptures.children[0].innerHTML = '';
        for (let i = 0; i < this.engine.whiteCaptures.length; i++) {
            const li = document.createElement('li');
            li.textContent = this.engine.whiteCaptures[i].toUpperCase();

            this.whiteCaptures.children[0].appendChild(li);
        }

        const whiteDiff = this.engine.whitePoints - this.engine.blackPoints;
        this.whiteCaptures.children[1].textContent = whiteDiff === 0 ? '' : (whiteDiff > 0 ? `+${whiteDiff}` : `${whiteDiff}`);


        this.blackCaptures.children[0].innerHTML = '';
        for (let i = 0; i < this.engine.blackCaptures.length; i++) {
            const li = document.createElement('li');
            li.textContent = this.engine.blackCaptures[i].toUpperCase();

            this.blackCaptures.children[0].appendChild(li);
        }

        const blackDiff = -whiteDiff;
        this.blackCaptures.children[1].textContent = blackDiff === 0 ? '' : (blackDiff > 0 ? `+${blackDiff}` : `${blackDiff}`);
    }

    UpdateTurn() {
        this.turnDisplay.textContent = this.engine.turn == 0 ? 'White' : 'Black';
    }

    UpdateLog() {
        this.logDisplay.innerHTML = '';

        for (let i = 0; i < this.engine.log.length; i++) {
            const li = document.createElement('li');
            li.textContent = this.engine.log[i];

            this.logDisplay.appendChild(li);
        }

        this.logDisplay.scrollTop = this.logDisplay.scrollHeight;
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

        const r = +e.target.dataset.r;
        const c = +e.target.dataset.c;

        const clickedSame =
            this.lastSelected &&
            this.lastSelected.r === r &&
            this.lastSelected.c === c;

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
        if (this.lastSelected != null && this.engine.isLegalMove(this.lastSelected?.r, this.lastSelected?.c, r, c)) {
            console.log('Move from', this.lastSelected?.r, this.lastSelected?.c, 'to', r, c);
            this.engine.MovePiece(this.lastSelected?.r, this.lastSelected?.c, r, c);

            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        const piece = this.engine.board[r][c];

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
        this.lastSelected = { r, c };

        this.highlightMoves(r, c);
    }

    onSquareBlur(e) {
        this.blurredTime = new Date();
    }

    highlightMoves(r, c) {
        this.desHighlightMoves();

        const moves = this.engine.getLegalMoves(r, c);
        console.log(moves);

        moves.forEach(([r, c]) => {
            const sq = document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
            if (sq) sq.classList.add('highlight');
        });
    }

    desHighlightMoves() {
        document.querySelectorAll('.highlight').forEach(sq => sq.classList.remove('highlight'));
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

    PlaySound(type = 0) {
        this.playableSounds[type].play();
    }
}
