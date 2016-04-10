(function ($) {
	function formValidationController(elem, options) {
		this.element = $(elem);
		this.valid = false;
		this.submitter = this.element.find(this.element.data('submitter'));
		this.uniqueDebounce = null;
		this.lookupDebounce = null;

		var self = this;

		this.start = function () {
			self.initInput(self.element);

			self.element.on('change input focus blur keyup', ':input', function (e) {
				$(this).data('touched', true);
				$(this).closest('.form-group').addClass('touched');

				if ($(this).attr('type') === 'checkbox') {
					$(this).val($(this).prop('checked') ? 'on' : '');
				}

				var isDirty = $(this).data('last-value') !== $(this).val();

				$(this).data('dirty', isDirty);

				self.validate();
			});

			self.validate();
		};

		this.stop = function () {
			this.element.off('change input focus blur keyup', ':input');
		};

		this.validate = function (cb) {
			var invalidFields = 0;
			var fields = self.element.find(':input');

			async.map(fields, self.validateField, function (err, allerrors) {
				for (var i = 0; i < fields.length; i++) {
					var input = $(fields[i]);
					var errors = allerrors[i];

					if (errors && errors.length) {
						++invalidFields;
						input.closest('.form-group').removeClass('input-ok');
						input.closest('.form-group').addClass('input-error');
						input.closest('.form-group').find('.validation-help').html(errors.join(', '));
					}
					else {
						//input.closest('.form-group').find('.validation-help').empty();
						input.closest('.form-group').removeClass('input-error');
						input.closest('.form-group').addClass('input-ok');
						if (input.data('dirty')) {
							input.data('last-value', input.val());
							self.element.trigger('validchange', input);
						}
					}
				}

				if (invalidFields) {
					self.valid = false;
					$(self.submitter).prop('disabled', true);
				}
				else {
					self.valid = true;
					$(self.submitter).prop('disabled', false);
				}

				if (cb) {
					cb(self.valid);
				}
			});
		};

		this.initInput = function (element) {
			element.find(':input').each(function () {
				var input = this;
				$(input).data('touched', false);
				$(input).data('dirty', false);
				$(input).data('last-value', $(input).val());
				$(input).data('original-value', $(input).val());
				if ($(input).data('checked')) {
					$(input).prop('checked', 'checked');
				}

				if ($(input).data('validate')) {
					var validations = $(input).data('validate').split(',');
					for (var i = 0; i < validations.length; i++) {
						var validation = validations[i].split('=');
						if (validation[0] === 'cc-number') {
							$(input).payment('formatCardNumber');
						}
						if (validation[0] === 'cc-exp') {
							$(input).payment('formatCardExpiry');
						}
						if (validation[0] === 'cc-cvc') {
							$(input).payment('formatCardCVC');
						}
					}
				}

				if ($(input).data('input-behavior')) {
					$(input).payment($(input).data('input-behavior'));
				}
			});
		};

		this.validateField = function (element, cb) {
			var input = $(element);

			var valid = true;
			var val = input.val();
			var errors = [];

			if (input.data('validate')) {
				var validations = input.data('validate').split(',');
				for (var i = 0; i < validations.length; i++) {
					var validation = validations[i].split('=');

					if (validation[0] === 'required') {
						if (!val) {
							errors.push('required');
						}
					}

					if (validation[0] === 'integer') {
						if (val && val.match(/\D/)) {
							errors.push('must be an integer');
						}
					}

					if (validation[0] === 'float') {
						if (val && !val.match(/^[0-9\.]+$/)) {
							errors.push('must be a floating point number');
						}
					}

					if (validation[0] === 'url' && val) {
						var test = {
							'website': {
								'url': {
									'allowLocal': true
								}
							}
						};

						var invalid = validate({
							'website': val
						}, test);

						if (invalid) {
							errors.push('must be a valid url');
						}
					}

					if (validation[0] === 'email' && val) {
						var test = {
							'from': {
								'email': val
							}
						};

						var invalid = validate({
							'from': val
						}, test);

						if (invalid) {
							errors.push('must be an email address');
						}
					}

					if (validation[0] === 'password' && val) {
						if (val && !(val.match(/[0-9]+/) && val.match(/[A-Za-z]+/))) {
							errors.push('must contain at least one number, one letter');
						}
					}

					if (validation[0] === 'cc-number' && val) {
						var cardType = $.payment.cardType(val);
						input.closest('.form-group').find('.cc-brand').empty();
						if (cardType) {
							var img = '<img src="/dist/admin/images/icons/' + cardType + '.png">';
							input.closest('.form-group').find('.cc-brand').html(img);
						}
						var isvalid = $.payment.validateCardNumber(val);
						if (!isvalid) {
							errors.push('must be a valid cc number');
						}
					}

					if (validation[0] === 'cc-exp' && val) {
						var isvalid = $.payment.validateCardExpiry($(input).payment('cardExpiryVal'));
						if (!isvalid) {
							errors.push('must be a valid expire date');
						}
					}

					if (validation[0] === 'cc-cvc' && val) {
						var cardnum = $(input.data('card-field')).val();
						var cardType = $.payment.cardType(cardnum);
						var isvalid = $.payment.validateCardCVC(val, cardType);
						if (!isvalid) {
							errors.push('must be a valid cvc code');
						}
					}

					if (validation[0] === 'mask' && val) {
						var re = new RegExp(validation[1]);
						if (!re.exec(input.val())) {
							errors.push('invalid characters');
						}
					}

					if (validation[0] === 'length' && val.length !== validation[1]) {
						errors.push('must be ' + validation[1] + ' characters long');
					}

					if (validation[0] === 'min-length' && val.length < validation[1]) {
						errors.push('must be at least ' + validation[1] + ' characters long');
					}

					if (validation[0] === 'max-length' && val.length > validation[1]) {
						errors.push('must be less than ' + validation[1] + ' characters long');
					}

					if (validation[0] === 'min' && val < validation[1]) {
						errors.push('minimum value ' + validation[1]);
					}

					if (validation[0] === 'max' && val > validation[1]) {
						errors.push('maximum value ' + validation[1]);
					}

					if (validation[0] === 'match' && (self.element.find(validation[1]).val() !== input.val())) {
						errors.push('does not match');
					}
				}
			}

			if (input.data('unique-endpoint')) {
				if (!errors.length && val.length > 2 && input.data('last-val') !== val &&
					!self.uniqueDebounce) {
					return self.isUnique(input, cb);
				}
				else {
					if (input.data('last-unique')) {
						errors.push('must be unique');
					}
				}
			}

			if (input.data('lookup-endpoint')) {
				if (!val.length) {
					input.removeData('last-lookup');
				}
				if (!errors.length && val.length && input.data('last-val') !== val && !self.lookupDebounce) {
					return self.lookup(input, cb);
				}
				else {
					if (input.data('last-lookup') && !input.data('last-lookup').found.length) {
						errors.push('not found');
					}
				}
			}

			cb(null, errors);
		};

		this.isValid = function (cb) {
			this.validate(cb);
		};

		this.isUnique = function (input, cb) {
			self.uniqueDebounce = setTimeout(function () {
				self.uniqueDebounce = undefined;
				var endpoint = input.data('unique-endpoint');
				input.data('last-val', input.val());
				$.getJSON(endpoint + '?value=' + input.val(), function (data) {
					if (data.found) {
						input.data('last-unique', 1);
						cb(null, ['must be unique']);
					}
					else {
						input.removeData('last-unique');
						cb(null);
					}
				});
			}, 500);
		};

		this.lookup = function (input, cb) {
			self.lookupDebounce = setTimeout(function () {
				self.lookupDebounce = undefined;
				var endpoint = input.data('lookup-endpoint');
				input.data('last-val', input.val());
				$.getJSON(endpoint + '?q=' + input.val(), function (data) {
					input.data('last-lookup', data);
					if (!data.found || !data.found.length) {
						cb(null, {
							'status': 'ok'
						});
					}
					else {
						input.data('id', data);
						cb(null, {
							'status': 'ok',
							'response': data
						});
					}
				});
			}, 500);
		};
	}

	$.fn.formValidationController = GetJQueryPlugin('formValidationController', formValidationController);
})(jQuery);
