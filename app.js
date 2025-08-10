// Initialize chess game and board
let game = new Chess();
let board = null;
let $board = $('#board');
let showThreats = false; // Start with threats off
let debugMode = false; // Set to true to see debug info
let moveHistory = [];
let gameMode = 'computer'; // Always play against computer
let difficulty = 'easy'; // 'easy', 'medium', 'hard'
let isComputerTurn = false;
let selectedSquare = null; // For tap-to-see-threats feature
let showingSquareThreats = false;
let playerColor = 'white'; // Player's color choice

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
        }
    });
    $('input[name="difficulty"]').on('change', function() {
        difficulty = this.value;
    });
    
    // Modal event listeners
    $('#playWhite').on('click', () => startNewGame('white'));
    $('#playBlack').on('click', () => startNewGame('black'));
});

// Check if a piece can be dragged
function onDragStart(source, piece, position, orientation) {
    // Don't allow moves if game is over
    if (game.game_over()) return false;
    
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

// Handle piece drop
function onDrop(source, target) {
    // Save current position for undo
    moveHistory.push(game.fen());
    
    // Try to make the move
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });
    
    // If illegal move, snap back
    if (move === null) {
        moveHistory.pop();
        return 'snapback';
    }
    
    updateStatus();
    updateCapturedPieces();
    
    // Clear any threat displays after a move
    clearSquareThreats();
    
    // If it's computer's turn, make computer move
    if (gameMode === 'computer' && game.turn() === 'b' && !game.game_over()) {
        setTimeout(makeComputerMove, 500); // Small delay for better UX
    }
}

// Update board position after the piece snap
function onSnapEnd() {
    board.position(game.fen());
    // Re-add click handlers after board update
    setTimeout(() => addSquareClickHandlers(), 100);
}

// Reset the game
function resetGame() {
    game.reset();
    board.start();
    moveHistory = [];
    clearSquareThreats();
    
    // Turn off threat toggle on new game
    showThreats = false;
    $('#showThreats').prop('checked', false);
    
    updateStatus();
    updateCapturedPieces();
    // Re-add click handlers after board reset
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
    
    let selectedMove;
    
    switch (difficulty) {
        case 'easy':
            selectedMove = getRandomMove(moves);
            break;
        case 'medium':
            selectedMove = getMediumMove(moves);
            break;
        case 'hard':
            selectedMove = getHardMove(moves);
            break;
        default:
            selectedMove = getRandomMove(moves);
    }
    
    // Make the move
    if (selectedMove) {
        game.move(selectedMove);
        board.position(game.fen());
        
        updateStatus();
        updateCapturedPieces();
        // Re-add click handlers after board update
        setTimeout(() => addSquareClickHandlers(), 100);
    }
    
    isComputerTurn = false;
}

// Easy: Random move
function getRandomMove(moves) {
    return moves[Math.floor(Math.random() * moves.length)];
}

// Medium: Prefer captures and checks
function getMediumMove(moves) {
    // First priority: captures
    const captures = moves.filter(move => move.captured);
    if (captures.length > 0) {
        return captures[Math.floor(Math.random() * captures.length)];
    }
    
    // Second priority: checks
    const checks = moves.filter(move => {
        game.move(move);
        const inCheck = game.in_check();
        game.undo();
        return inCheck;
    });
    if (checks.length > 0) {
        return checks[Math.floor(Math.random() * checks.length)];
    }
    
    // Otherwise random
    return getRandomMove(moves);
}

// Hard: Try to find best moves (simple evaluation)
function getHardMove(moves) {
    let bestMoves = [];
    let bestScore = -Infinity;
    
    moves.forEach(move => {
        game.move(move);
        let score = evaluatePosition();
        
        if (score > bestScore) {
            bestScore = score;
            bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }
        
        game.undo();
    });
    
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Simple position evaluation
function evaluatePosition() {
    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };
    
    let score = 0;
    const boardArray = game.board();
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardArray[row][col];
            if (piece) {
                const value = pieceValues[piece.type] || 0;
                if (piece.color === 'b') {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }
    }
    
    // Bonus for checkmate
    if (game.in_checkmate()) {
        score += game.turn() === 'w' ? 1000 : -1000;
    }
    
    // Bonus for check
    if (game.in_check()) {
        score += game.turn() === 'w' ? -10 : 10;
    }
    
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
                // Only show threats if the toggle is enabled
                if (!showThreats) return;
                
                // Show threats and automatically disable toggle
                showThreatsToSquare(square);
            });
        }
    }
}

