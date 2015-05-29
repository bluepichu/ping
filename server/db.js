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

// when the db starts, initialize
db.once("open", function (callback) {
	
	// schema define the patterns for the documents in the database
	// each 'type' has its own collection
	// these set up the expected form for data in the documents
	// and provide a way to access the collections
	
	var channelSchema = mongoose.Schema({
		name		: String,
		subscribers	: [String], // all subscribed to the channel; users and loose phones
		event		: { type: mongoose.Schema.ObjectId, ref: "Event" },
		subChannels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }] // notification to a channel is also sent to all subchannels
	});
	var userSchema = mongoose.Schema({
		name		: String,
		phone		: String,
		
		subscriptions	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }], // channels
		organized	: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is running
		participated: [{ type: mongoose.Schema.ObjectId, ref: "Event" }], // events the user is going to
		
		password	: String,
		salt		: String,
		authTokens	: [String],
		verification: mongoose.Schema.Types.Mixed
	});
	var eventSchema = mongoose.Schema({
		name		: String,
		slug		: String,
		description	: String,
		format		: String, // Tournament, Convention, Heats
		image		: String,
		
		channels	: [String],

		participants: [String],
		spectators	: [String], // users who subscribe to something in the event?
		subEvents	: [{ type: mongoose.Schema.ObjectId, ref: "SubEvent" }],
		// time		: Date
		organizers	: [String]
	});
	
	// I don't think we ended up implementing/using this
	var subEventSchema = mongoose.Schema({ // match, heat, or panel
		name		: String,
		description	: String,
		
		parentEvent : { type: mongoose.Schema.ObjectId, ref: "Event" },
		
		channels	: [{ type: mongoose.Schema.ObjectId, ref: "Channel" }],
		participants: [String],
		spectators	: [String],
		time		: Date,
		// endTime	: Date
	});
	
	Channel	= mongoose.model("Channel", channelSchema);
	User	= mongoose.model("User", userSchema);
	Event	= mongoose.model("Event", eventSchema);
	SubEvent= mongoose.model("SubEvent", subEventSchema);
	
});

console.log("pingdb initialized");


// I forgot to tell Matt that I wrote these functions so he wrote a lot of the server code
// assuming they didn't exist, writing his own functions :(
// if these work right they could simplify things, but we ended up
// removing a lot of the built-in mongo ID stuff so these functions don't quite function properly
// Also because of the callback structure there is some limit to ease of integration with other server functions

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


// these functions work though, allowing serv.js to access the database collections
// for each document type

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