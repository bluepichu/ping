// OK fine lucas I'll wriTE COMMENTS

// events have associated channels
// an event has a main channel that incorporates all subhappenings in that event
// when one subscribes they can do so to any number of specific channels

// js import stuff

var express = require("express");
var app = express();
var bodyparser = require("body-parser");
app.use(bodyparser.json());
app.use(bodyparser.urlencoded());
var cookieparser = require("cookie-parser");
app.use(cookieparser());
var http = require("http").Server(app);
var path = require("path");
var db = require("./db");
var ObjectId = db.ObjectId;
var twilio = require("./twilio");
var cryptoString = require("random-crypto-string");
var crypto = require("crypto");
var extend = require("extend");
var tweet = require("./twitter");
var qr = require("./qr");
var AsyncHandler = require("./async").AsyncHandler;

require("string-format").extend(String.prototype);

var morgan = require("morgan");
app.use(morgan("dev"));

// I don't know what this is for
var HASH_COUNT = 2;


// ------TWILIO SUB UNSUB

// stuff that gets sent as texts when people message the service number
var REPLIES = {
	subscribe: {
		success: "You have succesfully subscribed to {0}.",
		missing: "You need to specify what to subscribe to!  Use PING SUBSCRIBE or PING SUB followed by an event handle (optionally with a channel).",
		nonexistentChannel: "That channel doesn't exist.",
		nonexistentEvent: "That event doesn't exist."
	},
	unsubscribe: {
		success: "You have succesfully unsubscribed from {0}.",
		missing: "You need to specify what to unsubscribe from!  Use PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by an event handle (optionally with a channel) or ALL if you want to unsubscribe from everything.",
		notSubscribed: "You weren't subscribed to {0}.",
		nonexistentChannel: "That channel doesn't exist.",
		nonexistentEvent: "That event doesn't exist."
	},
	help: "To subscribe, send PING SUBSCRIBE or PING SUB followed by the event handle (optionally with a channel).\nTo unsubscribe, send PING UNSUBSCRIBE, PING UNSUB, or PING STOP followed by the event handle (optionally with a channel).\nTo stop all subscriptions, send PING UNSUBSCRIBE ALL, PING UNSUB ALL, or PING STOP ALL.\nTo view this message, send PING HELP.\nFor more information, visit urlhere.com.",
	default: "I don\"t understand that command.  (Did you forget to start with PING?)  To view help, reply PING HELP.",
	error: "Your request failed due to a server error.  Try again later.",
	welcome: "Welcome to Ping!  This system will allow you to receive text notifications for various events and channels.  For more information, visit urlhere.com or reply PING HELP."
};

// I don't know what this does
var noCB = function(){};


// I didn't write this function so some things may not be correct
// when someone sends in a message through twilio requesting subscription to a channel this function gets used
var subscribe = function(tel, path){
	console.log(path);
	if(path.length < 1){
		twilio.send(tel, REPLIES.subscribe.missing, noCB); // twilio tells them is bad thing they are trying to subscribe to
		return;
	} 
	
	// database query to find the requested channel
	// 'slug' means simplified unique name / identifier
	db.getEventModel().find({
		slug: path[0] // path[0] is the event slug
	}, function(err, data){ // callback happens upon completion of database access, either failure with err containing info or success with data containing info
		if(err || !data){
			console.log(err);
			twilio.send(tel, REPLIES.error, noCB); // erroror
			return;
		}
		if(data.length != 1){
			twilio.send(tel, REPLIES.subscribe.nonexistentEvent, noCB); // the event doesn't exist (db query found nothing)
			return;
		}
		
		// if query found an event
		var event = data[0];
		db.getChannelModel().find({ // db query to find the channel
			event: event._id,
			name: path[1] || "main" // path[1] is the channel name; if nonexistent, attempt subscription to main channel
		}, function(err, data){ // callback
			console.log(err, data);
			if(err || !data){
				console.log(err);
				twilio.send(tel, REPLIES.error, noCB); // there is an error
				return;
			}
			if(data.length != 1){ // this comment is pointless
				twilio.send(tel, REPLIES.subscribe.nonexistentChannel, noCB); // db found nothing
				return;
			}
			// if we found a channel
			db.getUserModel().update({ // update the database
				phone: tel // find the user with the number that sent the stuff
			}, {
				$addToSet: {
					subscriptions: data[0]._id	// subscribe them
				}
			}, {
				upsert: true
			}, function(err, dat){
				if(err || !dat){
					console.log(err);
					twilio.send(tel, REPLIES.error, noCB); // go figure
					return;
				}
				console.log(dat);
				if(dat.upserted){
					twilio.send(tel, REPLIES.welcome, noCB); // if had to insert a new user, send welcome message?
				}
				twilio.send(tel, REPLIES.subscribe.success.format(path[0] + (path[1] ? " " + path[1] : "")), noCB);
				db.getChannelModel().update({
					_id: data[0]._id
				}, {
					$addToSet: {
						subscribers: tel
					}
				}, noCB);
			});
		});
	});
}

