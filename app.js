// Initialize chess game and board
let game = new Chess();
let board = null;
let $board = $('#board');
let showThreats = false; // Start with threats off
let debugMode = false; // Set to true to see debug info
let moveHistory = [];
let gameMode = 'computer'; // Always play against computer
let difficulty = 'beginner'; // key of LEVELS
let isComputerTurn = false;
let hintsUsed = 0; // threat hints used this game (limited on higher levels)

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
    updateStatus();
    
    // Add click handlers to board squares for tap-to-see-threats
    setTimeout(() => {
        addSquareClickHandlers();
    }, 1000);
    
    // Event listeners
    $('#resetBtn').on('click', showColorSelectionModal);
    $('#undoBtn').on('click', undoMove);
    $('#saveBtn').on('click', saveGame);
    $('#loadBtn').on('click', loadGame);
    $('#showThreats').on('change', function() {
        showThreats = this.checked;
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
    updateHintInfo();

    // Modal event listeners
    $('#playWhite').on('click', () => startNewGame('white'));
    $('#playBlack').on('click', () => startNewGame('black'));
    $('#warnKeep').on('click', keepWarnedMove);
    $('#warnUndo').on('click', takeBackWarnedMove);
});

// Check if a piece can be dragged
function onDragStart(source, piece, position, orientation) {
    // Don't allow moves if game is over
    if (game.game_over()) return false;

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

    // Save current position for undo
    moveHistory.push(game.fen());

    // Try to make the move
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (move === null) {
        moveHistory.pop();
        return false;
    }

    updateStatus();
    updateCapturedPieces();

    // Clear any threat displays after a move
    clearSquareThreats();

    // Lower levels: ask before a move that leaves a piece to be captured (an even-or-better trade doesn't count)
    if (LEVELS[difficulty].warnBlunders && !game.game_over()) {
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
    if (gameMode === 'computer' && game.turn() === computerColor && !game.game_over()) {
        setTimeout(makeComputerMove, 500); // Small delay for better UX
    }
}

function showBlunderWarning(squares) {
    const enemy = game.turn();
    const names = squares.map(sq => 'ה' + getPieceText(game.get(sq).type) + ' (' + sq + ')').join(', ');
    $('#warnText').text('אחרי המהלך הזה המחשב יכול לאכול את ' + names + '. להמשיך?');
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
    moveHistory.pop();
    board.position(game.fen());
    clearSquareThreats();
    updateStatus();
    updateCapturedPieces();
    showAutoHints();
    setTimeout(() => addSquareClickHandlers(), 100);
}

// Update board position after the piece snap
function onSnapEnd() {
    board.position(game.fen());
    // Re-add click handlers after board update
    setTimeout(() => addSquareClickHandlers(), 100);
}

// Undo last move
function undoMove() {
    if (moveHistory.length > 0) {
        game.load(moveHistory.pop());
        board.position(game.fen());
        clearSquareThreats();
        updateStatus();
        updateCapturedPieces();
        showAutoHints();
        // Re-add click handlers after board update
        setTimeout(() => addSquareClickHandlers(), 100);
    }
}

// Update game status display
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'w' ? 'לבן' : 'שחור';
    let isWhiteTurn = game.turn() === 'w';
    
    // Update turn icon and text
    $('#currentTurnIcon').html(isWhiteTurn ? '♕' : '♛'); // White queen vs Black queen
    $('#currentTurnIcon').css('color', isWhiteTurn ? '#fff' : '#000');
    $('#currentTurnIcon').css('text-shadow', isWhiteTurn ? '1px 1px 2px #000' : '1px 1px 2px #fff');
    $('#currentTurnText').html('תור ה' + moveColor);
    
    // Checkmate
    if (game.in_checkmate()) {
        status = 'המשחק נגמר! ' + (game.turn() === 'w' ? 'שחור' : 'לבן') + ' ניצח! 🎉';
    }
    // Draw
    else if (game.in_draw()) {
        status = 'המשחק נגמר - תיקו! 🤝';
    }
    // Check
    else if (game.in_check()) {
        status = '⚠️ ' + moveColor + ' בשח!';
    }
    // Game still on
    else {
        status = '';
    }
    
    $('#gameStatus').html(status);
}

