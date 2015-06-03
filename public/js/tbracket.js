/**
 * Created by Lucas on 6/3/15.
 */

var tbracket = (function() {

	// Private variables
	var participants;
	var bracketsize;
	var initialized;
	var matchups;
	var results;

	var bracketType; // Can be 'single' or 'double'
	var thirdplacematch; // Can be true or false
	var seedingType; // Can be 'random' or 'strict' or 'loose'

	//Functions
	var addParticipant = function(participant) {
		participants.push(participant);
		determineBracketSize();
	};

	var determineBracketSize = function() {
		while (bracketsize < participants.length) {
			bracketsize *= 2;
		}
		while (bracketsize/2 > participants.length) {
			bracketsize /= 2;
		}
	};

	var structureTournament = function() {
		fillByes();
		if (seedingType == 'random') {
			shuffleSeeds();
			randomSeeds(participants);
		} else if (seedingType == 'strict') {
			strictSeeds();
		} else if (seedingType == 'loose') {
			looseSeeds();
		}
	};

	var fillByes = function() {
		while (participants.length < bracketsize) {
			participants.push('--');
		}
	};

	var shuffleSeeds = function() {
		var m = participants.length, t, i;
		// While there remain elements to shuffle…
		while (m) {
			// Pick a remaining element…
			i = Math.floor(Math.random() * m--);
			// And swap it with the current element.
			t = participants[m];
			participants[m] = participants[i];
			participants[i] = t;
		}
	};

	var randomSeeds = function(arr) {
		var p = arr;
		var m = p.length;
		var prev = null;
		while (p.length > 0) {
			var i = Math.floor(Math.random() * m--);
			if (prev == null) {
				prev = p[i];
			} else {
				matchups.push([prev, p[i]]);
				prev = null;
			}
			p.splice(i, 1);
		}
	};

	var strictSeeds = function() {
		var half = participants.length / 2;
		for (var i = 0; i < half; i++) {
			matchups.push(null);
		}
		for (i = 0; i < half; i++) {
			matchups[(i%2 == 0 ? i/2 : half-(i-1)/2-1)] =
				[participants[i], participants[participants.length - i - 1]];
		}
	};

	var looseSeeds = function() {
		matchups.push([participants[i], participants[participants.length - 1]]);
		randomSeeds(participants.slice(1, participants.length - 1));
	};

	var initBlankResults = function() {
		if (bracketType == 'single') {
			results = [];
		} else if (bracketType == 'double') {
			results = [[[[]]],[],[]];
		}
	};

	var startTournament = function() {
		structureTournament();
		initBlankResults();
		initialized = true;
	};

	var getData = function() {
		if (initialized) {
			return {
				teams: matchups,
				results: results
			};			
		}

	};

	var isInitialized = function() {return initialized;};

	/* Called whenever bracket is modified
	 *
	 * data:     changed bracket object in format given to init
	 * userData: optional data given when bracket is created.
	 */
	var saveFn = function(data, userData) {
		//console.log(data);
		matchups = data.teams;
		results = data.results;
		// console.log(matchups, results);

		//var json = jQuery.toJSON(data);
		// $('#saveOutput').text('POST '+userData+' '+json);
		/* You probably want to do something like this
		 jQuery.ajax("rest/"+userData, {contentType: 'application/json',
		 dataType: 'json',
		 type: 'post',
		 data: json})
		 */
	};

	/* Save and Load functions
	 * Meant to be able to be stored in the database and retrieved
	 */
	var save = function() {
		return {
			"participants": participants,
			"matchups": matchups,
			"results": results,
			"bracketsize": bracketsize,
			"seedingType": seedingType,
			"bracketType": bracketType,
			"thirdplacematch": thirdplacematch,
			"initialized": initialized
		};
	};

	var load = function(sb) {
		participants = sb["participants"];
		matchups = sb["matchups"];
		results = sb["results"];
		bracketsize = sb["bracketsize"];
		seedingType = sb["seedingType"];
		bracketType = sb["bracketType"];
		thirdplacematch = sb["thirdplacematch"];
		initialized = sb["initialized"];
	};

	//Constructor
	var tbracket = function (bt, st, tpm) {
		participants = [];
		matchups = [];
		results = [];
		bracketsize = 2;
		seedingType = (st ? st : 'random'); //Default
		bracketType = (bt ? bt : 'single'); //Default
		thirdplacematch = (tpm != null ? tpm : true); //Default
		initialized = false;
	};

	//Debugging
	var printParticipants = function() {
		console.log(participants);
	};

	var printMatchups = function() {
		console.log(matchups)
	};

	var printResults = function() {
		console.log(results)
	};

	//Prototype
	tbracket.prototype = {
		constructor: tbracket,
		isInitialized: isInitialized,
		getData: getData,
		addParticipant: addParticipant,
		startTournament: startTournament,
		saveFn: saveFn,
		save: save,
		load: load,

		//Debug
		printParticipants: printParticipants,
		printMatchups: printMatchups,
		printResults: printResults
	};

	return tbracket;

})();