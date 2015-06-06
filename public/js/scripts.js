$(function() {
	// Initialize materialize select menus
	$('select').material_select();
	// Initialize materialize tabs
	$('ul.tabs').tabs();
	// Initialize materialize sidenav
	$(".button-collapse").sideNav();
	var $search = $("#search"),
		$searchTerm = $("#search-term");

	// Setup search bar
	$searchTerm.change(function() {
		// search?
	});
	$search.find("a").click(function() {
		if ($search.hasClass("active")) {
			$search.blur();
			setTimeout(function() {
				$search.removeClass("active");
			}, 100);
			setTimeout(function() {
				$searchTerm.val("");
			}, 500);
		} else {
			$search.addClass("active");
			setTimeout(function() {
				$searchTerm.focus();
			}, 300);
		}
	});

	// Check login status
	if ($.cookie("authToken")) {
		// User is logged in, show settings
		$("#settings").click(function() {
			$("#modal-settings").openModal();
		});
	} else {
		// Setup login request
		var $loginModal = $("#modal-login"),
			$loginUsername = $loginModal.find("#login-username"),
			$registerModal = $("#modal-register"),
			$verifyModal = $("#modal-verify"),
			$registerUsername = $registerModal.find("#register-username"),
			$registerPassword = $registerModal.find("#register-password"),
			$registerConfirm = $registerModal.find("#register-confirm"),
			$registerSubmit = $registerModal.find("#register-submit"),
			$verifySubmit = $verifyModal.find("#verify-submit"),
			$loginSubmit = $loginModal.find("#login-submit");
			$clearFields = [
				$loginModal.find("#login-password"),
				$registerPassword,
				$registerConfirm
			];
		var clearAll = function() {
			$clearFields.forEach(function(e) {
				e.val("");
			});
		};
		$("#settings").text("Login").click(function() {
			$loginModal.find("#login-register").click(function() {
				$registerUsername.val($loginUsername.val());
				$loginModal.closeModal();
				setTimeout(function() {
					clearAll();
					$registerModal.openModal();
				}, 300);
			});
			clearAll();
			$loginModal.openModal();
		});
		$("#logout").click(function() {
			$.removeCookie("authToken");
			location.reload();
		});
		$loginSubmit.click(function(){
			var data = $loginModal.find("form").serializeArray();
			var json = {};

			for (var i = 0; i < data.length; i++) {
				json[data[i].name] = data[i].value;
			}

			json.phone = "+1" + json.phone;

			var xhr = new XMLHttpRequest();
			xhr.onload = function(){
				if(this.status != 200){
					Materialize.toast(this.responseText, 4000);
				} else {
					var res = JSON.parse(xhr.responseText);
					if(res.ok){
						Materialize.toast("Login successful.");
						setTimeout(function() {
							location.reload();
						}, 2000);
					} else {
						Materialize.toast("Request failed: " + res.reason, 4000); 
					}
				}
			};
			xhr.open("POST", "/user/auth", true);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.send(JSON.stringify(json));
		});
		$registerModal.find("#register-login").click(function() {
			$loginUsername.val($registerUsername.val());
			$registerModal.closeModal();
			setTimeout(function() {
				clearAll();
				$loginModal.openModal();
			}, 300);
		});
		var validatePassword = function() {
			if($registerPassword.val() != $registerConfirm.val()) {
				$registerConfirm[0].setCustomValidity("Passwords Don't Match");
			} else {
				$registerConfirm[0].setCustomValidity("");
			}
		};
		$registerPassword.change(validatePassword);
		$registerConfirm.keyup(validatePassword);

		$registerSubmit.click(function(){
			var data = $registerModal.find("form").serializeArray();
			var json = {};

			for (var i = 0; i < data.length; i++) {
				json[data[i].name] = data[i].value;
			}

			json.phone = "+1" + json.phone;

			if(json.password == "" || json.password != json.confirm){
				Materialize.toast("Please double check your password fields.", 4000);
				return;
			}

			var xhr = new XMLHttpRequest();
			xhr.onload = function(){
				if(this.status != 200){
					Materialize.toast(this.responseText, 4000);
				} else {
					var res = JSON.parse(xhr.responseText);
					if(res.ok){
						$registerModal.closeModal();
						setTimeout(function() {
							clearAll();
							$verifyModal.openModal();
						}, 300);
					} else {
						Materialize.toast("Request failed: " + res.reason, 4000); 
					}
				}
			};
			xhr.open("POST", "/user/new", true);
			xhr.setRequestHeader("Content-Type", "application/json");
			delete json.confirm;
			$verifyModal.find("#phone").val(json.phone);
			xhr.send(JSON.stringify(json));
		});
		$verifySubmit.click(function(){
			var data = $verifyModal.find("form").serializeArray();
			var json = {};

			for (var i = 0; i < data.length; i++) {
				json[data[i].name] = data[i].value;
			}

			var xhr = new XMLHttpRequest();
			xhr.onload = function(){
				if(this.status != 200){
					Materialize.toast(this.responseText, 4000);
				} else {
					var res = JSON.parse(xhr.responseText);
					if(res.ok){
						Materialize.toast("You are now registered!", 2000);
						setTimeout(function(){
							location.reload();
						}, 2000);
					} else {
						Materialize.toast("Request failed: " + res.reason, 4000); 
					}
				}
			};
			xhr.open("POST", "/user/verify", true);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.send(JSON.stringify(json));
		});
	}
	$("#unsubscribe").click(function() {
		$("#modal-settings").closeModal();
		setTimeout(function() {
			$("#modal-confirmation").openModal();
		}, 300);
	});
});