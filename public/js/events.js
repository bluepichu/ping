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
		 * @param {string} title    - Title for card
		 * @param {string} id       - Hex identifier for mongo query
		 * @param {string?} image   - URL for image
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
		/**
		 * Clear cards
		 */
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
	 * @constructor
	 */
	var modalEvent = new function() {
		var self = this;
		this.$modal = $("#modal-event");
		this.$more = $("#modal-more");
		/**
		 * @namespace
		 * @prop {object} $ - jQuery selectors
		 * @prop {object} counts - Index for sorting items into columns
		 * @type {{$: {organizers: JQuery, participants: JQuery, channels: JQuery, submit: JQuery}, counts: {organizers: number, participants: number, channels: number}}}
		 */
		this.modal = {
			$: {
				organizers: self.$modal.find("#event-organizers .col"),
				participants: self.$modal.find("#event-organizers .col"),
				channels: self.$modal.find("#event-channels .col"),
				channelSelect: self.$modal.find("#channel-select"),
				submit: self.$modal.find("#submit-event")
			},
			counts: {
				organizers: 0,
				participants: 0,
				channels: 0
			}
		};
		/**
		 * @namespace
		 * @type {{$: {matches: JQuery, brackets: JQuery}}}
		 * @prop $ - jQuery selectors
		 */
		this.more = {
			$: {
				matches: self.$more.find("#more-matches"),
				brackets: self.$more.find("#more-brackets")
			}
		};
		/** The slug for the modal to display
		 * @type {string} */
		this.id = undefined;
		this.favorite = false; // TODO: currently only aesthetic
		/** Whether or not to display message broadcast field
		 * @type {boolean} */
		this.isOrganizer = false;

		// Initialize modal buttons
		this.modal.$.submit.click(function() {self.toggle()});
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
					return;
				}
				var rec = JSON.parse(xhr.responseText);
				if (!rec.ok) {
					Materialize.toast("Request failed: " + rec.reason, 4000);
					return;
				}
				self.setTitle(rec.name);
				self.setDescription(rec.description);
				self.modal.$.organizers.empty();
				self.modal.$.participants.empty();
				self.modal.$.channels.empty();
				self.modal.$.channelSelect.material_select("destroy");
				self.modal.$.channelSelect.empty();
				for (var i = 0; i < rec.organizers.length; i++){
					self.addOrganizer(rec.organizers[i]);
				}
				for (var i = 0; i < rec.participants.length; i++){
					self.addParticipant(rec.participants[i]);
				}
				for (var i = 0; i < rec.channels.length; i++){
					self.addChannel(rec.channels[i]); // TODO: show enabled/disabled channel
				}
				self.modal.$.channelSelect.find("option:first-child").prop("selected", true);
				self.modal.$.channelSelect.material_select();
				// QR code gen
				console.log(self.$modal.find("#event-channels").find(".channel input"));
				self.$modal.find("#event-channels").find(".channel input").click(function() {
					console.log("clicked channel");
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
				self.modal.$.submit.text("Remove");
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
		 * @param {string} [description] Description to display
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
		 * @param {URL} [img] Location of profile image
		 * @see modalEvent#show()
		 */
		this.addOrganizer = function(name, img) {
			if (img === undefined) {
				img = "<i class=\"mdi-action-account-circle\"></i>"
			} else {
				img = "<img src=\"" + img + "\" />";
			}
			$(this.modal.$.organizers[this.modal.counts.organizers]).append(
				"<div class=\"organizer\">" +
				img +
				"<span>" + name + "</span>" +
				"</div>"
			);
			this.modal.counts.organizers = (this.modal.counts.organizers + 1) % 2;
		};

		/**
		 * Add a participant to event modal
		 * @param {string} name Name of participant
		 * @param {URL} [img] Location of profile image
		 * @see modalEvent#show()
		 */
		this.addParticipant = function(name, img) {
			if (img === undefined) {
				img = "<i class=\"mdi-action-account-circle\"></i>"
			} else {
				img = "<img src=\"" + img + "\" />";
			}
			$(this.modal.$.participants[this.modal.counts.participants]).append(
				"<div class=\"participant\">" +
				img +
				"<span>" + name + "</span>" +
				"</div>"
			);
			this.modal.counts.participants = (this.modal.counts.participants + 1) % 3;
		};

		/**
		 * Add a channel to event modal
		 * @param {string} channel Name of channel
		 * @param {boolean} enabled Channel enabled or disabled
		 * @see modalEvent#show()
		 */
		this.addChannel = function(channel, enabled) {
			$(this.modal.$.channels[this.modal.counts.channels]).append(
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
			this.modal.$.channelSelect.append("<option value='" + channel + "' name='" + channel + "'>" + channel + "</option>");
			this.modal.counts.channels = (this.modal.counts.channels + 1) % 3;
		};

		/**
		 * Add or remove event as "favorite"
		 */
		this.toggle = function() {
			console.log(this.id);
			if (this.favorite) {
				this.modal.$.submit.text("Add");
			} else {
				this.modal.$.submit.text("Remove");
			} 
			this.favorite = !this.favorite;
			// TODO: Preferably do something on the server end
		};

		/**
		 * Add a match to the match list
		 * @param {Object} players The players involved in the match
		 * @config {string} first The player to be displayed on the left
		 * @config {string} second The player to be displayed on the right
		 * @param {Object} [icons] The images to display next to each name
		 * @config {URL} [first] The link to the left player's image
		 * @config {URL} [second] The link the the right player's image
		 */
		this.addMatch = function(players, icons) {
			// Check if icons are provided or replace with default icon
			if (icons === undefined) {
				icons = {
					first: "<i class=\"mdi-action-account-circle\"></i>",
					second: "<i class=\"mdi-action-account-circle\"></i>"
				}
			} else {
				icons.first = icons.first ? "<img class=\"circle\" src=\"" + icons.first + "\" />" :
					"<i class=\"mdi-action-account-circle\"></i>";
				icons.second = icons.second ? "<img class=\"circle\" src=\"" + icons.second + "\" />" :
					"<i class=\"mdi-action-account-circle\"></i>";
			}
			$(  "<div class=\"waves-effect match-item\">" +
					icons.first + "<span>" + players.first + "</span>" +
					+ "<h1>vs.</h1>" +
					"<span>" + players.second + "</span>" + icons.second +
				"</div>"
			).appendTo(this.more.$.matches).data("id", 1); // TODO: add id to each match
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
						setTimeout(function() {
							self.$modal.openModal()
						}, 100)
					}
				})
			}, 300);
			// Populate title and description fields
			$("#more-title").text($("#event-title").text());
			$("#more-description").text($("#event-description").text());
			if (!this.more.$.matches.is(':empty')) {
				this.more.$.matches.empty();
			}
			if (!this.more.$.brackets.is(':empty')) {
				this.more.$.brackets.empty();
			}

			// TODO: add matches to list using this.addMatch()

			// TODO: Integrate participant/backend stuff with tournament creation
			// Hard coded data for now
			var tb = new tbracket('single', 'strict');
			for (var i = 0; i < 7; i++) {
				tb.addParticipant("Team " + (i + 1));
			}
			tb.startTournament();

			// TODO: CSS to center the bracket
			this.more.$.brackets.bracket({
				init: tb.getData(), /* data to initialize the bracket with */
				skipConsolationRound: !tb.isConsolation(),
				save: tb.saveFn,
				userData: "",	// TODO: MongoDB integration
				// TODO: pull up modal with participant data/phone #s
				onMatchClick: function(data) {console.log(data);}
			});
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
		xhr.onload = function() {
			if (this.status != 200){
				Materialize.toast(this.responseText, 4000);
				return;
			}
			var response = JSON.parse(this.responseText);

			if (!response.ok) {
				Materialize.toast("Request failed: " + response.reason, 4000);
				return;
			}
			Materialize.toast("Event created.", 2000);
			$("#modal-create").closeModal();

			setTimeout(function(){
				location.reload();
			}, 2000);
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
				return;
			}
			var response = JSON.parse(this.responseText);

			if (response.ok){
				Materialize.toast("Message posted.");
			} else {
				Materialize.toast("Request failed: " + response.reason, 4000);
			}
		};
		xhr.open("POST", "/post/" + modalEvent.id + "/" + $("#channel-select").val(), true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify({
			message: $("#message-text").val()
		}));
	});
});