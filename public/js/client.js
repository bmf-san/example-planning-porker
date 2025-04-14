// Socket.IOクライアントの初期化
const socket = io();

// DOM要素の取得
const joinScreen = document.getElementById('join-screen');
const roomScreen = document.getElementById('room-screen');
const roomIdInput = document.getElementById('room-id');
const userNameInput = document.getElementById('user-name');
const joinButton = document.getElementById('join-button');
const roomIdDisplay = document.getElementById('room-id-display');
const userNameDisplay = document.getElementById('user-name-display');
const participantsList = document.getElementById('participants-list');
const cards = document.querySelectorAll('.card');
const selectedValueSpan = document.getElementById('selected-value');
const revealButton = document.getElementById('reveal-button');
const resetButton = document.getElementById('reset-button');
const resultsContainer = document.getElementById('results-container');

// 状態変数
let currentRoomId = null;
let currentUserName = null;
let selectedValue = null;

// ルームに参加するイベントハンドラ
joinButton.addEventListener('click', () => {
  const roomId = roomIdInput.value.trim();
  const userName = userNameInput.value.trim();

  if (!roomId) {
    alert('ルームIDを入力してください');
    return;
  }

  if (!userName) {
    alert('ユーザー名を入力してください');
    return;
  }

  // グローバル変数に保存
  currentRoomId = roomId;
  currentUserName = userName;

  // 画面表示を更新
  roomIdDisplay.textContent = roomId;
  userNameDisplay.textContent = userName;

  // ルームに参加
  socket.emit('joinRoom', { roomId, userName });

  // 画面切り替え
  joinScreen.style.display = 'none';
  roomScreen.style.display = 'block';
});

// カード選択イベントハンドラ
cards.forEach(card => {
  card.addEventListener('click', () => {
    const value = parseInt(card.getAttribute('data-value'));

    // 既に選択済みのカードのスタイルをリセット
    cards.forEach(c => c.classList.remove('selected'));

    // 選択したカードにスタイルを適用
    card.classList.add('selected');

    // 選択した値を表示
    selectedValue = value;
    selectedValueSpan.textContent = value;

    // サーバーに投票を送信
    socket.emit('vote', { roomId: currentRoomId, value: selectedValue });
  });
});

// 結果公開ボタンのイベントハンドラ
revealButton.addEventListener('click', () => {
  socket.emit('reveal', currentRoomId);
});

// リセットボタンのイベントハンドラ
resetButton.addEventListener('click', () => {
  socket.emit('reset', currentRoomId);

  // カードの選択状態をリセット
  cards.forEach(card => card.classList.remove('selected'));
  selectedValue = null;
  selectedValueSpan.textContent = '未選択';
});

// ルーム情報更新イベントのハンドラ
socket.on('roomUpdate', (roomData) => {
  updateParticipantsList(roomData);
  updateResults(roomData);
});

// 参加者リストを更新する関数
function updateParticipantsList(roomData) {
  participantsList.innerHTML = '';

  Object.keys(roomData.users).forEach(userId => {
    const user = roomData.users[userId];
    const li = document.createElement('li');

    // 投票状態に応じて表示を変更
    if (user.vote === null) {
      li.textContent = `${user.name} (未投票)`;
    } else if (!roomData.revealed) {
      li.textContent = `${user.name} (投票済み)`;
    } else {
      li.textContent = `${user.name} (${user.vote})`;
    }

    participantsList.appendChild(li);
  });
}

// 結果表示を更新する関数
function updateResults(roomData) {
  resultsContainer.innerHTML = '';

  // 公開されていない場合は結果を隠す
  if (!roomData.revealed) {
    Object.keys(roomData.users).forEach(userId => {
      const user = roomData.users[userId];
      const card = document.createElement('div');
      card.className = 'result-card';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'name';
      nameDiv.textContent = user.name;

      const valueDiv = document.createElement('div');
      valueDiv.className = 'value';
      valueDiv.textContent = user.vote !== null ? '?' : '-';

      card.appendChild(nameDiv);
      card.appendChild(valueDiv);
      resultsContainer.appendChild(card);
    });
  } else {
    // 公開されている場合は結果を表示
    Object.keys(roomData.users).forEach(userId => {
      const user = roomData.users[userId];
      const card = document.createElement('div');
      card.className = 'result-card';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'name';
      nameDiv.textContent = user.name;

      const valueDiv = document.createElement('div');
      valueDiv.className = 'value';
      valueDiv.textContent = user.vote !== null ? user.vote : '-';

      card.appendChild(nameDiv);
      card.appendChild(valueDiv);
      resultsContainer.appendChild(card);
    });
  }
}