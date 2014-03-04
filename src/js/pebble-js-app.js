var SEGMENT_SIZE = 20;
var BOARD_W = 1000;
var BOARD_H = 800;

var BLOCKS_X = BOARD_W / SEGMENT_SIZE;
var BLOCKS_Y = BOARD_H / SEGMENT_SIZE;

var Segment = function (x, y, type, snakeID)
{
	// pixels...
	this.x = x;
	this.y = y;
	
	// segment's number TODO: use it
	this.nx = x / SEGMENT_SIZE;
	this.ny = y / SEGMENT_SIZE;
	
	this.type = type || Segment.SEGMENT_TYPES.BLANK;
	this.color = undefined;
	this.snakeID = snakeID;
};

Segment.SEGMENT_TYPES = 
{
	BLANK: {
		id: 1,
		color: "#FFF",
	},
	
	RED_BLOCK: {
		id: 2,
		color: "#F23",
	},
	
	SNAKE: {
		id: 3,
		color: "#AA2344",
	},
	
	DEAD_SNAKE: {
		id: 4,
		color: "#A8969D",
	},
};

Segment.prototype.getColor = function()
{
	return this.color || this.type.color;
};

Segment.getTypeByValue = function(v){

	var key = null;
	
	Object.keys(Segment.SEGMENT_TYPES).filter(function(k)
     {
		if(!key && Segment.SEGMENT_TYPES[k].id === v)
          {
			key = k;
		}
	});
	
	return Segment.SEGMENT_TYPES[key];
};

var SnakeMessage = function(_type, _msg){
	this.type = _type;
	this.msg = _msg;
};

SnakeMessage.TYPES = {
	// message contains current board
	INIT: {
		id: 1,
	},
	
	// message contains new move of snake
	MOVE: {
		id: 2,
	},
	
	// message sends on new clients connection
	NEW_SNAKE: {
		id: 3,
	},
	
	// message sends when client disconnect
	REMOVE_SNAKE: {
		id: 4,
	},
	
	NEW_BLOCK: {
		id: 5,
	}
};

var Snake = function(body){ //TODO snake could be instantined as a body array
	
	this.body = body;
	this.snakeID = body[0].snakeID;
	this.color = "#5CA315";

	this.SNAKE_STATES = {
		LIVE: 1,
		DEAD: 2,
	};
	
	this.status = this.SNAKE_STATES.LIVE;
};

Snake.prototype.getTail = function(){
	return this.body[this.body.length - 1];
};

Snake.prototype.getHead = function(){
	return this.body[0];
};

Snake.prototype.isAlive = function(){
	return this.status === this.SNAKE_STATES.LIVE;
}

Snake.prototype.move = function(move)
{
	var current_head = this.getHead();
	var new_head_segment = new Segment(current_head.x + move[0], current_head.y + move[1], Segment.SEGMENT_TYPES.SNAKE);
	
	return SnakeGameBoard.moveSnake(this, new_head_segment);
};

Snake.prototype.die = function()
{
	this.status = this.SNAKE_STATES.DEAD;
};

