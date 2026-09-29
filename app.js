// Initialize chess game and board
let game = new Chess();
let board = null;
let $board = $('#board');
let showThreats = false; // Start with threats off
let debugMode = false; // Set to true to see debug info
let gameMode = 'computer'; // Always play against computer
let difficulty = 'beginner'; // key of LEVELS
let isComputerTurn = false;
let hintsUsed = 0; // detector uses this game (threats + danger), counted against the level's limit
let limitHints = false; // off: unlimited hints on every level; on: LEVELS[...].hintLimit applies
try { limitHints = localStorage.getItem('limitHints') === '1'; } catch (e) {}

// What each level teaches. depth: search depth (none = teaching moves);
// blunder: chance the computer leaves one of its pieces hanging on purpose;
// autoHints: mark the child's hanging pieces automatically; warnBlunders: ask before a move that hangs a piece
const LEVELS = {
    beginner: { blunder: 0.3,  autoHints: true,  hintLimit: Infinity, warnBlunders: true },
    attacker: { blunder: 0.15, autoHints: false, hintLimit: Infinity, warnBlunders: true },
    medium:   { depth: 2, blunder: 0, autoHints: false, hintLimit: 3, warnBlunders: false },
    hard:     { depth: 3, blunder: 0, autoHints: false, hintLimit: 0, warnBlunders: false }
};
const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

