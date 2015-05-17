
var uristring = "mongodb://localhost:27017/ping";
console.log("uristring is " + uristring);

var mongoose = require("mongoose");

mongoose.connect(uristring);

var db = mongoose.connection;

var Channel;
var User;
var Event;
var SubEvent;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function (callback) {
	var channelSchema = mongoose.Schema({
		name		: String,
		subscribed	: [mongoose.Schema.Types.Mixed], // all subscribed to the channel; users and loose phones
		event		: { type: mongoose.Schema.ObjectId, ref: "Event" },
		subChannels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }] // notification to a channel is also sent to all subchannels
	});
	var userSchema = mongoose.Schema({
		name		: String,
		phone		: String,
		channels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }], // channels
		organized	: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is running
		participated: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is going to
		spectated	: [{ type: mongoose.Schema.ObjectId, ref: "Event" }] // events the user is spectating
	});
	var eventSchema = mongoose.Schema({
		name		: String,
		description	: String,
		phones		: [String], // for loose phones that have subscribed to something in the event
		channels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }],
		participants: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
		spectators	: [{ type: mongoose.Schema.ObjectId, ref: "User" }], // users who subscribe to something in the event?
		subEvents	: [{ type: mongoose.Schema.ObjectId, ref: "SubEvent" }]
		// time		: Date
	});
	var subEventSchema = mongoose.Schema({ // match, heat, or panel
		name		: String,
		description	: String,
		
		parentEvent : { type: mongoose.Schema.ObjectId, ref: "Event" },
		
		channels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }],
		participants: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
		spectators	: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
		time		: Date,
		// endTime	: Date
	});
	
	Channel	= mongoose.model("Channel", channelSchema);
	User	= mongoose.model("User", userSchema);
	Event	= mongoose.model("Event", eventSchema);
	SubEvent= mongoose.model("SubEvent", subEventSchema);
	
});

console.log("pingdb initialized");

var newEvent = function(name, description){
	var evt = new Event();
	evt.name = name;
	evt.description = description;
	evt.save(function(err, user_Saved){
	    if(err){
	        throw err;
	        console.log(err);
	    }else{
	        console.log("saved!");
	    }
	});
	return evt;
}


module.exports = {
	newEvent	: newEvent,
	Channel		: Channel,
	User		: User,
	Event		: Event,
	SubEvent	: SubEvent
}