var SnakeGameBoard = {

	to_update: [],
	
	board: (function(){
		var board = [];
		for(var y = 0; y < BLOCKS_Y; y++){
	
			board[y] = [];
			
			for(var x = 0; x < BLOCKS_X; x++){
				board[y].push(new Segment(x * SEGMENT_SIZE, y * SEGMENT_SIZE));
			};
		}
		return board;
	})(),
	
	printBoard: function(){
		
		this.board.forEach(function(row){
			var l = "";
			row.forEach(function(segment){
				l += (segment.type.id !== 1) ? segment.type.id : '.';
			});
			console.info(l);
		});
		console.info("--------------");
	},
	
	deleteSegment: function(s){
		var to_erase = this.board[s.y / SEGMENT_SIZE][s.x / SEGMENT_SIZE];
		to_erase.type = Segment.SEGMENT_TYPES.BLANK;
		to_erase.color = Segment.SEGMENT_TYPES.BLANK.color;
		
		this.to_update.push(to_erase);
	},
	
	deleteSnake: function(snake){
		snake.body.forEach(function(segment){
			//SnakeGameBoard.deleteSegment(segment);
			segment.type = Segment.SEGMENT_TYPES.BLANK;
		});
	},
	
	putSegment: function(s){
		this.board[s.y / SEGMENT_SIZE][s.x / SEGMENT_SIZE] = s;
		this.to_update.push(s);
	},
	
	getSegmentsToUpdate: function(){
		return this.to_update;
	},
	
	getSegment: function(x, y){
		return this.board[y][x];
	},
	
	isMoveCrossBoard: function(move){
		return ((move.x < 0) || (move.y < 0) || (move.x >= BOARD_W) || (move.y >= BOARD_H));
	},
	
	teleport: function(move){
		if(move.x < 0){
			move.x = BOARD_W + move.x;
		}
		
		if(move.y < 0){
			move.y = BOARD_H + move.y;
		}
		
		if(move.x >= BOARD_W){
			move.x = move.x - BOARD_W;
		}
		
		if(move.y >= BOARD_H){
			move.y = move.y - BOARD_H;
		}
	},
	
	updateBuffer: function(snake){
		var colors = ["#5CA315", "#69B81A",  "#74CC1D", "#81DE23", "#8BF026", "#92FA2A", "#A2FF45"];
		
		for(var i = 0; i < snake.body.length; i++){
			var current_segment = snake.body[i];
			current_segment.color = colors[i] || colors[colors.length - 1];
			
			this.putSegment(current_segment);
		};
	},
	
	moveSnake: function(snake, new_head_segment){
		
		if(this.isMoveCrossBoard(new_head_segment)){
			this.teleport(new_head_segment);
		}
		
		var move_result = SnakeGameBoard.snakeGameCollisionDetector.processMove(new_head_segment);
		
		if(move_result === SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.SNAKE){
			SnakeGameBoard.deleteSnake(snake);
			return false;
		}
		
		// cut off snake's tail or eat new segment
		if(move_result !== SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.EATABLE_BLOCK){
			SnakeGameBoard.deleteSegment(snake.body.pop());
		}

		var new_body = [new_head_segment];
		[].push.apply(new_body, snake.body);
		snake.body = new_body;
		
		this.updateBuffer(snake);
		
		//this.printBoard();
		return true;
	},
	
	snakeGameCollisionDetector: {
		
		COLLISION_STATES: {
			SNAKE: 1,
			EATABLE_BLOCK: 2,
		},
		
		processMove: function(head){

			var block = SnakeGameBoard.getSegment(head.x / SEGMENT_SIZE, head.y / SEGMENT_SIZE);
			
			switch (block.type.id) {
				case Segment.SEGMENT_TYPES.RED_BLOCK.id:
					return SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.EATABLE_BLOCK;
					break;
					
				case Segment.SEGMENT_TYPES.SNAKE.id:
					return SnakeGameBoard.snakeGameCollisionDetector.COLLISION_STATES.SNAKE;
					break;
		
				case Segment.SEGMENT_TYPES.BLANK.id:
					return false;
					break;
				default:
					break;
			}
		},
	},
	
};

if(typeof exports !== "undefined"){
	exports.SEGMENT_SIZE = SEGMENT_SIZE;
	exports.BOARD_W = BOARD_W;
	exports.BOARD_H = BOARD_H;

	exports.BLOCKS_X = BLOCKS_X;
	exports.BLOCKS_Y = BLOCKS_Y;
	
	exports.Snake = Snake;
	exports.Segment = Segment;
	exports.SnakeMessage = SnakeMessage;
	exports.SnakeGameBoard = SnakeGameBoard;
}

var currentDir = 65;

