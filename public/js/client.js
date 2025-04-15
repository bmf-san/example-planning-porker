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
const shareButton = document.getElementById('share-button');
const topicArea = document.getElementById('topic-area');
const topicInput = document.getElementById('topic-input');
const setTopicButton = document.getElementById('set-topic-button');
const currentTopicDisplay = document.getElementById('current-topic-display');
const historyContainer = document.getElementById('history-container');
const helpButton = document.getElementById('help-button');
const guideModal = document.getElementById('guide-modal');
const closeModal = document.querySelector('.close-modal');

// 状態変数
let currentRoomId = null;
let currentUserName = null;
let selectedValue = null;

// 自分がホストかどうかのフラグ
let isHost = false;

// ヘルプボタンクリックでモーダルを表示
helpButton.addEventListener('click', () => {
  guideModal.style.display = 'block';
  // モーダルが表示されたときはスクロールを無効にする
  document.body.style.overflow = 'hidden';
});

// 閉じるボタンクリックでモーダルを非表示
closeModal.addEventListener('click', () => {
  guideModal.style.display = 'none';
  // モーダルが閉じられたときはスクロールを有効に戻す
  document.body.style.overflow = 'auto';
});

// モーダル外クリックでモーダルを閉じる
window.addEventListener('click', (event) => {
  if (event.target === guideModal) {
    guideModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// Escキーでモーダルを閉じる
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && guideModal.style.display === 'block') {
    guideModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// ページリロード時の確認ダイアログ
window.addEventListener('beforeunload', (event) => {
  // ルーム画面が表示されている場合のみ確認ダイアログを表示
  if (roomScreen.style.display !== 'none') {
    event.preventDefault();
    // Chrome では returnValue を設定する必要がある
    event.returnValue = 'ページを離れると、部屋から退出します。よろしいですか？';
    return event.returnValue;
  }
});

// ページ読み込み時にURLパラメータからルームIDを取得
document.addEventListener('DOMContentLoaded', () => {
  // URLパラメータを解析
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdParam = urlParams.get('room');

  // ルームIDがURLパラメータに存在する場合、入力欄に設定
  if (roomIdParam) {
    roomIdInput.value = roomIdParam;
  }
});

// 共有リンクをコピーするボタンの処理
shareButton.addEventListener('click', () => {
  // 現在のURLにルームIDをパラメータとして追加
  const url = new URL(window.location.href);
  url.search = `?room=${currentRoomId}`;

  // クリップボードにコピー
  navigator.clipboard.writeText(url.href)
    .then(() => {
      // 成功時にボタンのテキストを一時的に変更
      const originalText = shareButton.textContent;
      shareButton.textContent = 'コピーしました！';
      setTimeout(() => {
        shareButton.textContent = originalText;
      }, 2000);
    })
    .catch(err => {
      console.error('クリップボードへのコピーに失敗しました:', err);
      alert('リンクのコピーに失敗しました。');
    });
});

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

    // 既に同じカードが選択されていれば選択解除
    if (selectedValue === value) {
      card.classList.remove('selected');
      selectedValue = null;
      selectedValueSpan.textContent = '未選択';

      // サーバーに投票取り消しを送信
      socket.emit('vote', { roomId: currentRoomId, value: null });
      return;
    }

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

// リセットボタン（投票終了ボタン）のイベントハンドラ
resetButton.addEventListener('click', () => {
  socket.emit('reset', currentRoomId);

  // カードの選択状態をリセット
  cards.forEach(card => card.classList.remove('selected'));
  selectedValue = null;
  selectedValueSpan.textContent = '未選択';

  // ホストの場合、トピック入力欄もクリア
  if (isHost) {
    topicInput.value = '';
  }
});

// ルーム情報更新イベントのハンドラ
socket.on('roomUpdate', (roomData) => {
  // 自分がホストかどうかを確認
  if (roomData.users[socket.id]) {
    isHost = roomData.users[socket.id].isHost;

    // ホストの場合、UIに表示とトピック設定エリアを表示
    if (isHost) {
      userNameDisplay.textContent = `${currentUserName} (ホスト)`;
      topicArea.style.display = 'block';
      // ホストの場合はボタンを有効化
      revealButton.disabled = false;
      resetButton.disabled = false;
    } else {
      topicArea.style.display = 'none';
      // ホスト以外の場合はボタンを無効化
      revealButton.disabled = true;
      resetButton.disabled = true;
    }
  }

  // 現在のトピックを表示
  if (roomData.topic) {
    currentTopicDisplay.textContent = roomData.topic;
  } else {
    currentTopicDisplay.textContent = '（未設定）';
  }

  updateParticipantsList(roomData);
  updateResults(roomData);
  updateHistory(roomData);
});

// 参加者リストを更新する関数
function updateParticipantsList(roomData) {
  participantsList.innerHTML = '';

  Object.keys(roomData.users).forEach(userId => {
    const user = roomData.users[userId];
    const tr = document.createElement('tr');

    // ホストの場合は特別なスタイルを適用
    if (user.isHost) {
      tr.classList.add('host-user');
    }

    // 名前セル
    const nameCell = document.createElement('td');
    nameCell.className = 'participant-name';
    nameCell.textContent = user.isHost ? `${user.name} [ホスト]` : user.name;

    // 状態セル
    const statusCell = document.createElement('td');
    statusCell.className = 'participant-status';

    // 投票状態に応じて表示を変更
    if (user.vote === null) {
      statusCell.textContent = '未投票';
      statusCell.classList.add('status-not-voted');
    } else if (!roomData.revealed) {
      statusCell.textContent = '投票済み';
      statusCell.classList.add('status-voted');
    } else {
      statusCell.textContent = user.vote;
      statusCell.classList.add('status-revealed');
    }

    // 行に追加
    tr.appendChild(nameCell);
    tr.appendChild(statusCell);

    participantsList.appendChild(tr);
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

      // ホストの場合は特別なクラスを追加
      if (user.isHost) {
        card.classList.add('host-card');
      }

      const nameDiv = document.createElement('div');
      nameDiv.className = 'name';
      nameDiv.textContent = user.isHost ? `${user.name} [ホスト]` : user.name;

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

      // ホストの場合は特別なクラスを追加
      if (user.isHost) {
        card.classList.add('host-card');
      }

      const nameDiv = document.createElement('div');
      nameDiv.className = 'name';
      nameDiv.textContent = user.isHost ? `${user.name} [ホスト]` : user.name;

      const valueDiv = document.createElement('div');
      valueDiv.className = 'value';
      valueDiv.textContent = user.vote !== null ? user.vote : '-';

      card.appendChild(nameDiv);
      card.appendChild(valueDiv);
      resultsContainer.appendChild(card);
    });
  }
}

// トピック設定ボタンのイベントハンドラ
setTopicButton.addEventListener('click', () => {
  const topic = topicInput.value.trim();
  if (topic) {
    socket.emit('setTopic', { roomId: currentRoomId, topic });
    topicInput.value = '';
  }
});

// 履歴を更新する関数
function updateHistory(roomData) {
  historyContainer.innerHTML = '';

  // 履歴がない場合
  if (!roomData.history || roomData.history.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-history';
    emptyMessage.textContent = '履歴はまだありません';
    historyContainer.appendChild(emptyMessage);
    return;
  }

  // 履歴を新しい順に表示
  roomData.history.slice().reverse().forEach(historyItem => {
    const historyEntry = document.createElement('div');
    historyEntry.className = 'history-entry';

    // 履歴のヘッダー（トピックと日時）
    const historyHeader = document.createElement('div');
    historyHeader.className = 'history-header';

    const historyTopic = document.createElement('h4');
    historyTopic.textContent = historyItem.topic;

    const historyTime = document.createElement('span');
    historyTime.className = 'history-time';
    const date = new Date(historyItem.timestamp);
    historyTime.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

    historyHeader.appendChild(historyTopic);
    historyHeader.appendChild(historyTime);

    // 履歴の投票内容をテーブル形式で表示
    const historyVotes = document.createElement('div');
    historyVotes.className = 'history-votes';

    const votesTable = document.createElement('table');
    votesTable.className = 'history-votes-table';

    // テーブルヘッダー
    const tableHeader = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const nameHeader = document.createElement('th');
    nameHeader.textContent = 'ユーザー名';

    const voteHeader = document.createElement('th');
    voteHeader.textContent = '投票値';

    headerRow.appendChild(nameHeader);
    headerRow.appendChild(voteHeader);
    tableHeader.appendChild(headerRow);
    votesTable.appendChild(tableHeader);

    // テーブル本体
    const tableBody = document.createElement('tbody');

    Object.entries(historyItem.votes).forEach(([userName, vote]) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.className = 'history-user-name';
      nameCell.textContent = userName;

      const voteCell = document.createElement('td');
      voteCell.className = 'history-vote-value';
      voteCell.textContent = vote !== null ? vote : '未投票';

      row.appendChild(nameCell);
      row.appendChild(voteCell);
      tableBody.appendChild(row);
    });

    votesTable.appendChild(tableBody);
    historyVotes.appendChild(votesTable);

    // 履歴エントリーに追加
    historyEntry.appendChild(historyHeader);
    historyEntry.appendChild(historyVotes);

    historyContainer.appendChild(historyEntry);
  });
}

// サーバーからのエラーメッセージを受け取る
socket.on('error', (data) => {
  alert(data.message);
});