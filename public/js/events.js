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
		this.cols = this.$modal.find(".col");
		this.$submit = this.$modal.find("#submit-event");
		this.id = undefined;
		this.favorite = false;
		this.$submit.click(function() {self.toggle()});

		/**
		 * Populate modal with event information before showing the modal
		 * @param {string} id MongoDB id for event
		 */
		this.show = function(id) {
			//console.log(id);
			this.id = id;
			// Grab title, description, participants
			/*
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function(){
				if (xhr.readyState == 4 && xmlhttp.status == 200) {
					var rec = JSON.parse(xhr.responseText);
					this.setTitle(rec.name);
					this.setDescription(rec.description);
					for(var i = 0; i < rec.participants.length; i++){
						this.addParticipant(rec.participants[i]);
					}
				}
			}*/
			// TODO write this handle I think lol
			xmlhttp.open("GET","/event/:handle");
			xmlhttp.send();
			
			//if (part of user's events...)
			this.favorite = true;
			this.$submit.text("Remove");
			//} else {
				//this.favorite = false;
				//this.$submit.text("Add");
			//}
			this.$modal.openModal();
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
	}();
	modalEvent.addParticipant("hi");
	cards.add("Smash Tourney", "test-id");
	//modalEvent.show();
});