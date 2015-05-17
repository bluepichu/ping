$(function() {
	var $search = $("#search"),
		$searchTerm = $("#search-term");

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
		$("#settings").click(function() {
			$("#modal-settings").openModal();
		});
	} else {
		var $loginModal = $("#modal-login"),
			$loginUsername = $loginModal.find("#login-username"),
			$registerModal = $("#modal-register"),
			$registerUsername = $registerModal.find("#register-username"),
			$registerPassword = $registerModal.find("#register-password"),
			$registerConfirm = $registerModal.find("#register-confirm"),
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
	}
	$("#unsubscribe").click(function() {
		$("#modal-settings").closeModal();
		setTimeout(function() {
			$("#modal-confirmation").openModal();
		}, 300);
	});
});