var SnakeGame = {
           init: function(canvas){

                var array = [68, 87, 65, 83];
                var rand = Math.floor(Math.random()*4);
                currentDir = array[rand];

                SnakeGame.SnakeGameClient.init();
               
                this.SnakeGameDrawer.init(canvas);
                this.SnakeGameDrawer.update();
               
                document.onkeydown = this.keyDownEvent;
               
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.UP] = [0, -SEGMENT_SIZE];
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.DOWN] = [0, SEGMENT_SIZE];
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.RIGHT] = [SEGMENT_SIZE, 0];
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.LEFT] = [-SEGMENT_SIZE, 0];
       
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.UP] = SnakeGame.WSAD_CODES.DOWN;
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.DOWN] = SnakeGame.WSAD_CODES.UP;
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.LEFT] = SnakeGame.WSAD_CODES.RIGHT;
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.RIGHT] = SnakeGame.WSAD_CODES.LEFT;
 
                var that = this;
               
                window.snakeMoveInterval = setInterval(function () 
               {
                        var e = {keyCode : currentDir};
 
                        var current_move = SnakeGame.MOVES[currentDir];
                        if(!current_move || (currentDir === SnakeGame.ILLEGAL_MOVE)){
                                return;
                        }
                       
                        // block turn back
                        SnakeGame.ILLEGAL_MOVE = SnakeGame.OPPOSITE_MOVE_MAP[currentDir];
                       
                        SnakeGame.SnakeGameClient.sendMove(current_move);
                }, 150);
        },     
               
        snake: null,
        clients: [],
       
        SnakeGameClient: {
               
                websocket: null,
                       
                init: function(){
                  
                  var SNAKE_SERVER_IP = "162.243.4.89" // HERE
                        var wsUri = "ws://" + SNAKE_SERVER_IP;
 
                        var websocket = new WebSocket(wsUri);
                       
                        websocket.onopen = function(evt) 
                         {
                              console.log("onopen");
                                	Pebble.sendAppMessage({0: 0, 1: 4});
                        };
                       
                        websocket.onclose = function(evt) {
                              console.log("onclose");

                                alert("CONNECTION LOST");
                              Pebble.sendAppMessage({0: 0, 1: 100});

                                SnakeGame.SnakeGameDrawer.die(SnakeGame.snake);
                                 
                        };
                       
                        websocket.onmessage = function(evt) 
                       {
                              console.log("onmessage");
                                SnakeGame.SnakeGameClient.dispatchMsg(JSON.parse(evt.data));
                        };
                       
                        websocket.onerror = function(evt) {
                          console.log("onerror");
                        };
                       
                        this.websocket = websocket;
                  
                         Pebble.sendAppMessage({0: 0, 1: 4});

                },
               
                dispatchMsg: function(obj){
 
                        switch (obj.type.id) {
                                case SnakeMessage.TYPES.INIT.id:
                                       
                                        SnakeGame.snake = new Snake([obj.msg.head]);
                                        //console.warn(" - INIT - HELLO, snakeID = " + SnakeGame.snake.snakeID)
                                        console.warn(obj.msg)
                                        SnakeGame.SnakeGameClient.updateBoard(obj.msg.board);
                                        obj.msg.clients.forEach(function(s){
                                                 SnakeGame.clients[s.snakeID] = new Snake(s.body);
                                        });
                                       
                                        SnakeGameBoard.updateBuffer(SnakeGame.snake);
 
                                        SnakeGame.SnakeGameDrawer.initDraw();  
                                        break;
                                       
                                case SnakeMessage.TYPES.MOVE.id:
                                       
                                        //console.log("MOVE")
                                        //console.log(obj.msg)
                                        var snake_to_move = SnakeGame.clients[obj.msg.snakeID];
 
                                        if(!snake_to_move.move(obj.msg.move)){
                                                  
                                                SnakeGame.SnakeGameDrawer.die(snake_to_move);
                                                SnakeGame.clients[obj.msg.snakeID] = undefined;
                                                  Pebble.sendAppMessage({0: 0, 1: 100});

                                        }
                                        else{
                                                SnakeGame.SnakeGameDrawer.update();
                                        }
                                       
                                        break;
       
                                case SnakeMessage.TYPES.NEW_SNAKE.id:
                                        //console.info("NEW SNAKE SWITCH:");
                                        //console.info(obj);
                                        var new_snake = new Snake(obj.msg.snake.body);
                                        SnakeGame.clients[obj.msg.snake.snakeID] = new_snake;
                                        SnakeGameBoard.updateBuffer(new_snake);
                                        SnakeGame.SnakeGameDrawer.update();
                                        break;
                               
                                case SnakeMessage.TYPES.REMOVE_SNAKE.id:
                                        ///console.info("REMOVE SNAKE SWITCH:");
                                        //console.info(obj);
                                       
                                        var to_remove_snakeID = obj.msg.snakeID;
                                        var snake = SnakeGame.clients[to_remove_snakeID];
                                        SnakeGame.SnakeGameDrawer.die(snake);
                                        SnakeGameBoard.deleteSnake(snake);
                                        SnakeGame.clients[to_remove_snakeID] = undefined;
                                        SnakeGame.SnakeGameDrawer.update();
                                        break;
                                       
                                case SnakeMessage.TYPES.NEW_BLOCK.id:
                                        //console.info("NEW RED BLOCK SWITCH:");
                                       
                                        var s = new Segment(obj.msg.new_block.x, obj.msg.new_block.y, Segment.SEGMENT_TYPES.RED_BLOCK, null);
                                       
                                        SnakeGameBoard.putSegment(s);
                                        SnakeGame.SnakeGameDrawer.update();
                                        break;
                                       
                                default:
                                        console.info(obj);
                                        break;
                                }
                },
                       
                updateBoard: function(segments_array){
                        segments_array.forEach(function(s){
                                var segment = new Segment(s.x, s.y, Segment.getTypeByValue(s.typeV), s.snakeID);
                                SnakeGameBoard.putSegment(segment);
                        });
                },
               
                sendMove: function(_move){
                       
                        var msg = new SnakeMessage(SnakeMessage.TYPES.MOVE, {
                                move: _move,
                        });
                        this.websocket.send(JSON.stringify(msg));
                },     
        },
       
        SnakeGameDrawer: {
               
                canvas: null,
                context: null,
               
                init: function(canvas){
                        //this.canvas = canvas;
                        //this.canvas.width = BOARD_W;
                        //this.canvas.height = BOARD_H;
                       
                        //this.context = canvas.getContext("2d");
                        //this.initDraw();
                },
               
                // draws every segment
                initDraw: function(){
                        var that = this;
                        SnakeGameBoard.board.forEach(function(row){
                                row.forEach(function(s){
                                        that.drawSegment(s);
                                });
                        });
                },
               
                update: function(){
                       
                        var to_change = SnakeGameBoard.getSegmentsToUpdate();
 
                        for(var i in to_change){
                                var current_segment = to_change[i];
                                //this.drawSegment(current_segment);
                        };
                       
                        to_change.length = 0;
                },
               
                die: function(snake){
                       
                        var dead_colors = ["#D1D1D1", "#BAB6B8", "#A3A0A1", "#878686", "#6B6A6A", "#525252"];
                        for(var b in snake.body){
                               
                                var cb = snake.body[b];
                               
                                (function(cb, b){
                                       
                                        setTimeout(function(){
                                                cb.type = Segment.SEGMENT_TYPES.DEAD_SNAKE;
                                                cb.color = dead_colors[b] || dead_colors[dead_colors.length - 1];
                                               
                                                SnakeGameBoard.putSegment(cb);
                                                SnakeGame.SnakeGameDrawer.update();
                                        }, b * 50);
                                       
                                        setTimeout(function(){
                                                cb.type = Segment.SEGMENT_TYPES.DEAD_SNAKE;
                                                cb.color = Segment.SEGMENT_TYPES.BLANK.color;
                                               
                                                SnakeGameBoard.putSegment(cb);
                                                SnakeGame.SnakeGameDrawer.update();
                                        }, 50 * (snake.body.length - b) + snake.body.length * 50);
                                       
                                })(cb, b);
                        };
                       
                        snake.die();
                },
        },
       
        WSAD_CODES: {
                UP: 87,
                DOWN: 83,
                LEFT: 65,
                RIGHT: 68,
        },
       
        ILLEGAL_MOVE: undefined,
       
        MOVES: {},
       
        // map used to block "turn back" snake
        OPPOSITE_MOVE_MAP: {},
       
             keyDownEvent:
