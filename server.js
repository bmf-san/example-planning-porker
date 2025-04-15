const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// ルーム情報を格納するオブジェクト
const rooms = {};

// Socket.IO接続ハンドラ
io.on('connection', (socket) => {
  console.log('ユーザーが接続しました:', socket.id);

  // ルーム参加
  socket.on('joinRoom', ({ roomId, userName }) => {
    socket.join(roomId);

    // ルームが存在しない場合は作成
    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: {},
        revealed: false,
        hostId: socket.id, // 最初に参加したユーザーをホストに設定
        topic: "", // 投票トピック（名前）を追加
        history: [] // 過去の投票結果履歴
      };
    }

    // ユーザー情報を保存
    rooms[roomId].users[socket.id] = {
      name: userName,
      vote: null,
      isHost: socket.id === rooms[roomId].hostId // ホストかどうかのフラグを設定
    };

    // ルーム情報を全員に送信
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
    console.log(`${userName}さんが${roomId}に参加しました${socket.id === rooms[roomId].hostId ? ' (ホスト)' : ''}`);
  });

  // 投票処理
  socket.on('vote', ({ roomId, value }) => {
    // ユーザーが所属するルームを確認
    if (rooms[roomId] && rooms[roomId].users[socket.id]) {
      rooms[roomId].users[socket.id].vote = value;
      // ルーム情報を全員に送信
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      console.log(`${rooms[roomId].users[socket.id].name}さんが投票しました: ${value}`);
    }
  });

  // 結果公開処理
  socket.on('reveal', (roomId) => {
    if (rooms[roomId] && rooms[roomId].users[socket.id] && rooms[roomId].users[socket.id].isHost) {
      rooms[roomId].revealed = true;
      // ルーム情報を全員に送信
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      console.log(`${roomId}の結果が公開されました`);
    } else {
      // ホスト以外が実行しようとした場合はエラーを返す
      socket.emit('error', { message: '結果の公開はホストのみが行えます' });
    }
  });

  // 投票トピック設定
  socket.on('setTopic', ({ roomId, topic }) => {
    if (rooms[roomId] && rooms[roomId].users[socket.id] && rooms[roomId].users[socket.id].isHost) {
      rooms[roomId].topic = topic;
      // ルーム情報を全員に送信
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      console.log(`${roomId}のトピックが「${topic}」に設定されました`);
    }
  });

  // 投票リセット
  socket.on('reset', (roomId) => {
    if (rooms[roomId] && rooms[roomId].users[socket.id] && rooms[roomId].users[socket.id].isHost) {
      // 現在の結果を履歴に保存（公開済みの場合のみ）
      if (rooms[roomId].revealed) {
        const historyItem = {
          topic: rooms[roomId].topic || "無題の投票",
          timestamp: new Date().toISOString(),
          votes: {}
        };

        // 各ユーザーの投票を記録
        Object.keys(rooms[roomId].users).forEach(userId => {
          const user = rooms[roomId].users[userId];
          historyItem.votes[user.name] = user.vote;
        });

        // 履歴に追加
        rooms[roomId].history.push(historyItem);
      }

      rooms[roomId].revealed = false;
      // すべてのユーザーの投票をリセット
      Object.keys(rooms[roomId].users).forEach(userId => {
        rooms[roomId].users[userId].vote = null;
      });
      // トピックもリセットする
      rooms[roomId].topic = "";
      // ルーム情報を全員に送信
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      console.log(`${roomId}の投票が終了し、新しい投票の準備ができました`);
    } else {
      // ホスト以外が実行しようとした場合はエラーを返す
      socket.emit('error', { message: '投票の終了はホストのみが行えます' });
    }
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id);

    // ユーザーが所属していたルームを探す
    Object.keys(rooms).forEach(roomId => {
      if (rooms[roomId].users[socket.id]) {
        // ユーザー情報を削除
        const userName = rooms[roomId].users[socket.id].name;
        const wasHost = socket.id === rooms[roomId].hostId;
        delete rooms[roomId].users[socket.id];
        console.log(`${userName}さんが${roomId}から退出しました${wasHost ? ' (ホスト)' : ''}`);

        // ルームが空になった場合はルーム自体を削除
        if (Object.keys(rooms[roomId].users).length === 0) {
          delete rooms[roomId];
          console.log(`ルーム${roomId}が削除されました`);
        } else {
          // ホストが退出した場合は新しいホストを設定
          if (wasHost) {
            const newHostId = Object.keys(rooms[roomId].users)[0]; // 最初のユーザーを新しいホストに
            rooms[roomId].hostId = newHostId;
            rooms[roomId].users[newHostId].isHost = true;
            console.log(`${rooms[roomId].users[newHostId].name}さんが新しいホストになりました`);
          }
          // ルーム情報を全員に送信
          io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
      }
    });
  });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});