// called when message comes in requesting unsub.
var unsubscribe = function(tel, path){
	if(path.length < 1){
		twilio.send(tel, REPLIES.unsubscribe.missing, noCB);
		return;
	}
	db.getUserModel().find({ // query database for user with phone number that made reqest
		phone: tel
	}, function(err, data){ 
		if(err || !data){
			twilio.send(tel, REPLIES.error, noCB);
			return;
		}
		if(data.length == 0){ // no one with that phone number?
			twilio.send(tel, REPLIES.unsubscribe.notSubscribed);
			return;
		}
		var user = data[0];
		db.getEventModel().find({ // this query finds event
			slug: path[0] // path[0] is the event slug
		}, function(err, dat){ 
			if(err || !dat){ // really 'if error's should be pretty self-explanatory
				twilio.send(tel, REPLIES.error, noCB);
				return;
			}
			if(dat.length != 1){
				twilio.send(tel, REPLIES.unsubscribe.nonexistentEvent, noCB);
				return;
			}
			var event = dat[0];
			db.getChannelModel().find({ // find the channel  
				event: event._id,		
				name: path[1] || "main" // path[1] is the channel name
			}, function(err, dt){
				if(err || !dat){
					twilio.send(tel, REPLIES.error, noCB);
					return;
				}
				if(dat.length != 1){
					twilio.send(tel, REPLIES.unsubscribe.nonexistentChannel, noCB);
					return;
				}
				var channel = dt[0];
				if(user.subscriptions.indexOf(channel._id) < 0){
					twilio.send(tel, REPLIES.unsubscribe.notSubscribed.format(path[0] + (path[1] ? " " + path[1] : "")), noCB);
					return;
				}
				db.getUserModel().update({ // update user database: find the user
					_id: user._id
				}, {
					$pull: {
						subscriptions: channel._id // take away the subscription
					}
				}, noCB);
				db.getChannelModel().update({ // update channel database: find the channel
					_id: channel._id
				}, {
					$pull: {
						subscribers: tel // remove the user's number from the subs list
					}
				}, function(err, d){ // callback
					if(err || !d){ // something went wrong
						twilio.send(tel, REPLIES.error, noCB);
						return;
					}
					twilio.send(tel, REPLIES.unsubscribe.success.format(path[0] + (path[1] ? " " + path[1] : "")), noCB); // successful unsubscribe
				});
			});
		});
	});
}


//  ----- EXPRESS PAGE SERVING
// this is the part that does the server
// using expressjs

var static = function(pth){ 
	return function(req, res){
		res.sendFile(pth, {root: path.join(__dirname, "../public")}); // serve stuff in the public folder when their urls are accessed
	}
}