// Removed old threat visualization functions - now using tap-to-see-threats only

// Update captured pieces display
function updateCapturedPieces() {
    const captured = getCapturedPieces();
    
    // Display captured white pieces (with white symbols)
    const whiteSymbols = captured.white.map(p => getPieceSymbol(p, 'white')).join(' ');
    $('#whiteCaptured').html(whiteSymbols ? 'לבן שנלכד: ' + whiteSymbols : '');
    
    // Display captured black pieces (with black symbols)
    const blackSymbols = captured.black.map(p => getPieceSymbol(p, 'black')).join(' ');
    $('#blackCaptured').html(blackSymbols ? 'שחור שנלכד: ' + blackSymbols : '');
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
    if (game.game_over() || game.turn() !== computerColor) return;
    
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
        // Re-add click handlers after board update
        setTimeout(() => addSquareClickHandlers(), 100);
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
function addSquareClickHandlers() {
    // Add click handlers to all squares - much simpler now since toggle turns off after use
    for (let file of 'abcdefgh') {
        for (let rank of '12345678') {
            const square = file + rank;
            const $square = $board.find('.square-' + square);
            
            $square.off('click').on('click', function(e) {
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
            });
        }
    }
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
        
        // Show info about threats
        const piece = game.get(square);
        const pieceText = piece ? `${piece.color === 'w' ? 'לבן' : 'שחור'} ${getPieceText(piece.type)}` : 'ריק';
        const currentPlayer = game.turn();
        const opponentText = currentPlayer === 'w' ? 'שחור' : 'לבן';
        console.log(`כיכר ${square} (${pieceText}) מאוימת על ידי ${attackers.length} כלים ${opponentText}:`, attackers);
    } else {
        // No threats - just show blue selection
        addSquareHighlight(square, 'selected-square', 0);
        
        const currentPlayer = game.turn();
        const opponentText = currentPlayer === 'w' ? 'שחור' : 'לבן';
        console.log(`כיכר ${square} לא מאוימת על ידי כלים ${opponentText}`);
    }
    
    // Turn off the toggle after showing threats (makes kid "work" for the hint)
    showThreats = false;
    $('#showThreats').prop('checked', false);
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

// Hint budget per level; the toggle is disabled when it runs out
function updateHintInfo() {
    const level = LEVELS[difficulty];
    const left = level.hintLimit - hintsUsed;
    $('#showThreats').prop('disabled', left <= 0);
    let text;
    if (level.hintLimit === Infinity) text = 'הפעילו ואז לחצו על ריבוע לרמז. הרמז נסגר אוטומטית.';
    else if (level.hintLimit === 0) text = 'ברמה קשה אין רמזים - בדקו לבד! 💪';
    else if (left > 0) text = `נשארו ${left} רמזים במשחק הזה. הפעילו ואז לחצו על ריבוע.`;
    else text = 'נגמרו הרמזים למשחק הזה 💪';
    if (level.autoHints) text += ' ברמת מתחיל כלים שלכם בסכנה מסומנים באדום.';
    $('#hintInfo').text(text);
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
}

function getPieceText(pieceType) {
    const pieces = {
        'p': 'רגלי',
        'n': 'סוס',
        'b': 'רץ',
        'r': 'צריח',
        'q': 'מלכה',
        'k': 'מלך'
    };
    return pieces[pieceType] || pieceType;
}

// Toggle collapsible difficulty section
window.toggleDifficulty = function() {
    const selector = document.getElementById('difficultySelector');
    const arrow = document.getElementById('collapseArrow');
    
    if (selector.classList.contains('collapsed')) {
        selector.classList.remove('collapsed');
        arrow.textContent = '▲';
    } else {
        selector.classList.add('collapsed'); 
        arrow.textContent = '▼';
    }
}

window.toggleInstructions = function() {
    const content = document.getElementById('instructionsContent');
    const arrow = document.getElementById('instructionsArrow');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        arrow.textContent = '▲';
    } else {
        content.classList.add('collapsed'); 
        arrow.textContent = '▼';
    }
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
    
    moveHistory = [];
    hintsUsed = 0;
    updateHintInfo();
    clearSquareThreats();
    
    // Turn off threat toggle on new game
    showThreats = false;
    $('#showThreats').prop('checked', false);
    
    updateStatus();
    updateCapturedPieces();
    
    // Re-add click handlers after board reset
    setTimeout(() => addSquareClickHandlers(), 100);
    
    // If player chose black, computer makes first move
    if (color === 'black') {
        setTimeout(makeComputerMove, 1000);
    }
}