function(e) 
{
        
               
                SnakeGame.returnKeyCode(e);
                console.log(e.keyCode);
                console.log(currentDir);

                var inKey = e;

                window.clearInterval(snakeMoveInterval);
                
                window.snakeMoveInterval = setInterval(function () {
                        var e = {keyCode : currentDir};
                        
                        var current_move = SnakeGame.MOVES[currentDir];
                        if(!current_move || (currentDir === SnakeGame.ILLEGAL_MOVE)){
                                return;
                        }
                       
                        // block turn back
                        SnakeGame.ILLEGAL_MOVE = SnakeGame.OPPOSITE_MOVE_MAP[currentDir];
                       
                        SnakeGame.SnakeGameClient.sendMove(current_move);
                         Pebble.sendAppMessage({0: 0, 1: currentDir});
                }, 100); 
                
                
                var current_move = SnakeGame.MOVES[currentDir];
                if(!current_move || (currentDir === SnakeGame.ILLEGAL_MOVE)){
                        return;
                }
               
                // block turn back
                SnakeGame.ILLEGAL_MOVE = SnakeGame.OPPOSITE_MOVE_MAP[currentDir];
               
                SnakeGame.SnakeGameClient.sendMove(current_move);
        },

        returnKeyCode: function(e){

            var key = e.keyCode;

            if(key === 65)
            {
                switch(currentDir){
                    case 65 : currentDir = 83; break;
                    case 83 : currentDir = 68; break;
                    case 87 : currentDir = 65; break;
                    case 68 : currentDir = 87; break;
                }
            }
            else if(key === 68)
            {
                switch(currentDir){
                    case 65 : currentDir = 87; break;
                    case 83 : currentDir = 65; break;
                    case 87 : currentDir = 68; break;
                    case 68 : currentDir = 83; break;
                }
            }
        }
};

// Function to send a message to the Pebble using AppMessage API
function sendMessage(a, b) {
	Pebble.sendAppMessage({0: a, 1: b});
}

// Called when JS is ready
Pebble.addEventListener("ready",
							function(e) {
                                        
                                        SnakeGame.init(e);
							});
												
// Called when incoming message from the Pebble is received
Pebble.addEventListener("appmessage",
							function(e) {
                                        
                                        var t = {keyCode : e.payload[1]};
                                        SnakeGame.keyDownEvent(t);
								console.log("Received Status: " + e.payload[0]);
								console.log("Received Message: " + e.payload[1]);
								sendMessage(0, e.payload[1]);
							});