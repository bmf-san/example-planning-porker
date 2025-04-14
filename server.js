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
        revealed: false
      };
    }

    // ユーザー情報を保存
    rooms[roomId].users[socket.id] = {
      name: userName,
      vote: null
    };

    // ルーム情報を全員に送信
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
    console.log(`${userName}さんが${roomId}に参加しました`);
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
    if (rooms[roomId]) {
      rooms[roomId].revealed = true;
      // ルーム情報を全員に送信
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      console.log(`${roomId}の結果が公開されました`);
    }
  });

  // 投票リセット
  socket.on('reset', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].revealed = false;
      // すべてのユーザーの投票をリセット
      Object.keys(rooms[roomId].users).forEach(userId => {
        rooms[roomId].users[userId].vote = null;
      });
      // ルーム情報を全員に送信
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      console.log(`${roomId}の投票がリセットされました`);
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
        delete rooms[roomId].users[socket.id];
        console.log(`${userName}さんが${roomId}から退出しました`);

        // ルームが空になった場合はルーム自体を削除
        if (Object.keys(rooms[roomId].users).length === 0) {
          delete rooms[roomId];
          console.log(`ルーム${roomId}が削除されました`);
        } else {
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