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
		subscribed	: [String], // all subscribed to the channel; users and loose phones
		event		: { type: mongoose.Schema.ObjectId, ref: "Event" },
		subChannels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }] // notification to a channel is also sent to all subchannels
	});
	var userSchema = mongoose.Schema({
		name		: String,
		phone		: String,
		
		subscriptions	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }], // channels
		organized	: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is running
		participated: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is going to
		spectated	: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is spectating
		
		password	: String,
		salt		: String,
		authTokens	: [String]
	});
	var eventSchema = mongoose.Schema({
		name		: String,
		slug		: String,
		description	: String,
		format		: String, // Tournament, Convention, Heats
		
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

var newEvent = function(name, description, format){
	var evt = new Event();
	evt.name = name;
	evt.description = description;
	evt.format = format;
	evt.channels.push( newChannel(name + " main channel", evt.id) );
	evt.save(function(err, evt_saved){
	    if(err){
	        throw err;
	        console.log(err);
	    }else{
	        console.log("new event saved!");
	    }
	});
	return evt.id;
};

var newSubEvent = function(parentID, name, description, time){
	
	var subevt	= new SubEvent();
	subevt.name	= name;
	
	subevt.parentEvent = parentID;
	
	Event.findById(parentID, function(err, parent){
		if(err){
			throw err;
			console.log(err);
		} else{
			parent.subEvents.push(subevt.id);
		}
	});
	
	subevt.time = time;
	subevt.channels.push( newChannel(name + " subevent channel", parentID) );
	subevt.save(function(err, evt_saved){
	    if(err){
	        throw err;
	        console.log(err);
	    }else{
	        console.log("new subevent saved!");
	    }
	});
	return subevt.id;
};

var newChannel = function(name, eventID){
	var chnl	= new Channel();
	chnl.name	= name;
	chnl.event	= eventID;
	chnl.save(function(err, evt_saved){
	    if(err){
	        throw err;
	        console.log(err);
	    }else{
	        console.log("new channel saved!");
	    }
	});
	return chnl.id;
};

var attachSubChannel = function(channelID, subchannelID){
	Channel.findById(channelID, function(err, chan){
		// console.log("sub-chan is too kawaii");
		if(err){
			console.log("channel does not exist");
		}
		if(chan){
			Channel.findById(subchannelID, function(err, schan){
				if(err){
					console.log("subchannel does not exist");
				}
			});
			console.log("pushing subchannel");
			chan.subChannels.push(subchannelID);
			chan.save(function(err, evt_saved){
			    if(err){
			        throw err;
			        console.log(err);
			    }else{
			        console.log("new channel saved!");
			    }
			});
			console.log(chan.subChannels);
		}
	});
};

var createSubChannel = function(parentID, name, eventID){
	var subID = newChannel(name, eventID);
	attachSubChannel(parentID, subID);
};

var getChannelModel = function(){
	return Channel;
}

var getUserModel = function(){
	return User;
}

var getEventModel = function(){
	return Event;
}

var getSubEventModel = function(){
	return SubEvent;
}

module.exports = {
	getChannelModel		: getChannelModel,
	getUserModel		: getUserModel,
	getEventModel		: getEventModel,
	getSubEventModel	: getSubEventModel,
	newEvent	: newEvent,
	newSubEvent	: newSubEvent,
	newChannel	: newChannel,
	createSubChannel:createSubChannel
};