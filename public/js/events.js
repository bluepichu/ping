$(function() {
	$(".fixed-action-btn").click(function() {
		var $modal = $("#modal-create");
		// Reset modal to defaults
		$modal.find("#create-name").val("");
		$modal.find("#create-description").val("");
		$modal.find("#create-format").val("tournament").material_select();
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
		this.colCount = 0;
		this.$modal = $("#modal-event");
		this.$more = $("#modal-more");
		this.cols = this.$modal.find(".col");
		this.$submit = this.$modal.find("#submit-event");
		this.id = undefined;
		this.favorite = false;
		this.participants = ["Bob", "Tom", "Odd"];
		this.$submit.click(function() {self.toggle()});
		this.$modal.find("#event-more").click(function() {self.showMore()});

		/**
		 * Populate modal with event information before showing the modal
		 * @param {string} id MongoDB id for event
		 */
		this.show = function(id) {
			//console.log(id);
			this.id = id;
			// Grab title, description, participants
			//this.participants = // give array of participants
			var me = this;
			var xhr = new XMLHttpRequest();
			xhr.onload = function(){
				if(this.status != 200){
					Materialize.toast(this.responseText, 4000);
				} else {
					var rec = JSON.parse(xhr.responseText);	
					if( rec.ok ){
						this.setTitle(rec.name);
						this.setDescription(rec.description);
						for(var i = 0; i < rec.participants.length; i++){
							this.addParticipant(rec.participants[i]);
						}	
						//if (part of user's events...)
						this.favorite = true;
						this.$submit.text("Remove");
						//} else {
							//this.favorite = false;
							//this.$submit.text("Add");
						//}
						me.$modal.openModal();
					}
					else{
						Materialize.toast("Request failed: " + rec.reason, 4000);
					}
				}
			}
			xhr.open("GET", "/event/:handle", true);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.send(JSON.stringify({slug:id}));
			
			};
		this.setTitle = function(title) {
			$("#event-title").text(title);
		};
		this.setDescription = function(description) {
			$("#event-description").text(description)
		};
		this.addParticipant = function(name, img) {
			if (img === undefined) {
				img = "<i class=\"mdi-action-account-circle\"></i>"
			} else {
				img = "<img src=\"" + img + "\" />";
			}
			$(this.cols[this.colCount]).append(
				"<div class=\"participant\">" +
					img +
					"<span>" + name + "</span>" +
				"</div>"
			);
			this.colCount = (this.colCount + 1) % 2;
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
	cards.add("Smash Tourney", "test-id");
	//modalEvent.show();

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
});