// Every piece of UI text, per language. Markup uses data-i18n="key"; code uses t('key', {vars})
const STRINGS = {
    he: {
        pageTitle: 'גלאי איומים בשחמט לילדים',
        appTitle: 'גלאי איומים בשחמט',
        subtitle: 'למדו לזהות איומים ולהגן על הכלים שלכם!',
        dedication: 'מוקדש באהבה לאדם וילף ❤️',
        yourTurn: 'התור שלכם!',
        computerThinking: 'המחשב חושב…',
        newGame: 'משחק חדש',
        undo: 'חזרה',
        save: 'שמירה',
        load: 'טעינה',
        whoThreatens: 'מי מאיים?',
        myPiecesInDanger: 'הכלים שלי בסכנה',
        explain: 'הסבר',
        dangerInfo: 'לחצו כדי לסמן לרגע באדום את כל הכלים שלכם שמאוימים עכשיו.',
        level: 'רמה',
        level_beginner: 'מתחיל',
        level_attacker: 'תוקף',
        level_medium: 'בינוני',
        level_hard: 'קשה',
        caption_beginner: 'המחשב אוכל כלים שנשארו בלי הגנה. כלים שלכם בסכנה מסומנים, והמחשב מזהיר לפני טעות.',
        caption_attacker: 'המחשב מחפש לתקוף את הכלים שלכם, ומזהיר לפני טעות.',
        caption_medium: 'המחשב חושב מהלך קדימה ולא נותן כלים בחינם.',
        caption_hard: 'המחשב חושב שני מהלכים קדימה ומחפש מזלגות.',
        limitHints: 'הגבלת רמזים לפי רמה',
        limitInfo: 'כשמופעל, מספר הרמזים במשחק תלוי ברמה: מתחיל ותוקף - בלי הגבלה, בינוני - 3, קשה - בלי רמזים. כל לחיצה על "מי מאיים?" או "הכלים שלי בסכנה" נספרת כרמז. כשכבוי - רמזים בלי הגבלה בכל הרמות.',
        captured: 'נאכלו',
        youCaptured: 'אכלתם',
        computerCaptured: 'המחשב אכל',
        howTo: 'איך משחקים?',
        howTo1: 'לחצו "משחק חדש" כדי לבחור צבע ולהתחיל.',
        howTo2: 'גררו כלי, או לחצו על כלי ואז על הריבוע שאליו הוא זז.',
        howTo3: 'לחצו "מי מאיים?" ואז על ריבוע כדי לראות אילו כלים מאיימים עליו. ככל שיותר כלים מאיימים, המסגרת האדומה עבה יותר.',
        howTo4: 'לחצו "הכלים שלי בסכנה" כדי לראות לרגע את כל הכלים שלכם שמאוימים.',
        howTo5: 'כשהמלך שלכם בשח הוא מסומן באדום. לחצו "מי מאיים?" ואז על המלך כדי לראות מי נותן שח.',
        howTo6: 'ברמות מתחיל ותוקף המחשב מזהיר לפני שאתם משאירים כלי בלי הגנה.',
        pickColor: 'באיזה צבע תשחקו?',
        white: 'לבן',
        black: 'שחור',
        warnTitle: 'רגע, בדקו!',
        warnUndo: 'אחזיר את המהלך',
        warnKeep: 'זה המהלך שלי',
        warnText: 'אחרי המהלך הזה המחשב יכול לאכול את {pieces}. להמשיך?',
        pieceRef: 'ה{piece} ({sq})',
        pieces: { p: 'חייל', n: 'סוס', b: 'רץ', r: 'צריח', q: 'מלכה', k: 'מלך' },
        youWin: 'מט! ניצחתם! 🎉',
        computerWins: 'מט. המחשב ניצח הפעם - נסו שוב!',
        stalemate: 'פט - תיקו! 🤝 אין מהלך חוקי, אבל המלך לא בשח.',
        insufficient: 'תיקו! 🤝 לא נשארו מספיק כלים כדי לתת מט.',
        youInCheck: 'שח! המלך שלכם מאוים ⚠️',
        computerInCheck: 'שח למחשב! 👏',
        noDanger: 'אף כלי שלכם לא מאוים כרגע 👍',
        hintInfoUnlimited: 'לחצו "מי מאיים?" ואז על ריבוע כדי לראות מי מאיים עליו. הרמז נסגר אוטומטית.',
        hintInfoNone: 'ברמה קשה אין רמזים - בדקו לבד! 💪',
        hintInfoLeft: 'נשארו {n} רמזים במשחק הזה. לחצו "מי מאיים?" ואז על ריבוע.',
        hintInfoOut: 'נגמרו הרמזים למשחק הזה 💪',
        hintInfoBeginner: ' ברמת מתחיל כלים שלכם בסכנה מסומנים באדום.',
        hintsLeft: 'נשארו {n}',
        noGameToSave: 'אין עדיין משחק לשמירה - התחילו משחק חדש!',
        savedName: 'משחק של {n} מהלכים - {time}',
        saved: 'המשחק נשמר!\n{name}',
        noSavedGames: 'אין משחקים שמורים!',
        pickSave: 'בחרו משחק לטעינה:',
        enterNumber: 'הקלידו מספר (1-{n}) או לחצו ביטול:',
        badNumber: 'מספר לא תקין!',
        confirmLoad: 'לטעון את המשחק:\n{name}?\n\nהמשחק הנוכחי יאבד!',
        loaded: 'המשחק נטען!\n{name}',
        loadError: 'לא הצלחנו לטעון את המשחק. ייתכן שהשמירה פגומה.'
    },
    en: {
        pageTitle: 'Chess Threat Spotter for Kids',
        appTitle: 'Chess Threat Spotter',
        subtitle: 'Learn to spot threats and protect your pieces!',
        dedication: 'Dedicated with love to Adam Wilf ❤️',
        yourTurn: 'Your turn!',
        computerThinking: 'Computer is thinking…',
        newGame: 'New game',
        undo: 'Undo',
        save: 'Save',
        load: 'Load',
        whoThreatens: "Who's attacking?",
        myPiecesInDanger: 'My pieces in danger',
        explain: 'Explain',
        dangerInfo: 'Tap to briefly mark in red every one of your pieces that is under attack right now.',
        level: 'Level',
        level_beginner: 'Beginner',
        level_attacker: 'Attacker',
        level_medium: 'Medium',
        level_hard: 'Hard',
        caption_beginner: 'The computer takes pieces you leave unprotected. Your pieces in danger are marked, and it warns you before a mistake.',
        caption_attacker: 'The computer looks for ways to attack your pieces, and warns you before a mistake.',
        caption_medium: 'The computer thinks one move ahead and never gives pieces away.',
        caption_hard: 'The computer thinks two moves ahead and looks for forks.',
        limitHints: 'Limit hints by level',
        limitInfo: 'When on, the number of hints per game depends on the level: Beginner and Attacker - unlimited, Medium - 3, Hard - none. Every tap on "Who\'s attacking?" or "My pieces in danger" counts as a hint. When off, hints are unlimited on every level.',
        captured: 'Captured',
        youCaptured: 'You captured',
        computerCaptured: 'Computer captured',
        howTo: 'How to play',
        howTo1: 'Tap "New game" to pick a color and start.',
        howTo2: 'Drag a piece, or tap a piece and then the square it should move to.',
        howTo3: 'Tap "Who\'s attacking?" and then a square to see which pieces attack it. The more attackers, the thicker the red frame.',
        howTo4: 'Tap "My pieces in danger" to briefly see all of your pieces that are under attack.',
        howTo5: 'When your king is in check it is marked in red. Tap "Who\'s attacking?" and then the king to see who gives check.',
        howTo6: 'On Beginner and Attacker the computer warns you before you leave a piece unprotected.',
        pickColor: 'Which color do you want to play?',
        white: 'White',
        black: 'Black',
        warnTitle: 'Wait, check this!',
        warnUndo: 'Take it back',
        warnKeep: 'Keep my move',
        warnText: 'After this move the computer can capture {pieces}. Continue?',
        pieceRef: 'your {piece} ({sq})',
        pieces: { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' },
        youWin: 'Checkmate! You win! 🎉',
        computerWins: 'Checkmate. The computer won this time - try again!',
        stalemate: 'Stalemate - a draw! 🤝 No legal move, but the king is not in check.',
        insufficient: 'A draw! 🤝 Not enough pieces left to checkmate.',
        youInCheck: 'Check! Your king is under attack ⚠️',
        computerInCheck: 'Check on the computer! 👏',
        noDanger: 'None of your pieces is under attack right now 👍',
        hintInfoUnlimited: 'Tap "Who\'s attacking?" and then a square to see what attacks it. The hint turns off by itself.',
        hintInfoNone: 'No hints on Hard - check for yourself! 💪',
        hintInfoLeft: '{n} hints left this game. Tap "Who\'s attacking?" and then a square.',
        hintInfoOut: 'No hints left this game 💪',
        hintInfoBeginner: ' On Beginner, your pieces in danger are marked in red.',
        hintsLeft: '{n} left',
        noGameToSave: 'Nothing to save yet - start a new game first!',
        savedName: 'Game of {n} moves - {time}',
        saved: 'Game saved!\n{name}',
        noSavedGames: 'No saved games!',
        pickSave: 'Choose a game to load:',
        enterNumber: 'Type a number (1-{n}) or press Cancel:',
        badNumber: 'Invalid number!',
        confirmLoad: 'Load this game:\n{name}?\n\nThe current game will be lost!',
        loaded: 'Game loaded!\n{name}',
        loadError: 'Could not load the game. The save may be damaged.'
    }
};
let lang = 'he';
try { if (STRINGS[localStorage.getItem('lang')]) lang = localStorage.getItem('lang'); } catch (e) {}

function t(key, vars = {}) {
    return String(STRINGS[lang][key] ?? key).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

// Switch every text on the page, plus direction (RTL for Hebrew)
function applyLanguage(newLang) {
    lang = STRINGS[newLang] ? newLang : 'he';
    try { localStorage.setItem('lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.title = t('pageTitle');
    $('[data-i18n]').each(function() { this.textContent = t(this.dataset.i18n); });
    $('[data-i18n-aria]').each(function() { this.setAttribute('aria-label', t(this.dataset.i18nAria)); });
    $('.lang-btn').each(function() { this.setAttribute('aria-pressed', String(this.dataset.lang === lang)); });
    updateStatus();
    updateCapturedPieces();
    updateHintInfo();
}
let selectedSquare = null; // For tap-to-see-threats feature
let showingSquareThreats = false;
let playerColor = 'white'; // Player's color choice
let moveFrom = null; // Tap-to-move: selected source square

// Configuration for chessboard
const config = {
    draggable: true,
    position: 'empty',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

// Initialize the board
$(document).ready(function() {
    board = Chessboard('board', config);
    $(window).on('resize', () => {
        board.resize();
        clearSquareThreats();
        showAutoHints();
    });
    
    // One delegated handler survives every board redraw (tap-to-move and tap-to-see-threats)
    $board.on('click', '[data-square]', function() {
        onSquareClick($(this).attr('data-square'));
    });
    
    // Event listeners
    $('#resetBtn').on('click', showColorSelectionModal);
    $('#undoBtn').on('click', undoMove);
    $('#saveBtn').on('click', saveGame);
    $('#loadBtn').on('click', loadGame);
    $('#showThreats').on('click', function() {
        setThreatMode(!showThreats);
        if (!showThreats) {
            clearSquareThreats();
            showAutoHints();
        }
    });
    $('input[name="difficulty"]').on('change', function() {
        difficulty = this.value;
        clearSquareThreats();
        showAutoHints();
        updateHintInfo();
    });
    $('#showDanger').on('click', flashDangerPieces);
    $('#limitHints').prop('checked', limitHints).on('change', function() {
        limitHints = this.checked;
        try { localStorage.setItem('limitHints', limitHints ? '1' : '0'); } catch (e) {}
        updateHintInfo();
    });
    $('.lang-btn').on('click', function() { applyLanguage(this.dataset.lang); });
    applyLanguage(lang);
    // Every "?" button shows/hides the explanation it points to
    $('.help-btn').on('click', function() {
        const $info = $('#' + $(this).attr('aria-controls'));
        const show = $info.prop('hidden');
        $info.prop('hidden', !show);
        $(this).attr('aria-expanded', show);
    });

    // Modal event listeners
    $('#playWhite').on('click', () => startNewGame('white'));
    $('#playBlack').on('click', () => startNewGame('black'));
    $('#warnKeep').on('click', keepWarnedMove);
    $('#warnUndo').on('click', takeBackWarnedMove);
});

// "Who's attacking?" is armed until the next square tap
function setThreatMode(on) {
    showThreats = on;
    $('#showThreats').attr('aria-pressed', String(on));
}

// Check if a piece can be dragged
function onDragStart(source, piece, position, orientation) {
    // Don't allow moves if game is over
    if (isGameOver()) return false;

    // Threat detector is armed: a tap on a piece should show its threats, so don't start a drag
    if (showThreats) return false;

    // Don't allow moves during computer's turn
    if (isComputerTurn) return false;
    
    // In computer mode, only allow player's color pieces to be moved
    const playerPieces = playerColor === 'white' ? /^w/ : /^b/;
    if (gameMode === 'computer' && !piece.match(playerPieces)) {
        return false;
    }
    
    // Only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// Handle piece drop (a tap on own piece arrives here as source === target)
function onDrop(source, target) {
    if (source === target) {
        $('.square-highlight.selected-square').remove(); // keep hint/check marks visible
        moveFrom = source;
        addSquareHighlight(source, 'selected-square', 0);
        return 'snapback';
    }
    if (!tryMove(source, target)) return 'snapback';
}

// Make the player's move; returns false if illegal
function tryMove(source, target) {
    const me = game.turn();

    // Try to make the move
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (move === null) {
        return false;
    }

    updateStatus();
    updateCapturedPieces();

    // Clear any threat displays after a move
    clearSquareThreats();

    // Lower levels: ask before a move that leaves a piece to be captured (an even-or-better trade doesn't count)
    if (LEVELS[difficulty].warnBlunders && !isGameOver()) {
        const tradedFairly = move.captured && PIECE_VALUES[move.captured] >= PIECE_VALUES[move.piece];
        const hanging = hangingPieces(me).filter(sq => !(tradedFairly && sq === move.to));
        if (hanging.length) {
            showBlunderWarning(hanging);
            return true;
        }
    }

    afterPlayerMove();
    return true;
}

function afterPlayerMove() {
    // If it's computer's turn, make computer move
    const computerColor = playerColor === 'white' ? 'b' : 'w';
    if (gameMode === 'computer' && game.turn() === computerColor && !isGameOver()) {
        setTimeout(makeComputerMove, 500); // Small delay for better UX
    }
}

function showBlunderWarning(squares) {
    const enemy = game.turn();
    const names = squares.map(sq => t('pieceRef', { piece: getPieceText(game.get(sq).type), sq })).join(', ');
    $('#warnText').text(t('warnText', { pieces: names }));
    squares.forEach(sq => addSquareHighlight(sq, 'threatened-square', attackersOf(sq, enemy).length));
    isComputerTurn = true; // block moves until the child decides
    $('#warnModal').show();
}

function keepWarnedMove() {
    $('#warnModal').hide();
    isComputerTurn = false;
    clearSquareThreats();
    afterPlayerMove();
}

function takeBackWarnedMove() {
    $('#warnModal').hide();
    isComputerTurn = false;
    game.undo();
    board.position(game.fen());
    clearSquareThreats();
    updateStatus();
    updateCapturedPieces();
    showAutoHints();
}

// Update board position after the piece snap
function onSnapEnd() {
    board.position(game.fen());
}

// Undo last move
// Take back the child's last move and the computer's reply. Uses game.undo() so the move
// history (and with it the captured-pieces list) stays intact
function undoMove() {
    const me = playerColor === 'white' ? 'w' : 'b';
    if (isComputerTurn || !game.history({ verbose: true }).some(m => m.color === me)) return;
    while (game.undo().color !== me) {}
    board.position(game.fen());
    clearSquareThreats();
    updateStatus();
    updateCapturedPieces();
    showAutoHints();
}

// Games end only when nobody can win. Repetition and the 50-move rule are left out on purpose:
// in real chess a player has to claim them, and for kids they cut games short that are still being played
function isGameOver() {
    return game.in_checkmate() || game.in_stalemate() || game.insufficient_material();
}

// Turn chip and game status, from the child's point of view
function updateStatus() {
    const myTurn = game.turn() === (playerColor === 'white' ? 'w' : 'b');
    $('#currentTurnText').text(myTurn ? t('yourTurn') : t('computerThinking'));
    $('#turnChip').toggleClass('waiting', !myTurn && !isGameOver());

    let status = '', good = false;
    if (game.in_checkmate()) { status = myTurn ? t('computerWins') : t('youWin'); good = !myTurn; }
    else if (game.in_stalemate()) status = t('stalemate');
    else if (game.insufficient_material()) status = t('insufficient');
    else if (game.in_check()) { status = myTurn ? t('youInCheck') : t('computerInCheck'); good = !myTurn; }
    $('#gameStatus').text(status).toggleClass('good', good);
}

// Captured pieces, from the child's point of view
function updateCapturedPieces() {
    const captured = getCapturedPieces();
    const mine = playerColor, theirs = playerColor === 'white' ? 'black' : 'white';
    $('#youCaptured').text(captured[theirs].map(p => getPieceSymbol(p, theirs)).join(''));
    $('#computerCaptured').text(captured[mine].map(p => getPieceSymbol(p, mine)).join(''));
}

// Get lists of captured pieces
function getCapturedPieces() {
    const history = game.history({ verbose: true });
    const captured = { white: [], black: [] };
    
    history.forEach(move => {
        if (move.captured) {
            // The color of the captured piece is opposite to the player who made the move
            const capturedColor = move.color === 'w' ? 'black' : 'white';
            captured[capturedColor].push(move.captured);
        }
    });
    
    return captured;
}

// Convert piece code to symbol
function getPieceSymbol(piece, color) {
    const whiteSymbols = {
        'p': '♙',
        'n': '♘',
        'b': '♗',
        'r': '♖',
        'q': '♕',
        'k': '♔'
    };
    const blackSymbols = {
        'p': '♟',
        'n': '♞',
        'b': '♝',
        'r': '♜',
        'q': '♛',
        'k': '♚'
    };
    
    if (color === 'white') {
        return whiteSymbols[piece] || piece;
    } else {
        return blackSymbols[piece] || piece;
    }
}

// Computer AI Functions
function makeComputerMove() {
    const computerColor = playerColor === 'white' ? 'b' : 'w';
    if (isGameOver() || game.turn() !== computerColor) return;
    
    isComputerTurn = true;
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) {
        isComputerTurn = false;
        return;
    }
    
    const level = LEVELS[difficulty];
    const selectedMove = level.depth ? getSearchMove(moves, level.depth) : getTeachingMove(moves, level);
    
    // Make the move
    if (selectedMove) {
        game.move(selectedMove);
        board.position(game.fen());
        
        updateStatus();
        updateCapturedPieces();
        clearSquareThreats();
        showAutoHints();
    }
    
    isComputerTurn = false;
}

function randomOf(items) {
    return items[Math.floor(Math.random() * items.length)];
}

// Beginner/Attacker: punish pieces the child left hanging, sometimes leave one of ours hanging on purpose,
// otherwise Beginner plays randomly and Attacker picks the move that creates the biggest threat
function getTeachingMove(moves, level) {
    const me = game.turn();
    const you = me === 'w' ? 'b' : 'w';
    
    // Free material: an undefended piece, or one worth more than the piece taking it
    const grabs = moves.filter(m => m.captured &&
        (!attackersOf(m.to, you).length || PIECE_VALUES[m.piece] < PIECE_VALUES[m.captured]));
    if (grabs.length) {
        const best = Math.max(...grabs.map(m => PIECE_VALUES[m.captured]));
        return randomOf(grabs.filter(m => PIECE_VALUES[m.captured] === best));
    }
    
    const scored = moves.map(move => {
        game.move(move);
        const score = { move, threat: hangingValue(you), gift: hangingValue(me) };
        game.undo();
        return score;
    });
    const giftNow = hangingValue(me);
    
    // Deliberate mistake: give the child something to capture
    if (Math.random() < level.blunder) {
        const gifts = scored.filter(s => s.gift > giftNow);
        if (gifts.length) return randomOf(gifts).move;
    }
    
    if (difficulty === 'beginner') return randomOf(moves);
    
    const scoreOf = s => s.threat - s.gift;
    const best = Math.max(...scored.map(scoreOf));
    return randomOf(scored.filter(s => scoreOf(s) === best)).move;
}

// Medium/Hard: pick randomly among the best moves found by a material search `depth` plies deep
function getSearchMove(moves, depth) {
    let bestMoves = [];
    let bestScore = -Infinity;
    moves.forEach(move => {
        game.move(move);
        const score = -negamax(depth - 1, -Infinity, Infinity);
        game.undo();
        if (score > bestScore) {
            bestScore = score;
            bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }
    });
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Alpha-beta search; score is from the side to move's point of view
function negamax(depth, alpha, beta) {
    if (depth === 0) return materialScore(game.turn());
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return game.in_check() ? -10000 - depth : 0; // mate sooner is worse; stalemate is 0
    moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0)); // captures first prunes more
    for (const move of moves) {
        game.move(move);
        const score = -negamax(depth - 1, -beta, -alpha);
        game.undo();
        if (score >= beta) return score;
        if (score > alpha) alpha = score;
    }
    return alpha;
}

function materialScore(color) {
    let score = 0;
    game.board().forEach(row => row.forEach(piece => {
        if (piece) score += piece.color === color ? PIECE_VALUES[piece.type] : -PIECE_VALUES[piece.type];
    }));
    return score;
}

// Tap-to-see-threats functionality
function onSquareClick(square) {
    // Tap-to-move: second tap on a destination square
    if (!showThreats) {
        if (!moveFrom || square === moveFrom) return;
        const from = moveFrom;
        clearSquareThreats();
        if (tryMove(from, square)) onSnapEnd();
        return;
    }
    
    // Show threats and automatically disable toggle
    showThreatsToSquare(square);
}

function showThreatsToSquare(square) {
    clearSquareThreats();
    showCheckMark();
    selectedSquare = square;
    showingSquareThreats = true;
    
    hintsUsed++;
    updateHintInfo();
    
    // Find all pieces of the side that just moved that attack this square
    const attackers = attackersOf(square, game.turn() === 'w' ? 'b' : 'w');
    
    // Highlight the selected square with red border based on threat count
    if (attackers.length > 0) {
        // The selected square gets a red border with thickness based on threat count
        addSquareHighlight(square, 'threatened-square', attackers.length);
        
        // Highlight attacking pieces
        attackers.forEach(attackerSquare => {
            addSquareHighlight(attackerSquare, 'square-attacker', 0);
        });
        
    } else {
        // No threats - just show blue selection
        addSquareHighlight(square, 'selected-square', 0);
    }
    
    // Turn off the toggle after showing threats (makes kid "work" for the hint)
    setThreatMode(false);
}

// Squares of `color` pieces that attack `square` (pins are ignored, like "who is aiming at this square")
function attackersOf(square, color) {
    const b = game.board(); // b[row][col], row 0 is rank 8
    const tc = square.charCodeAt(0) - 97, tr = 8 - parseInt(square[1]);
    const out = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p || p.color !== color || (r === tr && c === tc)) continue;
            const dr = tr - r, dc = tc - c, ar = Math.abs(dr), ac = Math.abs(dc);
            let hit = false;
            if (p.type === 'p') hit = ac === 1 && dr === (color === 'w' ? -1 : 1);
            else if (p.type === 'n') hit = ar * ac === 2;
            else if (p.type === 'k') hit = Math.max(ar, ac) === 1;
            else if ((p.type !== 'b' && (dr === 0 || dc === 0)) || (p.type !== 'r' && ar === ac)) {
                // Slider on a matching line: every square in between must be empty
                const sr = Math.sign(dr), sc = Math.sign(dc);
                hit = true;
                for (let rr = r + sr, cc = c + sc; rr !== tr || cc !== tc; rr += sr, cc += sc) {
                    if (b[rr][cc]) { hit = false; break; }
                }
            }
            if (hit) out.push(String.fromCharCode(97 + c) + (8 - r));
        }
    }
    return out;
}

// Pieces of `color` (not the king) that can be won: undefended, or attacked by something cheaper
function hangingPieces(color) {
    const enemy = color === 'w' ? 'b' : 'w';
    const out = [];
    game.board().forEach((row, r) => row.forEach((p, c) => {
        if (!p || p.color !== color || p.type === 'k') return;
        const sq = String.fromCharCode(97 + c) + (8 - r);
        const attackers = attackersOf(sq, enemy);
        if (!attackers.length) return;
        // A king can only take undefended pieces, so treat it as the most expensive attacker
        const cheapest = Math.min(...attackers.map(a => game.get(a).type === 'k' ? 100 : PIECE_VALUES[game.get(a).type]));
        if (!attackersOf(sq, color).length || cheapest < PIECE_VALUES[p.type]) out.push(sq);
    }));
    return out;
}

function hangingValue(color) {
    return hangingPieces(color).reduce((sum, sq) => sum + PIECE_VALUES[game.get(sq).type], 0);
}

// Marks that stay on the board while it's the child's turn: their king in check (all levels),
// and on Beginner their pieces in danger
function showAutoHints() {
    const me = playerColor === 'white' ? 'w' : 'b';
    if (game.turn() !== me) return;
    showCheckMark();
    if (LEVELS[difficulty].autoHints) {
        const enemy = me === 'w' ? 'b' : 'w';
        hangingPieces(me).forEach(sq => addSquareHighlight(sq, 'threatened-square', attackersOf(sq, enemy).length));
    }
}

function showCheckMark() {
    if (!game.in_check()) return;
    const me = game.turn();
    const kingSq = game.board().flat().map((p, i) => p && p.type === 'k' && p.color === me ? String.fromCharCode(97 + i % 8) + (8 - Math.floor(i / 8)) : null).find(Boolean);
    addSquareHighlight(kingSq, 'check-square', 0);
}

// Hint budget (only when limits are on); both detectors are disabled when it runs out
function updateHintInfo() {
    const level = LEVELS[difficulty];
    const limit = limitHints ? level.hintLimit : Infinity;
    const left = limit - hintsUsed;
    $('#showThreats, #showDanger').prop('disabled', left <= 0);
    $('#hintCount').prop('hidden', !(limit > 0 && limit < Infinity)).text(t('hintsLeft', { n: Math.max(left, 0) }));
    let text;
    if (limit === Infinity) text = t('hintInfoUnlimited');
    else if (limit === 0) text = t('hintInfoNone');
    else if (left > 0) text = t('hintInfoLeft', { n: left });
    else text = t('hintInfoOut');
    if (level.autoHints) text += t('hintInfoBeginner');
    $('#hintInfo').text(text);
    $('#levelCaption').text(t('caption_' + difficulty));
}

// One-shot hint: mark every piece of the child's that is attacked right now, for a moment
function flashDangerPieces() {
    const me = playerColor === 'white' ? 'w' : 'b';
    const enemy = me === 'w' ? 'b' : 'w';
    hintsUsed++;
    updateHintInfo();
    $('.danger-flash').remove();
    let found = 0;
    game.board().forEach((row, r) => row.forEach((p, c) => {
        if (!p || p.color !== me || p.type === 'k') return;
        const sq = String.fromCharCode(97 + c) + (8 - r);
        const attackers = attackersOf(sq, enemy).length;
        if (attackers) {
            found++;
            addSquareHighlight(sq, 'threatened-square', attackers)?.addClass('danger-flash');
        }
    }));
    if (!found) $('#gameStatus').text(t('noDanger')).addClass('good');
    setTimeout(() => {
        $('.danger-flash').remove();
        if (!found) updateStatus();
    }, 2500);
}

function clearSquareThreats() {
    $('.square-highlight').remove();
    selectedSquare = null;
    showingSquareThreats = false;
    moveFrom = null;
}

function addSquareHighlight(square, className, threatCount) {
    const $square = $board.find('.square-' + square);
    const position = $square.position();
    
    if (!position) return;
    
    const highlight = $('<div>');
    highlight.addClass('square-highlight');
    highlight.addClass(className);
    
    // Calculate border thickness based on threat count
    let borderThickness = 3;
    if (className === 'threatened-square') {
        // For threatened squares: 3px per threat (1 threat = 3px, 2 threats = 6px, etc)
        borderThickness = Math.min(threatCount * 3, 15);
    }
    
    highlight.css({
        position: 'absolute',
        top: position.top + 'px',
        left: position.left + 'px',
        width: $square.width() + 'px',
        height: $square.height() + 'px',
        pointerEvents: 'none',
        zIndex: 3, // Lower z-index to not interfere with pieces
        borderWidth: borderThickness + 'px',
        boxSizing: 'border-box'
    });
    
    $board.append(highlight);
    return highlight;
}

function getPieceText(pieceType) {
    return STRINGS[lang].pieces[pieceType] || pieceType;
}

// Show color selection modal
function showColorSelectionModal() {
    $('#colorModal').show();
}

// Start new game with selected color
function startNewGame(color) {
    playerColor = color;
    
    // Hide modal
    $('#colorModal').hide();
    
    // Reset game
    game.reset();
    
    // Set board orientation based on player color
    board.orientation(color);
    board.start();
    
    hintsUsed = 0;
    updateHintInfo();
    clearSquareThreats();
    
    // Turn off threat toggle on new game
    setThreatMode(false);
    
    updateStatus();
    updateCapturedPieces();
    
    
    // If player chose black, computer makes first move
    if (color === 'black') {
        setTimeout(makeComputerMove, 1000);
    }
}

// Save game functionality
function saveGame() {
    if (game.history().length === 0) {
        alert(t('noGameToSave'));
        return;
    }
    
    const gameState = {
        fen: game.fen(),
        playerColor: playerColor,
        difficulty: difficulty,
        pgn: game.pgn(), // full move list, so captured pieces and undo survive a reload
        timestamp: new Date().toLocaleString(lang === 'he' ? 'he-IL' : 'en-US'),
        moves: game.history().length
    };
    
    // Save to localStorage
    const savedGames = JSON.parse(localStorage.getItem('chessGames') || '[]');
    
    // Add the new game with a unique ID
    gameState.id = Date.now();
    gameState.name = t('savedName', { n: gameState.moves, time: gameState.timestamp });
    savedGames.push(gameState);
    
    // Keep only the last 10 saved games
    if (savedGames.length > 10) {
        savedGames.shift();
    }
    
    localStorage.setItem('chessGames', JSON.stringify(savedGames));
    
    alert(t('saved', { name: gameState.name }));
}

// Load game functionality
function loadGame() {
    const savedGames = JSON.parse(localStorage.getItem('chessGames') || '[]');
    
    if (savedGames.length === 0) {
        alert(t('noSavedGames'));
        return;
    }
    
    // Create selection dialog
    let options = t('pickSave') + '\n\n';
    savedGames.forEach((game, index) => {
        options += `${index + 1}. ${game.name}\n`;
    });
    options += '\n' + t('enterNumber', { n: savedGames.length });
    
    const choice = prompt(options);
    
    if (!choice) return; // User cancelled
    
    const gameIndex = parseInt(choice) - 1;
    
    if (gameIndex < 0 || gameIndex >= savedGames.length || isNaN(gameIndex)) {
        alert(t('badNumber'));
        return;
    }
    
    const savedGame = savedGames[gameIndex];
    
    // Confirm loading
    if (!confirm(t('confirmLoad', { name: savedGame.name }))) {
        return;
    }
    
    // Load the saved game state
    try {
        if (!(savedGame.pgn && game.load_pgn(savedGame.pgn))) game.load(savedGame.fen); // older saves have only the position
        playerColor = savedGame.playerColor;
        difficulty = LEVELS[savedGame.difficulty] ? savedGame.difficulty : 'beginner'; // old saves used 'easy'
        hintsUsed = 0;
        
        // Update board orientation and position
        board.orientation(playerColor);
        board.position(savedGame.fen);
        
        // Update UI
        $(`input[name="difficulty"][value="${difficulty}"]`).prop('checked', true);
        
        // Clear threats and update status
        clearSquareThreats();
        setThreatMode(false);
        
        updateStatus();
        updateCapturedPieces();
        updateHintInfo();
        showAutoHints();
        afterPlayerMove(); // saved while the computer was thinking: let it move

        alert(t('loaded', { name: savedGame.name }));
        
    } catch (error) {
        alert(t('loadError'));
        console.error('Load game error:', error);
    }
}
