var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.urlencoded());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var ObjectId = db.ObjectId;
var twilio = require("./twilio");
var qr = require("./qr");

var morgan = require("morgan");
app.use(morgan("dev"));

var replies = {
	subscribe: {
		success: "You have been subscribed.",
		missing: "You need to specify what to subscribe to!  Use PING SUBSCRIBE or PING SUB followed by an event handle (optionally with a channel)."
	},
	unsubscribe: {
		success: "You have been unsubscribed.",
		missing: "You need to specify what to unsubscribe from!  Use PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by an event handle (optionally with a channel) or ALL if you want to unsubscribe from everything."
	},
	help: "To subscribe, send PING SUBSCRIBE or PING SUB followed by the event handle (optionally with a channel).\nTo unsubscribe, send PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by the event handle (optionally with a channel).\nTo stop all subscriptions, send PING UNSUBSCRIBE ALL, PING UNSUB ALL, or PING STOP ALL.\nTo view this message, send PING HELP.",
	default: "I don't understand that command.  (Did you forget to start with PING?)  To view help, reply PING HELP."
};

var subscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, replies.subscribe.missing, function(){});
		return;
	}
	// TODO
	twilio.send(tel, replies.subscribe.success, function(){});
}

var unsubscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, replies.unsubscribe.missing, function(){});
		return;
	}
	// TODO
	twilio.send(tel, replies.unsubscribe.success, function(){});
}

var static = function(pth){
	return function(req, res){
		res.sendFile(pth, {root: path.join(__dirname, "../public")});
	}
}

app.get("/css/:file", function(req, res){
	res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get(/\/js\/(.*)/, function(req, res){
	res.sendFile("/js/" + req.params[0], {root: path.join(__dirname, "../public")});
});

app.get(/\/font\/(.*)/, function(req, res){
	res.sendFile("/font/" + req.params[0], {root: path.join(__dirname, "../public")});
});

app.get("/images/:file", function(req, res){
	res.sendFile("/images/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.post("/twilio", function(req, res){
	var message = req.body.Body.toLowerCase().split(/[\s\/]/g);
	
	if(message[0] != "ping"){
		twilio.send(req.body.From, replies.default, function(){});
		return;
	}
	
	switch(message[1]){
		case "subscribe":
		case "sub":
			subscribe(req.body.From, message.slice(2));
			break;
		case "unsubscribe":
		case "unsub":
		case "stop":
			unsubscribe(req.body.From, message.slice(2));
			break;
		case "help":
			twilio.send(req.body.From, replies.help, function(){});
			break;
		case "default":
			twilio.send(req.body.From, replies.default, function(){});
			break;
	}
	
	res.sendFile("/twilio.xml" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get("/qrtest", function(req, res){ // testing only
	res.send(qr("tsa-smash4"));
});

app.get("/dbtest", function(req, res){
	db.getEventModel().findOne({name:"HackTJ 3.0"},function(err, evt){
		db.getChannelModel().findOne({name:"HackTJ 3.0 main channel"}, function(err, chan){
			db.createSubChannel(chan.id, "Workshops", evt.id);	
		});
	});
	//Event.findOne({name:"HackTJ 2.0"}, function(err, evt){
	//	db.newSubEvent(evt.id, "Cookie Baking Workshop", "Learn to bake cookies!", new Date());
	//});
	res.send("DB tested.");
});

app.get("/", static("/"));

app.get("/user/new", static("/user/new.html"));

app.get("/events", static("/events.html"));

http.listen(process.env.PORT || 1337, function(){});