function showThreatsToSquare(square) {
    clearSquareThreats();
    selectedSquare = square;
    showingSquareThreats = true;
    
    // Find all pieces that can attack this square
    const attackers = getSquareAttackers(square);
    
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

function getSquareAttackers(square) {
    const attackers = [];
    const currentPlayer = game.turn();
    const opponent = currentPlayer === 'w' ? 'b' : 'w';
    
    // We need to check what opponent pieces are DEFENDING this square
    // This means: if we put a piece there, what could capture it?
    
    // Save current game state
    const originalFen = game.fen();
    
    // Get all opponent pieces and check if they can attack this square
    const board = game.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === opponent) {
                const fromSquare = String.fromCharCode(97 + col) + (8 - row);
                
                // Check if this piece defends/can attack the target square
                if (canPieceDefendSquare(piece, fromSquare, square, opponent)) {
                    attackers.push(fromSquare);
                }
            }
        }
    }
    
    return attackers;
}

// Helper function to check if a piece can defend/attack a square
function canPieceDefendSquare(piece, from, to, color) {
    // We need to check if this piece CONTROLS the square (can attack it)
    // regardless of what's currently on the target square
    
    // Special handling for pawns - they control diagonal squares
    if (piece.type === 'p') {
        const fromFile = from.charCodeAt(0);
        const fromRank = parseInt(from[1]);
        const toFile = to.charCodeAt(0);
        const toRank = parseInt(to[1]);
        
        // Check if it's a diagonal attack (one file away, one rank in correct direction)
        const fileDiff = Math.abs(toFile - fromFile);
        const rankDiff = toRank - fromRank;
        
        if (color === 'w') {
            // White pawns control diagonally upward squares
            return fileDiff === 1 && rankDiff === 1;
        } else {
            // Black pawns control diagonally downward squares  
            return fileDiff === 1 && rankDiff === -1;
        }
    }
    
    // For other pieces, we need to check if they can attack that square
    // We'll temporarily place an enemy piece there and see if they can capture it
    const originalFen = game.fen();
    
    try {
        // Create a temporary position with an enemy piece on the target square
        const tempGame = new Chess(originalFen);
        
        // Remove whatever is on the target square
        const targetPiece = tempGame.get(to);
        if (targetPiece) {
            tempGame.remove(to);
        }
        
        // Place an enemy piece there (opposite color to the attacking piece)
        const enemyColor = color === 'w' ? 'b' : 'w';
        tempGame.put({ type: 'p', color: enemyColor }, to);
        
        // Switch turns to the attacking piece's color
        const fenParts = tempGame.fen().split(' ');
        fenParts[1] = color;
        const testFen = fenParts.join(' ');
        
        tempGame.load(testFen);
        
        // Try to capture the piece on the target square
        const move = tempGame.move({
            from: from,
            to: to,
            promotion: 'q'
        });
        
        return move !== null;
        
    } catch (e) {
        // Something went wrong, return false
        return false;
    }
}

function clearSquareThreats() {
    $('.square-highlight').remove();
    selectedSquare = null;
    showingSquareThreats = false;
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
        difficulty = savedGame.difficulty;
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
        
        // Re-add click handlers
        setTimeout(() => addSquareClickHandlers(), 100);
        
        alert(`המשחק נטען בהצלחה!\n${savedGame.name}`);
        
    } catch (error) {
        alert('שגיאה בטעינת המשחק. הקובץ עלול להיות פגום.');
        console.error('Load game error:', error);
    }
}