// checks that the object has the info that is required for it to be used in later code. schema specifies said required info
var checkSchema = function(object, schema){
	for(field in object){
		if(!(field in schema)){ // matches fields in the object with fields in the schema
			return false;
		}
	}
	for(field in schema){
		if(schema[field].indexOf("optional") < 0 && !(field in object)){
			return false;
		}
		if(schema[field].indexOf("optional") >= 0 && !(field in object)){ // optional in one vs the other
			continue;
		}
		if(schema[field].indexOf((object[field].constructor === Array) ? "array" : typeof(object[field])) < 0){ // array != not array
			return false;
		}
	}
	return true;
}

var passwordHash = function(password, salt){ // hashes passwords
	for(var i = 0; i < HASH_COUNT; i++){
		var hash = crypto.createHash("sha512");
		password = hash.update(password).update(salt).digest("base64");
	}
	return password;
}

// serve css
app.get("/css/:file", function(req, res){
	res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

// serve js
app.get(/\/js\/(.*)/, function(req, res){
	res.sendFile("/js/" + req.params[0], {root: path.join(__dirname, "../public")});
});

// serve fonts
app.get(/\/font\/(.*)/, function(req, res){
	res.sendFile("/font/" + req.params[0], {root: path.join(__dirname, "../public")});
});

// serve images
app.get("/images/:file", function(req, res){
	res.sendFile("/images/" + req.params.file, {root: path.join(__dirname, "../public")});
});

// make requests to 'twilio' urls call the appropriate functions
app.post("/twilio", function(req, res){
	var message = req.body.Body.toLowerCase().split(/[\s\/]/g);
	
	// messages must start with the word 'ping', otherwise just respond with default reply
	if(message[0] != "ping"){
		twilio.send(req.body.From, REPLIES.default, noCB);
		return;
	}

	switch(message[1]){
		case "subscribe":
		case "sub":
			subscribe(req.body.From, message.slice(2)); // slice off the 'ping'
			break;
		case "unsubscribe":
		case "unsub":
		case "stop":
			unsubscribe(req.body.From, message.slice(2));
			break;
		case "help":
			twilio.send(req.body.From, REPLIES.help, noCB);
			break;
		case "default":
			twilio.send(req.body.From, REPLIES.default, noCB);
			break;
	}

	res.sendFile("/twilio.xml", {root: path.join(__dirname, "../public")});
});

// test for qr code generation
app.get("/qrtest", function(req, res){ // testing only
	res.send(qr("tsa-smash4"));
});

// test for twitter integration
app.get("/twitter", function(req, res){ // testing only
	tweet(function(data){
		console.log('Hi');
	}, "@ping_1t");
	res.send();
});

// test for examining database functionality
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

// handle post requests sent by frontend to create a new user / get someone registered with ping
app.post("/user/new", function(req, res){
	// when user sends a post request it contains a json object with the required info
	if(!checkSchema(req.body, { // make sure request sent has the appropriate information needed to create the user using the scheme check
		phone: "string",
		password: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}"); // if does not satisfy, send a failure message
		return;
	}
	cryptoString(8, function(err, salt){ // ask Matt / look up about cryptoString
		if(err || !salt){
			res.status(500).send("Internal error: failed generating salt.\n" + err);
			return;
		}
		db.getUserModel().find({ // find a user that has the phone number and has a password
			phone: req.body.phone, // some 'users' have only a number stored. you don't want to have to create an account to subscribe
			password: { 		// but you can register an account with a pssword to manage your own events and maybe other things?
				$exists: true // if they have a password, they are registered. if they don't, they may just be subscribed as a number, not a registered loginable user
			}
		}, function(err, data){ // callback
			if(err || !data){
				res.status(500).send("Internal error: failed retrieving data.\n" + err + ", " + data);
				return;
			}
			if(data.length > 0){
				res.status(200).send("{\"ok\": false, \"reason\": \"Account already exists.\"}");	// if the requested 'new user' already has a phone number + password 
				return;																				// in the database, they are already registered
			}
			
			// if no existing registered user with given number
			cryptoString(8, function(err, verCode){ // again I'm not sure what cryptoString does here
				db.getUserModel().update({ // update the database, adding the user
					phone: req.body.phone
				}, {
					$set: {
						password: passwordHash(req.body.password, salt), // hash their password
						salt: salt,	// salty
						verification: verCode
					},
					$setOnInsert: { // make sure that these arrays are initialized for the user object
						organized: [],
						participated: [],
						spectated: [],
						subscriptions: [],
						authTokens: []
					}
				}, {
					upsert: true
				}, function(err, dat){ // send success messages
					res.status(200).send("{\"ok\": true}"); 
					twilio.send(req.body.phone, "Your Ping account verification code is \"" + verCode + "\".  If you didn't try to make an account on Ping, you may ignore this message.");
				});
			});
		});
	});
});

app.post("/user/verify", function(req, res){ 
	if(!checkSchema(req.body, { 
		phone: "string",
		verificationCode: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}

	db.getUserModel().find({
		phone: req.body.phone,
		verification: req.body.verificationCode
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Inernal request: failed reading user data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"Invalid verification code.\"}");
			return;
		}
		cryptoString(24, function(err, token){
			if(err || !token){
				res.status(500).send("Internal error: failed generating token.");
				return;
			}
			res.cookie("authToken", token).cookie("phone", req.body.phone);
			res.status(200).send("{\"ok\": true}");
			twilio.send(req.body.phone, "You have succesfully registered for Ping!");
			db.getUserModel().update({
				phone: req.body.phone
			}, {
				$set: {
					verification: true
				},
				$push: {
					authTokens: token
				}
			}, noCB);
		});
	});
});

app.post("/user/auth", function(req, res){
	if(!checkSchema(req.body, {
		phone: "string",
		password: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}

	db.getUserModel().find({
		phone: req.body.phone,
		verification: true,
		password: {
			$exists: true
		}
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retrieving data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"User does not exist.\"}");
			return;
		}
		user = data[0];
		if(user.password == passwordHash(req.body.password, user.salt)){
			cryptoString(24, function(err, token){
				if(err || !token){
					res.status(500).send("Internal error: failed generating token.");
					return;
				}
				res.cookie("authToken", token).cookie("phone", req.body.phone);
				res.status(200).send("{\"ok\": true}");
				db.getUserModel().update({
					phone: req.body.phone
				}, {
					$push: {
						authTokens: token
					}
				}, noCB);
			});
		} else {
			res.status(200).send("{\"ok\": false, \"reason\": \"Incorrect password.\"}");
			return;
		}
	});
}); 

app.get("/event/listall", function(req, res){
	db.getEventModel().find({}, function(err, data){
		if(err || data.length < 1){
			res.status(500).send("Internal error: failed retrieving data.");
			return;
		}
		var message = {ok:true, events:[]};
		for(var i = 0; i < data.length; i++){
			message.events.push({name:data[i].name, slug:data[i].slug, format:data[i].format, image:data[i].image});
		}
		res.status(200).send(JSON.stringify(message));
	});
});

app.post("/event/new", function(req, res){
	if(!checkSchema(req.body, {
		name: "string",
		slug: "optional string",
		description: "optional string",
		format: "optional string",
		public: "optional string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}
	if(!req.cookies.phone || !req.cookies.authToken){
		res.status(200).send("{\"ok\": false, \"reason\": \"Insufficient priviliges.\"}");
		return;
	} 
	db.getUserModel().find({
		phone: req.cookies.phone,
		authTokens: {
			$in: [req.cookies.authToken]
		}
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retrieving user data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"You must login to create an event.\"}");
			return;
		}
		extend(req.body, {
			slug: req.body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, ""),
			format: "panel",
			channels: ["main"],
			organizers: [req.cookies.phone]
		});
		db.getEventModel().find({
			slug: req.body.slug
		}, function(err, data){
			if(err || !data){
				res.status(500).send("Internal error: failed retrieving event data.");
				return;
			}
			if(data.length > 0){
				res.status(200).send("{\"ok\": false, \"reason\": \"An event with that slug already exists.\"}");
				return;
			}
			db.getEventModel().create(req.body, function(err, dat){
				if(err || !dat){
					res.status(500).send("Internal error: failed inserting data.");
					return;
				}
				res.status(200).send("{\"ok\": true}");
				db.getChannelModel().create({
					name: "main",
					subscribers: [],
					event: dat._id,
					subChannels: []
				}, noCB);
			});
		});
	}); 
});

app.get("/event/:handle&slug=:slug", function(req, res){
	//console.log(req.query, req.params.handle, req.params.id, req.params.slug);
	//if(!req.params.slug && !req.params.id){
	if(!req.params.slug){
		//console.log("dbid " + req.params.id);
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters\"}");
		return;
	}

	db.getEventModel().findOne( {slug: req.params.slug}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed retrieving data.");
			return;
		}
//		//console.log("gotv here");
//		var participantPhones = [];
//		for(var i = 0; i < data.participants.length; i++){
//			db.getUserModel().findById( data.participants[i], function(errr, person){
//				if(errr || !person){
//					//console.log("supposed participant did not exist");
//				}
//				else{
//					participantPhones.push(person.name);
//				}
//			});
//		}
//
//		var organizerPhones = [];
//		for(var i = 0; i < data.organizers.length; i++){
//			db.getUserModel().findById( data.organizers[i], function(errr, person){
//				if(errr || !person){
//					//console.log("supposed organizer did not exist");
//				}
//				else{
//					organizerPhones.push(person.name);
//				}
//			});
//		}

		var message = data.toObject();
		message.ok = true;
//		message.participants = participantPhones;
//		message.organizers	 = organizerPhones;
		res.status(200).send(JSON.stringify(message));
		//console.log(message);
	});
});


