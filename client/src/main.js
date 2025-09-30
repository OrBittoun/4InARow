const socket = new WebSocket("ws://localhost:3000");
let playerNumber = null;
let currentPlayer = null;

socket.onopen = () => {
  console.log("Connected to server");

  const username = prompt("איך קוראים לך?") || "Player";
  socket.send(JSON.stringify({ type: "join", username }));
};

socket.onerror = (err) => {
  console.error("WebSocket error:", err);
};


socket.onmessage = (event) => {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    console.error("Failed to parse server message:", event.data);
    return;
  }

  console.log("From server:", data);

  if (data.type === "info") {
    document.getElementById("messages").innerText = data.message;
  } 
  
  else if (data.type === "startGame") {
    playerNumber = data.player;
    currentPlayer = data.currentPlayer;

    const bodyPic = document.getElementById("bodyBg");
    bodyPic.style.backgroundImage = "url('./pics/5.-Sammy-Offer-צלם-אלדד-אלוני-scaled.jpg')";

    const header = document.getElementById("header");
    header.innerText = "הדרבי יוצא לדרך!";

    document.getElementById("login").style.display = "none";
    document.getElementById("gameboard").style.display = "block";

    renderBoard(data.board);
    document.getElementById("messages").innerText =
      playerNumber === 1
        ? "אתה שחקן 1 (מכבי חיפה)"
        : "אתה שחקן 2 (הפועל חיפה)";
  } 
  
  else if (data.type === "error") {
    alert(data.error);
  } 
  
  else if (data.type === "winner") {
    renderBoard(data.board);
    if (data.winner === 1) {
      document.getElementById("maccabiModal").showModal();
    } else if (data.winner === 2) {
      document.getElementById("hapoelModal").showModal();
    }
  } 
  
  else if (data.type === "draw") {
    document.getElementById("drawModal").showModal();
  } 
  
  else {
    if (data.board) {
      currentPlayer = data.currentPlayer;
      renderBoard(data.board);
      
      const message = document.getElementById("messages");

      if (currentPlayer === playerNumber) {
        message.innerText = "התור שלך!";
        message.className = "your-turn";
      } else {
        message.innerText = "מחכים ליריב...";
        message.className = "waiting";
      }
    }
  }
};


socket.onclose = () => {
  console.log("Connection closed");
};


document.getElementById("joinBtn").onclick = () => {
  
  if (playerNumber === null) {
    alert("ממתינים לשחקן נוסף...");
  } else {
    alert("המשחק מתחיל!");
  }
};
;

function renderBoard(board) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  const table = document.createElement("table");
  table.classList.add("board");

  for (let i = 0; i < board.length; i++) {
    const row = document.createElement("tr");
    for (let j = 0; j < board[i].length; j++) {
      const cell = document.createElement("td");
      cell.classList.add("cell");
      cell.onclick=() => { socket.send(JSON.stringify({ column: j }));
      }

      if (board[i][j] === 1) {
        cell.innerHTML = "<img src='pics/סמל_מכבי_חיפה_2023.png' width='40' height='40' >";
      } else if (board[i][j] === 2) {
        cell.innerHTML = "<img src='pics/Hapoel_Haifa_Football_Club_Logo.png' width='40' height='40'>";
      } else {
        cell.innerHTML = "⚪";
      }

      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  boardDiv.appendChild(table);
}

document.querySelectorAll(".newGameBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.reload();
  });
});




