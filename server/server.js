const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let waitingPlayer = null;

wss.on("connection", (ws) => {
  console.log("A player connected");


  ws.send(JSON.stringify({ type: "info", message: "Welcome to Four In A Row!" }));

  if (waitingPlayer === null) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ type: "info", message: "We're waiting for another player!" }));
  } else {
    console.log("starting game...");

    const player1 = waitingPlayer;
    const player2 = ws;
    waitingPlayer = null;


    const board = [];

  for (let i = 0; i < 6; i++) {
    const row = [];
    for (let j = 0; j < 7; j++) {
     row.push(null);
  }

  board.push(row);
}

    let currentPlayer = 1;


    player1.send(JSON.stringify({ type: "startGame", player: 1, board, currentPlayer }));
    player2.send(JSON.stringify({ type: "startGame", player: 2, board, currentPlayer }));


    player1.on("message", (msg) => {
      handleMove(msg, 1, player1, player2, board, () => { currentPlayer = 2; }, () => currentPlayer);
    });


    player2.on("message", (msg) => {
      handleMove(msg, 2, player2, player1, board, () => { currentPlayer = 1; }, () => currentPlayer);
    });
  }
});

const port = 3000;
server.listen(port, () =>
  console.log(`WebSocket server listening on ws://localhost:${port}`)
);

function handleMove(msg, playerId, currentWS, opponentWS, board, switchTurn, getCurrent) {
  let data = JSON.parse(msg);

  if (data.column !== undefined) {
    if (getCurrent() !== playerId) {
      currentWS.send(JSON.stringify({ type: "error", error: "זה לא התור שלך!" }));
      return;
    }

    let chosenColumn = data.column;
    let placed = false;

    for (let row = 5; row >= 0; row--) {
      if (board[row][chosenColumn] === null) {
        board[row][chosenColumn] = playerId;
        placed = true;

        if (checkWin(board, playerId)) {
          const winMessage = {
            type: "winner",
            winner: playerId,
            board,
            message: playerId === 1 ? "!חיפה של מכבי" : "!הדרבי הוא אדום"
          };
          currentWS.send(JSON.stringify(winMessage));
          opponentWS.send(JSON.stringify(winMessage));
          return;
        }
        break;
      }
    }

    if (isDraw(board)) {
      const drawMsg = { type: "draw", message: "..תיקו שכולו הפסד" };
      currentWS.send(JSON.stringify(drawMsg));
      opponentWS.send(JSON.stringify(drawMsg));
      return;
    }

    if (!placed) {
      currentWS.send(JSON.stringify({ type: "error", error: "העמודה מלאה" }));
      return;
    }

    switchTurn();
    const gameState = { type: "update", board, currentPlayer: getCurrent() };
    currentWS.send(JSON.stringify(gameState));
    opponentWS.send(JSON.stringify(gameState));
  }
}


function checkWin(board, player) {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      if (board[i][j] === player) {

        if (j + 3 < 7 &&
            board[i][j+1] === player &&
            board[i][j+2] === player &&
            board[i][j+3] === player) return true;

            if (i + 3 < 6 &&
            board[i+1][j] === player &&
            board[i+2][j] === player &&
            board[i+3][j] === player) return true;

            if (i + 3 < 6 && j + 3 < 7 &&
            board[i+1][j+1] === player &&
            board[i+2][j+2] === player &&
            board[i+3][j+3] === player) return true;

        if (i + 3 < 6 && j - 3 >= 0 &&
            board[i+1][j-1] === player &&
            board[i+2][j-2] === player &&
            board[i+3][j-3] === player) return true;
      }
    }
  }
  return false;
}

function isDraw(board) {
  for (let col = 0; col < 7; col++) {
    if (board[0][col] === null) {
      return false; 
    }
  }
  return true; 
}