app.get("/", static("/")); 

app.get("/user/new", static("/user/new.html"));

app.get("/events", static("/events.html"));

app.post("/post/:event/:channel", function(req, res){
	if(!checkSchema(req.body, {
		message: "string"
	})){
		res.status(200).send("{\"ok\": false, \"reason\": \"Invalid parameters.\"}");
		return;
	}
	if(!req.cookies.phone || !req.cookies.authToken){
		res.status(200).send("{\"ok\": false, \"reason\": \"Insufficient priviliges.\"}");
		return;
	} 
	db.getUserModel().find({
		phone: req.cookies.phone,
		authTokens: {
			$in: [req.cookies.authToken]
		}
	}, function(err, data){
		if(err || !data){
			res.status(500).send("Internal error: failed reading user data.");
			return;
		}
		if(data.length != 1){
			res.status(200).send("{\"ok\": false, \"reason\": \"Insufficient priviliges.\"}");
			return;
		}
		var user = data[0];
		db.getEventModel().find({
			slug: req.params.event,
			organizers: {
				$in: [req.cookies.phone]
			}
		}, function(err, dat){
			console.log(dat, req.params.event, req.cookies.phone);
			if(err || !dat){
				res.status(500).send("Internal error: failed reading event data.");
				return;
			}
			if(dat.length != 1){
				res.status(200).send("{\"ok\": false, \"reason\": \"Event does not exist or insufficient priviliges.\"}");
				return;
			}
			console.log(dat);
			var event = dat[0];
			db.getChannelModel().find({
				event: event._id,
				name: req.params.channel
			}, function(err, dt){
				if(err || !dt){
					res.status(500).send("Internal error: failed reading channel data.");
					return;
				}
				if(dt.length != 1){
					res.status(200).send("{\"ok\": false, \"reason\": \"Channel does not exist.\"}");
					return;
				}
				var channel = dt[0];
				twilio.send(channel.subscribers, "[" + event.slug + (channel.name == "main" ? "]" : "/" + channel.name + "]") + " " + req.body.message, noCB);
				res.status(200).send("{\"ok\": true}");
			}); 
		});
	});
});

app.get("/qr/:event/:channel", function(req, res){
	res.send(qr(req.params.event, req.params.channel));
});

http.listen(process.env.PORT || 1337, noCB);