// Save game functionality
function saveGame() {
    if (game.history().length === 0) {
        alert('אין משחק לשמירה - התחילו משחק חדש תחילה!');
        return;
    }
    
    const gameState = {
        fen: game.fen(),
        playerColor: playerColor,
        difficulty: difficulty,
        moveHistory: [...moveHistory],
        timestamp: new Date().toLocaleString('he-IL'),
        moves: game.history().length
    };
    
    // Save to localStorage
    const savedGames = JSON.parse(localStorage.getItem('chessGames') || '[]');
    
    // Add the new game with a unique ID
    gameState.id = Date.now();
    gameState.name = `משחק ${gameState.moves} מהלכים - ${gameState.timestamp}`;
    savedGames.push(gameState);
    
    // Keep only the last 10 saved games
    if (savedGames.length > 10) {
        savedGames.shift();
    }
    
    localStorage.setItem('chessGames', JSON.stringify(savedGames));
    
    alert(`המשחק נשמר בהצלחה! \n${gameState.name}`);
}

// Load game functionality
function loadGame() {
    const savedGames = JSON.parse(localStorage.getItem('chessGames') || '[]');
    
    if (savedGames.length === 0) {
        alert('אין משחקים שמורים!');
        return;
    }
    
    // Create selection dialog
    let options = 'בחרו משחק לטעינה:\n\n';
    savedGames.forEach((game, index) => {
        options += `${index + 1}. ${game.name}\n`;
    });
    options += '\nהזינו מספר (1-' + savedGames.length + ') או לחצו Cancel לביטול:';
    
    const choice = prompt(options);
    
    if (!choice) return; // User cancelled
    
    const gameIndex = parseInt(choice) - 1;
    
    if (gameIndex < 0 || gameIndex >= savedGames.length || isNaN(gameIndex)) {
        alert('מספר לא תקין!');
        return;
    }
    
    const savedGame = savedGames[gameIndex];
    
    // Confirm loading
    if (!confirm(`לטעון את המשחק:\n${savedGame.name}?\n\nהמשחק הנוכחי יאבד!`)) {
        return;
    }
    
    // Load the saved game state
    try {
        game.load(savedGame.fen);
        playerColor = savedGame.playerColor;
        difficulty = LEVELS[savedGame.difficulty] ? savedGame.difficulty : 'beginner'; // old saves used 'easy'
        hintsUsed = 0;
        moveHistory = [...savedGame.moveHistory];
        
        // Update board orientation and position
        board.orientation(playerColor);
        board.position(savedGame.fen);
        
        // Update UI
        $(`input[name="difficulty"][value="${difficulty}"]`).prop('checked', true);
        
        // Clear threats and update status
        clearSquareThreats();
        showThreats = false;
        $('#showThreats').prop('checked', false);
        
        updateStatus();
        updateCapturedPieces();
        updateHintInfo();
        showAutoHints();
        
        // Re-add click handlers
        setTimeout(() => addSquareClickHandlers(), 100);
        
        alert(`המשחק נטען בהצלחה!\n${savedGame.name}`);
        
    } catch (error) {
        alert('שגיאה בטעינת המשחק. הקובץ עלול להיות פגום.');
        console.error('Load game error:', error);
    }
}
