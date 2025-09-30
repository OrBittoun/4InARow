const http = require("http");
const WebSocket = require("ws");
const pool = require("./db");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let waitingPlayer = null;

wss.on("connection", (ws) => {
  console.log("A player connected");

  ws.send(JSON.stringify({ type: "info", message: "Welcome to Four In A Row!" }));

  ws.on("message", async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("Invalid message:", msg);
      return;
    }

    if (data.type === "join") {
      try {
        const [result] = await pool.query(
          "INSERT INTO players (username) VALUES (?)",
          [data.username || "Player"]
        );
        ws.playerId = result.insertId;

        console.log("Player joined:", data.username, "ID:", ws.playerId);

        if (waitingPlayer === null) {
          waitingPlayer = ws;
          ws.send(JSON.stringify({ type: "info", message: "ממתינים לשחקן נוסף..." }));
        } else {
          console.log("starting game...");

          const player1 = waitingPlayer;
          const player2 = ws;
          waitingPlayer = null;

          const [gameResult] = await pool.query(
            "INSERT INTO games (player1_id, player2_id) VALUES (?, ?)",
            [player1.playerId, player2.playerId]
          );

          const gameId = gameResult.insertId;
          player1.gameId = gameId;
          player2.gameId = gameId;

          // יצירת לוח
          const board = Array.from({ length: 6 }, () => Array(7).fill(null));
          let currentPlayer = 1;

          player1.send(JSON.stringify({ type: "startGame", player: 1, board, currentPlayer }));
          player2.send(JSON.stringify({ type: "startGame", player: 2, board, currentPlayer }));

          player1.on("message", (msg) => {
            handleMove(msg, 1, player1, player2, board, () => { currentPlayer = 2; }, () => currentPlayer, gameId);
          });

          player2.on("message", (msg) => {
            handleMove(msg, 2, player2, player1, board, () => { currentPlayer = 1; }, () => currentPlayer, gameId);
          });
        }
      } catch (err) {
        console.error("DB error on join:", err);
      }
    }
  });
});

const port = 3000;
server.listen(port, () =>
  console.log(`WebSocket server listening on ws://localhost:${port}`)
);

async function handleMove(msg, playerId, currentWS, opponentWS, board, switchTurn, getCurrent, gameId) {
  let data;
  try {
    data = JSON.parse(msg);
  } catch (err) {
    console.error("Invalid move message:", msg);
    return;
  }

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

          try {
            await pool.query("UPDATE games SET winner_id = ? WHERE game_id = ?", [currentWS.playerId, gameId]);
          } catch (err) {
            console.error("DB error updating winner:", err);
          }

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
          board[i][j + 1] === player &&
          board[i][j + 2] === player &&
          board[i][j + 3] === player) return true;

        if (i + 3 < 6 &&
          board[i + 1][j] === player &&
          board[i + 2][j] === player &&
          board[i + 3][j] === player) return true;

        if (i + 3 < 6 && j + 3 < 7 &&
          board[i + 1][j + 1] === player &&
          board[i + 2][j + 2] === player &&
          board[i + 3][j + 3] === player) return true;

        if (i + 3 < 6 && j - 3 >= 0 &&
          board[i + 1][j - 1] === player &&
          board[i + 2][j - 2] === player &&
          board[i + 3][j - 3] === player) return true;
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
