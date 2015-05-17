var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.urlencoded());
app.use(bodyparser.json());
var cookieparser = require("cookie-parser");
app.use(cookieparser());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var twilio = require("./twilio");
var qr = require("./qr");
var cryptoString = require("random-crypto-string");
var crypto = require("crypto");

var morgan = require("morgan");
app.use(morgan("dev"));

var REPLIES = {
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

var HASH_COUNT = 2;

var subscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, REPLIES.subscribe.missing, function(){});
		return;
	}
	// TODO
	twilio.send(tel, REPLIES.subscribe.success, function(){});
}

var unsubscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, REPLIES.unsubscribe.missing, function(){});
		return;
	}
	// TODO
	twilio.send(tel, REPLIES.unsubscribe.success, function(){});
}

var static = function(pth){
	return function(req, res){
		res.sendFile(pth, {root: path.join(__dirname, "../public")});
	}
}

var checkSchema = function(object, schema){
	for(field in object){
		if(!(field in schema)){
			return false;
		}
	}
	for(field in schema){
		if(schema[field].indexOf("optional") < 0 && !(field in object)){
			return false;
		}
		if(schema[field].indexOf((object[field].constructor === Array) ? "array" : typeof(object[field])) < 0){
			return false;
		}
	}
	return true;
}

var passwordHash = function(password, salt){
	for(var i = 0; i < HASH_COUNT; i++){
		var hash = crypto.createHash("sha512");
		password = hash.update(password).update(salt).digest("base64");
	}
	return password;
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
		twilio.send(req.body.From, REPLIES.default, function(){});
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
			twilio.send(req.body.From, REPLIES.help, function(){});
			break;
		case "default":
			twilio.send(req.body.From, REPLIES.default, function(){});
			break;
	}

	res.sendFile("/twilio.xml" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.post("/event/update", function(req, res){
	var query = {id:req.body.ID};
	var updateInfo = {
		name		: req.body.Name,
		description : req.body.Description,
		format		: req.body.Format,

		channels	: req.body.Channels,
		participants: req.body.Participants,
		spectators	: req.body.Spectators,
		subEvents	: req.body.SubEvents
	};
	db.getEventModel().update(query, updateInfo, function(err, raw){
		if(err) console.log("failure to update " + err);
		else{
			console.log(raw);
		}
	});
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

app.post("/user/new", function(req, res){
	if(!checkSchema(req.body, {
		phone: "string",
		password: "string"
	})){
		res.status(200).send("{ok: false, reason: 'Invalid parameters'}");
		return;
	}
	cryptoString(8, function(err, salt){
		if(err || !salt){
			res.status(500).send("Internal error: failed generating salt.\n" + err);
			return;
		}
		db.getUserModel().find({
			phone: req.body.phone,
			password: {
				$exists: true
			}
		}, function(err, data){
			if(err || !data){
				res.status(500).send("Internal error: failed retrieving data.\n" + err + ", " + data);
				return;
			}
			if(data.length > 0){
				res.status(200).send("{ok: false, reason: 'Account already exists.'}");
				return;
			}
			db.getUserModel().update({
				phone: req.body.phone
			}, {
				$set: {
					password: passwordHash(req.body.password, salt),
					salt: salt
				},
				$setOnInsert: {
					organized: [],
					participated: [],
					spectated: [],
					subscriptions: [],
					authTokens: []
				}
			}, {
				upsert: true
			}, function(err, dat){
				res.status(200).send("{ok: true}");
			});
		});
	});
});

app.post("/user/auth", function(req, res){
	if(!checkSchema(req.body, {
		phone: "string",
		password: "string"
	})){
		res.status(200).send("{ok: false, reason: 'Invalid parameters'}");
	}

	db.getUserModel().find({
		phone: req.body.phone,
		password: {
			$exists: true
		}
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retreiving data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{ok: false, reason: 'Named user does not exist.'}");
		}
		user = data[0];
		if(user.password == passwordHash(req.body.password, user.salt)){
			cryptoString(24, function(err, token){
				if(err || !token){
					res.status(500).send("Internal error: failed generating token.");
					return;
				}
				res.cookie("authToken", token);
				res.status(200);
				res.send("{ok: true}");
				db.getUserModel().update({
					phone: req.body.phone
				}, {
					$push: {
						authTokens: token
					}
				}, function(){});
				return;
			});
		} else {
			res.status(200).send("{ok: false, reason: 'Incorrect password.'}");
			return;
		}
	});
});

app.get("/", static("/"));

app.get("/events", static("/events.html"));

app.post("/", function(req, res){
	res.send("yes ");
});

http.listen(process.env.PORT || 1337, function(){});