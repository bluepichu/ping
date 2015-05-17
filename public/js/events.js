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
	var modalEvent = new function() {
		var self = this;
		this.$modal = $("#modal-event");
		this.$more = $("#modal-more");
		this.$organizers = this.$modal.find("#event-organizers .col");
		this.ocount = 0;
		this.$participants = this.$modal.find("#event-participants .col");
		this.pcount = 0;
		this.$channels = this.$modal.find("#event-channels .col");
		this.ccount = 0;
		this.$submit = this.$modal.find("#submit-event");
		this.id = undefined;
		this.favorite = false;
		this.participants = ["Bob", "Tom", "Odd"];
		this.isOrganizer = false;
		this.$submit.click(function() {self.toggle()});
		this.$modal.find("#event-more").click(function() {self.showMore()});
		this.$modal.find(".channel").click(function() {
			if ($(this).find("input").checked()) {
				var $qr = $("body").append("<img src=\"/qr/" + self.id + "/" + $(this).text().toLowerCase() + "\" class=\"materialboxed\"/>");
				$qr.materialbox();
				$qr.click();
				$qr.click(function() {
					$qr.remove();
				})
			}
		});

		/**
		 * Populate modal with event information before showing the modal
		 * @param {string} id MongoDB id for event
		 */
		this.show = function(id) {
			//console.log(id);
			this.id = id;
			var me = this;
			var xhr = new XMLHttpRequest();
			xhr.onload = function(){
				if(this.status != 200){
					Materialize.toast(this.responseText, 4000);
				} else {
					var rec = JSON.parse(xhr.responseText);	
					if( rec.ok ){
						me.setTitle(rec.name);
						me.setDescription(rec.description || "<p style='opacity: .54;'>No description.</p>");
						for(var i = 0; i < rec.organizers.length; i++){
							me.addOrganizer(rec.organizers[i]);
						}
						for(var i = 0; i < rec.participants.length; i++){
							me.addParticipant(rec.participants[i]);
						}	
						//if (part of user's events...)
						me.favorite = true;
						me.$submit.text("Remove");
						//} else {
							//this.favorite = false;
							//this.$submit.text("Add");
						//}
						self.isOrganizer = (rec.organizers.indexOf($.cookie("phone")) >= 0);
						me.$modal.openModal();
					}
					else{
						Materialize.toast("Request failed: " + rec.reason, 4000);
					}
				}
			}
			xhr.open("GET", "/event/:handle&slug=" + this.id, true);
			xhr.setRequestHeader("Content-Type", "application/json");
			//console.log("stringy " + JSON.stringify( {id:this.id} ));
			xhr.send();
			
		};
		this.setTitle = function(title) {
			$("#event-title").text(title);
		};
		this.setDescription = function(description) {
			$("#event-description").text(description)
		};
		/**
		 * Add an organizer
		 * @param {string} name
		 * @param {URL?} img
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
		 * Add a participant
		 * @param {string} name
		 * @param {URL?} img
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
		 * Add a channel
		 * @param {string} channel
		 * @param {string?} enabled
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
			this.ccount = (this.ccount + 1) % 3;
		};
		// Add to/remove from user's events
		this.toggle = function() {
			console.log(this.id);
			if (this.favorite) {
				this.$submit.text("Add");
			} else {
				this.$submit.text("Remove");
			}
			this.favorite = !this.favorite;
		};
		// Reveal additional information modal
		this.showMore = function() {
			this.$modal.closeModal();
			setTimeout(function() {self.$more.openModal({
				complete: function() {
					setTimeout(function() {self.$modal.openModal()}, 100)
				}})
			}, 300);
			$("#more-title").text($("#event-title").text());
			$("#more-description").text($("#event-description").text());

			var shuffle = function(array) {
				var m = array.length, t, i;
				// While there remain elements to shuffle…
				while (m) {
					// Pick a remaining element…
					i = Math.floor(Math.random() * m--);
					// And swap it with the current element.
					t = array[m];
					array[m] = array[i];
					array[i] = t;
				}

				return array;
			};
			// Check for data, if no data on server:
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
				// Do something to save to server
			};
			$('#more-bracket').bracket({
				init: data /* data to initialize the bracket with */,
				save: saveData
			})
		}
	}();
	modalEvent.addParticipant("hi");
	modalEvent.addChannel("hi again");
	
	var getEventList = function(){
		var xhr = new XMLHttpRequest();
		xhr.onload = function(){
			if(this.status != 200){
				Materialize.toast(this.responseText, 4000);
			} else {
				var rec = JSON.parse(xhr.responseText);	
				if( rec.ok ){
					for(var i = 0; i < rec.events.length; i++){
						cards.add(rec.events[i].name, rec.events[i].slug, rec.events[i].image);
					}
				}
				else{
					Materialize.toast("Request failed: " + rec.reason, 4000);
				}
			}
		}
		xhr.open("GET", "/event/listall", true);
		xhr.send();
	}
	
	getEventList();
	
	cards.add("Smash Tourney", "test-id");
	cards.add("Amaze", "amazing-race");
	$("#create-form").submit(function(e){
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
					Materialize.toast("Event created.", 4000);
					$("#modal-create").closeModal();
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
});