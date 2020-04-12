//Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var money = require('./util/money.js');
var Player = require('./Player.js');
var KoeHandel = require('./KoeHandel.js');
var util = require('util');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port', 5000);
app.use(express.static(path.join(__dirname + '/static')));

//Routing
app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(5000, function () {
  console.log('Starting server on port 5000');
});

var state = {
  modus: 'geen', //koehandel, stamboekhandel, rathandel
  ezelCount: 0,
  ratCount: 0,
  players: {},
};

var handelObject;
var ratMoney = emptyRatMoney();
var gelijkSpellen = 0;

//const
var ezelToMoney = {
  0: 50,
  1: 100,
  2: 200,
  3: 500,
};

function emptyRatMoney() {
  return {
  0: 0,
  10: 0,
  20: 0,
  50: 0,
  100: 0,
  200: 0,
  500: 0,
  }
}

function getStateKeyUpdateName(key) {
  return 'update' + key.charAt(0).toUpperCase() + key.slice(1);
}

function emitStateUpdate(values) {
  console.log(JSON.stringify(state));
  io.sockets.emit('state', state);
}

function sendFullState(socket) {
  for(key in Object.keys(state)) {
    socket.emit(getStateKeyUpdateName(key), state);
  }
}

// Add the WebSocket handlers
io.on('connection', function (socket) {
  //name = string
  socket.on('new player', function (name) {
    console.log('new player');
    var nameId = null;
    for (let [key, value] of Object.entries(state.players)) {
      if (value.name === name)
        nameId = key;
    }
    if (nameId) {
      state.players[socket.id] = state.players[nameId];
      delete state.players[nameId];
    }
    else {
      state.players[socket.id] = new Player(
        Object.keys(state.players).length === 0,
        name
      );
    }
    sendFullState(socket);
    io.sockets.emit('message', name + ' heeft zich aangemeld!');
    emitStateUpdate(['players']);
  });

  //name = string
  socket.on('nameChange', function (name) {
    state.players[socket.id].name = name;
    emitStateUpdate(['players']); 
  });

  socket.on('startGame', function () {
    state.gameStarted = true;
    emitStateUpdate(['gameStarted']);
  });

  socket.on('ezel', function () {
    if (state.ezelCount === 4) {
      io.sockets.emit('message', 'Het max aantal ezels is al bereikt.');
    } else {
      for (const player in state.players){
        money.addAmount(state.players[player].money, ezelToMoney[state.ezelCount]);
      }
      state.ezelCount++;
    }
    emitStateUpdate(['ezelCount', 'players']);
  });

  socket.on('rat', function () {
    if (state.ratCount === 4) {
      io.sockets.emit('message', 'Het max aantal ratten is al bereikt.');
    } else {
      state.ratCount++;
    }
    emitStateUpdate(['ratCount', 'players']);
  });

  //data = {money: geldobject, recipient: string (player id)}
  socket.on('giveMoney', function (data) {
    money.subtractMoney(state.players[socket.id].money, data.money);
    money.addMoney(state.players[data.recipient].money, data.money);
    emitStateUpdate(['players']);
  });

  //data = { challengedId: string, offer: geldobject}
  socket.on('startKoehandel', function (data) {
    state.mode = 'koehandel';
    handelObject = new KoeHandel(
      socket.id,
      data.offer,
      false,
    );
    io.to(`${data.challengedId}`).emit('challenged');
    money.subtractMoney(state.players[socket.id].money, data.offer);
    io.sockets.emit(
      'message',
      state.players[socket.id].name +
        ' heeft ' +
        money.cardCount(data.offer) +
        ' kaarten op tafel gelegd.',
    );
    emitStateUpdate(['players', 'mode']);
  });

  socket.on('acceptKoehandel', function () {
    money.addMoney(state.players[socket.id].money, handelObject.offer);
    handelObject = null;
    state.mode = 'geen';
    emitStateUpdate(['players', 'mode']);
  });

  //data = geldobject
  socket.on('counterKoehandel', function (data) {
    var offer = money.calculateTotal(handelObject.offer);
    var counterOffer = money.calculateTotal(data);
    console.log('Bod: ' + offer + ' Tegenbod: ' + counterOffer);
    if(offer === counterOffer) {
      if (gelijkSpellen === 0) {
        io.sockets.emit('message', 'Gelijkspel! Voer koehandel nog éénmaal uit.');
        gelijkSpellen++;
      }
      else {
        io.sockets.emit('message', 'Alweer gelijkspel! De beurt wordt doorgegeven');
        gelijkSpellen = 0;
      }
      state.mode = 'geen';
      console.log('Offer: ');
      console.log(handelObject.offer);
      money.addMoney(state.players[handelObject.challengerId].money, handelObject.offer);
      handelObject = null;
      emitStateUpdate(['mode', 'players']);
    }
    else {
      var winner = (offer > counterOffer) !== handelObject.rat ?
        handelObject.challengerId :
        socket.id;
      io.sockets.emit('message', state.players[winner].name + ' heeft gewonnen!');
      money.subtractMoney(state.players[socket.id].money, data);
      money.addMoney(state.players[handelObject.challengerId].money, data);
      money.addMoney(state.players[socket.id].money, handelObject.offer);
      socket.emit('message', state.players[winner].name + ' heeft gewonnen! Jij hebt ' + offer + ' ontvangen.');
      io.to(`${handelObject.challengerId}`).emit('message', state.players[winner].name + ' heeft gewonnen! Jij hebt ' + counterOffer + ' ontvangen.');
      state.mode = 'geen';
      handelObject = null;
      emitStateUpdate(['mode', 'players']);
    }
  });

  socket.on('startStamboekHandel', function() {
    state.mode = 'stamboekhandel';
    emitStateUpdate(['mode']);
  });

  socket.on('acceptStamboekHandel', function() {
    if (state.mode !== 'geen') {
      state.mode = 'geen';
      io.sockets.emit('message', state.players[socket.id].name + ' heeft hem geaccepteerd. Voer de transactie middels de betalingknop uit.');
      emitStateUpdate(['mode']);
    }
  });

  socket.on('startRatHandel', function() {
    state.mode = 'rathandel';
    ratMoney = emptyRatMoney();
    io.sockets.emit('message', 'Rathandel is gestart. Er zitten momenteel 0 kaarten in de ratpot.');
    emitStateUpdate(['mode']);
  });

  //data = geldobject
  socket.on('submitRatHandel', function(data) {
    money.subtractMoney(state.players[socket.id].money, data);
    money.addMoney(ratMoney, data);
    io.sockets.emit('message', 'Er zitten momenteel ' + money.cardCount(ratMoney) + ' kaarten in de ratpot.');  
    emitStateUpdate(['players']);
  });

  socket.on('acceptRatHandel', function() {
    io.sockets.emit('message', state.players[socket.id].name + ' claimt het geld en krijgt de rat!!');
    money.addMoney(state.players[socket.id].money, ratMoney);
    state.mode = 'geen';
    emitStateUpdate(['players', 'mode']);
  });

  socket.on('disconnect', function () {
    console.log('Player ' + socket.id + ' has disconnected.');
  });

  socket.on('resetMode', function() {
    if(handelObject && handelObject.challengerId) {
      money.addMoney(state.players[handelObject.challengerId].money, handelObject.offer);
    }
    state.mode = 'geen';
    handelObject = null;
    emitStateUpdate(['mode', 'players']);
  });

  socket.on('setState', function(newState){
    state = newState;
  });
});


