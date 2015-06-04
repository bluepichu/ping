$(function() {
	$(".fixed-action-btn").click(function() {
		var $modal = $("#modal-create");
		// Reset modal to defaults
		$modal.find("#create-name").val("");
		$modal.find("#create-description").val("");
		$modal.find("#create-public").prop('checked', true);
		// Open modal
		$modal.openModal();
	});
	var cards = new function() {
		this.count = 0;
		this.defaultImg = "<div class=\"icon\"><i class=\"mdi-action-event\"></i></div>";
		this.$columns = [$("#col1"), $("#col2"), $("#col3")];

		/**
		 * Add a card
		 * @param {string} title Title for card
		 * @param {string} id Hex identifier for mongo query
		 * @param {string?} image URL for image
		 */
		this.add = function(title, id, image) {
			var img = "<img src=\"" + image + "\"/>";
			if (image === undefined) {
				img = this.defaultImg;
			}
			this.$columns[this.count % 3].append(
				"<div class=\"card small waves-effect waves-light\">" +
				"<div class=\"card-image fill-card\">" +
				img +
				"<span class=\"card-title\">" + title + "</span>" +
				"</div>" +
				"</div>"
			).data("id", id)
			.click(function() {
				modalEvent.show($(this).data("id"));
			});
			this.count++;
		};
		this.clear = function() {
			this.count = 0;
			this.$columns.forEach(function (column) {
				column.empty();
			});
		};
	};

	/**
	 * Modal for event viewing
	 * Call {@link modalEvent#show()} with id to open the modal
	 */
	var modalEvent = new function() {
		var self = this;
		this.$modal = $("#modal-event");
		this.$more = $("#modal-more");
		this.$organizers = this.$modal.find("#event-organizers .col");
		/** For sorting organizers into columns */
		this.ocount = 0;
		this.$participants = this.$modal.find("#event-participants .col");
		/** For sorting participants into columns */
		this.pcount = 0;
		this.$channels = this.$modal.find("#event-channels .col");
		this.$channelSelect = this.$modal.find("#channel-select");
		/** For sorting channels into columns */
		this.ccount = 0;
		this.$submit = this.$modal.find("#submit-event");
		/** The slug for the modal to display */
		this.id = undefined;
		this.favorite = false; // TODO: currently only aesthetic
		/** Array of participants for tournament bracket */
		this.participants = [];
		/** Whether or not to display message broadcast field */
		this.isOrganizer = false;

		// Initialize modal buttons
		this.$submit.click(function() {self.toggle()});
		this.$modal.find("#event-more").click(function() {self.showMore()});

		/**
		 * Populate modal with event information before showing the modal
		 * @param {string} id MongoDB slug for event
		 */ 
		this.show = function(id) {
			this.id = id;
			var xhr = new XMLHttpRequest();
			xhr.onload = function() {
				if (this.status != 200) {
					Materialize.toast(this.responseText, 4000);
				} else {
					var rec = JSON.parse(xhr.responseText);	
					if (rec.ok) {
						self.setTitle(rec.name);
						self.setDescription(rec.description);
						self.$organizers.empty();
						self.$participants.empty();
						self.$channels.empty();
						self.$channelSelect.material_select("destroy");
						self.$channelSelect.empty();
						for (var i = 0; i < rec.organizers.length; i++){
							self.addOrganizer(rec.organizers[i]);
						}
						for (var i = 0; i < rec.participants.length; i++){
							self.addParticipant(rec.participants[i]);
						}
						for (var i = 0; i < rec.channels.length; i++){
							self.addChannel(rec.channels[i]); // TODO: show enabled/disabled channel
						}
						self.$channelSelect.find("option:first-child").prop("selected", true);
						self.$channelSelect.material_select();
						// QR code gen
						console.log(self.$modal.find("#event-channels").find(".channel input"));
						self.$modal.find("#event-channels").find(".channel input").click(function() {
							console.log("clicked channel");
							//console.log($(this).is(':checked'));
							console.log($(this).parent().parent().parent().text().trim().toLowerCase());
							//if ($(this).is(':checked')) {
							$("body").append("<img src=\"/qr/" + self.id + "/" + $(this).parent().parent().parent().text().trim().toLowerCase() + "\" class=\"materialboxed\" id=\"z\"/>");
							var $qr = $("#z");
							$qr.materialbox();
							$qr.click();
							$qr.click(function() {
								$qr.remove();
							});
							//}
						});
						// TODO: check if added event or not
						self.favorite = true;
						self.$submit.text("Remove");
						//} else {
						//this.favorite = false;
						//this.$submit.text("Add");
						//}
						self.isOrganizer = (rec.organizers.indexOf($.cookie("phone")) >= 0);
						if (self.isOrganizer){
							$(".organizer-only").css("display", "block");
						} else {
							$(".organizer-only").css("display", "none");
						}
						// Open the modal
						self.$modal.openModal();
					} else {
						Materialize.toast("Request failed: " + rec.reason, 4000);
					} 
				}
			};
			xhr.open("GET", "/event/:handle&slug=" + this.id, true);
			xhr.setRequestHeader("Content-Type", "application/json");
			//console.log("stringy " + JSON.stringify( {id:this.id} ));
			xhr.send();
		};

		/**
		 * Set the title of the modal
		 * @param title {string} Title of the event to display
		 * @see modalEvent#show()
		 */
		this.setTitle = function(title) {
			$("#event-title").text(title);
		};

		/**
		 * Set the description of the event
		 * @param description {string?} Description to display
		 * @see modalEvent#show()
		 */
		this.setDescription = function(description) {
			if (description) {
				$("#event-description").text(description);
			} else {
				$("#event-description").html("<p style='opacity: .54'>No description.</p>");
			}
		};

		/**
		 * Add an organizer to event modal
		 * @param {string} name Name of organizer
		 * @param {URL?} img Location of profile image
		 * @see modalEvent#show()
		 */
		this.addOrganizer = function(name, img) {
			if (img === undefined) {
				img = "<i class=\"mdi-action-account-circle\"></i>"
			} else {
				img = "<img src=\"" + img + "\" />";
			}
			$(this.$participants[this.ocount]).append(
				"<div class=\"participant\">" + // Who cares if it uses the same css as participants
				img +
				"<span>" + name + "</span>" +
				"</div>"
			);
			this.ocount = (this.ocount + 1) % 2;
		};

		/**
		 * Add a participant to event modal
		 * @param {string} name Name of participant
		 * @param {URL?} img Location of profile image
		 * @see modalEvent#show()
		 */
		this.addParticipant = function(name, img) {
			if (img === undefined) {
				img = "<i class=\"mdi-action-account-circle\"></i>"
			} else {
				img = "<img src=\"" + img + "\" />";
			}
			$(this.$participants[this.pcount]).append(
				"<div class=\"participant\">" +
				img +
				"<span>" + name + "</span>" +
				"</div>"
			);
			this.pcount = (this.pcount + 1) % 3;
		};

		/**
		 * Add a channel to event modal
		 * @param {string} channel Name of channel
		 * @param {boolean} enabled Channel enabled or disabled
		 * @see modalEvent#show()
		 */
		this.addChannel = function(channel, enabled) {
			$(this.$channels[this.ccount]).append(
				"<div>" +
				"<span>" + channel + "</span>" +
				"<div class=\"switch\" style=\"float: right\">" +
				"<label>" +
				"<input type=\"checkbox\"" + (enabled ? "checked=\"checked\"" : "") + ">" +
				"<span class=\"lever\"></span>" +
				"</label>" +
				"</div>" +
				"</div>"
			);
			this.$channelSelect.append("<option value='" + channel + "' name='" + channel + "'>" + channel + "</option>"); 
			this.ccount = (this.ccount + 1) % 3;
		};

		/**
		 * Add or remove event as "favorite"
		 */
		this.toggle = function() {
			console.log(this.id);
			if (this.favorite) {
				this.$submit.text("Add"); 
			} else {
				this.$submit.text("Remove");
			} 
			this.favorite = !this.favorite;
			// TODO: Preferably do something on the server end
		};

		/**
		 * Open new modal with (longer?) description and tournament bracket
		 * On close, opens main event modal back up
		 */
		this.showMore = function() {
			// Only one modal can open at a time, add callback to open main modal after close
			this.$modal.closeModal();
			setTimeout(function() {
				self.$more.openModal({
					complete: function() {
						setTimeout(function() {self.$modal.openModal()}, 100)
					}
				})
			}, 300);
			// Populate title and description fields
			$("#more-title").text($("#event-title").text());
			$("#more-description").text($("#event-description").text());

			// TODO: Tournament Bracket

			// Hard coded data for now
			var tb = new tbracket('double', 'strict');
			for (var i = 0; i < 7; i++) {
				tb.addParticipant("Team " + (i + 1));
			}
			tb.startTournament();
			$(function() {
				$('#more-bracket').bracket({
					init: tb.getData(), /* data to initialize the bracket with */
					skipConsolationRound: !tb.isConsolation(),
					save: tb.saveFn,
					userData: ""	// TODO MongoDB integration
				})
			});
			modbrackets(); // Keep at the end of this.showMore

			/**
			 * Shuffle an array
			 * @param arr Array to shuffle
			 * @returns {*} Shuffled array
			 */
			/* var shuffle = function(arr) {
				var m = arr.length, t, i;
				// While there remain elements to shuffle…
				while (m) {
					// Pick a remaining element…
					i = Math.floor(Math.random() * m--);
					// And swap it with the current element.
					t = arr[m];
					arr[m] = arr[i];
					arr[i] = t;
				}
				return arr;
			};
			// Check for data, if no data on server, initialize with empty arrays
			var data = {teams: [], results: []};
			var participants = shuffle(this.participants);
			for (var i = 0; i < participants.length; i+=2) {
				if (i + 1 === participants.length) {
					data.teams.push([participants[i], "N/A"]);
					data.results.push([0, -1]);
				} else {
					data.teams.push([participants[i], participants[i + 1]]);
					data.results.push([undefined, undefined]);
				}
			}
			var saveData = function() {
				// TODO: Do something to save to server
			};

			 // Create tournament bracket on empty div
			 $('#more-bracket').bracket({
			 init: data ,
			 save: saveData
			 }); */
		}
	}();

	// Query server for events
	var getEventList = function() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(){
			if (this.status != 200){
				Materialize.toast(this.responseText, 4000);
			} else {
				var rec = JSON.parse(xhr.responseText);
				if (rec.ok){
					for (var i = 0; i < rec.events.length; i++) {
						cards.add(rec.events[i].name, rec.events[i].slug, rec.events[i].image);
					}
				} else {
					Materialize.toast("Request failed: " + rec.reason, 4000);
				}
			}
		};
		xhr.open("GET", "/event/listall", true);
		xhr.send();
	};

	getEventList();

	// Submit event creation
	$("#create-form").submit(function(e) {
		e.preventDefault();

		var data = $(this).serializeArray();
		var json = {};

		for (var i = 0; i < data.length; i++) {
			json[data[i].name] = data[i].value;
		}

		var xhr = new XMLHttpRequest();
		xhr.onload = function(){
			if (this.status != 200){
				Materialize.toast(this.responseText, 4000);
			} else {
				var response = JSON.parse(this.responseText);

				if (response.ok){
					Materialize.toast("Event created.", 2000);
					$("#modal-create").closeModal();

					setTimeout(function(){
						location.reload();
					}, 2000);
				} else {
					Materialize.toast("Request failed: " + response.reason, 4000);
				}
			}
		};
		xhr.open("POST", "/event/new", true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify(json));
	});

	$("#create-event").click(function() {
		$("#create-form").trigger("submit");
	});

	// TODO: un-uglify this
	$("#create-name").bind("change paste input keyup", function() {
		if (!$(this).data("previous")) {
			$(this).data("previous", "");
		}
		if ($("#create-slug").val() == $(this).data("previous").toLowerCase().replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "")) {
			$("#create-slug").val($(this).val().toLowerCase().replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, ""));
		}
		$(this).data("previous", $(this).val());
	});

	$("#new-channel").click(function(){
		$("#modal-event").closeModal();
		setTimeout(function() {$("#modal-add-channel").openModal()}, 300);
	}); 

	$("#post-message-submit").click(function(){
		$("form#post-message").submit();
	});

	$("form#post-message").submit(function(e){
		e.preventDefault();

		var xhr = new XMLHttpRequest();
		xhr.onload = function(){
			if (this.status != 200){
				Materialize.toast(this.responseText, 4000);
			} else {
				var response = JSON.parse(this.responseText);

				if (response.ok){
					Materialize.toast("Message posted.");
				} else {
					Materialize.toast("Request failed: " + response.reason, 4000);
				}
			}
		};
		xhr.open("POST", "/post/" + modalEvent.id + "/" + $("#channel-select").val(), true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify({
			message: $("#message-text").val()
		}));
	});
});

// Additional code to modify behavior and appearance of the jQuery brackets
var modbrackets = function() {

	var validMatch = function(e) {
		for (var i = 0; i < 2; i++) {
			if ($(e.target.parentElement.parentElement).find('.team')[i].getAttribute('data-teamid') == '-1') {
				return false
			}
		}
		return true;
	};

	$(document).ready(function() {
		$('.tools').remove();
		$('.label').click(function(e) {
			if (validMatch(e)) {
				console.log('click', e.target);
				// TODO Add code to call modal window and obtain participant data / send text to them
			}
		});
	});

};