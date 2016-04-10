(function ($) {
	function lookupController(elem, options) {
		this.element = $(elem);
		var self = this;
		this.lastLookup = undefined;
		this.debounced = undefined;

		this.start = function () {
			self.debounced = _.debounce(self.lookup, 500);
			self.element.on('change input keyup', function (e) {
				self.debounced();
			});
			self.element.on('focus', function (e) {
				var target = self.element.closest('.form-group').find('.lookup-results');
				target.show();
			});
			self.element.on('blur', function (e) {
				setTimeout(function () {
					var target = self.element.closest('.form-group').find('.lookup-results');
					target.hide();
				}, 500);
			});
			this.element.closest('.form-group').on('click', '.lookup-item', function (e) {
				e.preventDefault();
				var id = $(this).data('id');
				var fk = $(this).data('foreign-key');
				var description = $(this).text();

				delbutton = $('<i class="delete-relation-button fa fa-times-circle fa" data-foreign-key="' + fk + '">');
				delbutton.confirmation({
					placement: 'left',
					'onConfirm': function (event, element) {
						$(element).closest('form').find('input[name="' + $(element).data('foreign-key') + '"]').val('').attr('value', '');
						$(element).closest('.form-group').find('.parent-relation').empty();
					}
				});

				$(this).closest('.form-group').find('.parent-relation').empty().append(description, delbutton);
				$(this).closest('form').find('input[name="' + fk + '"]').val(id);
				$(this).closest('.lookup-results').hide();
			});
		};

		this.stop = function () {
			self.element.off('change input focus blur keyup');
		};

		this.lookup = function () {
			if (!this.element.val()) {
				var target = self.element.closest('.form-group').find('.lookup-results');
				target.empty().hide();
				this.lastLookup = '';
			}
			else {
				var q = this.element.val();
				if (q != this.lastLookup) {
					this.lastLookup = q;
					var endpoint = this.element.data('endpoint');
					var prop = this.element.data('lookup-property');
					var foreignKey = this.element.data('foreign-key');
					q = '/^' + _.escapeRegExp(q) + '/i';
					$.getJSON(endpoint + '?filter[where][' + prop + '][regexp]=' + q, function (data) {
						var target = self.element.closest('.form-group').find('.lookup-results');
						target.empty().show();
						if (data && data.length) {
							for (var i = 0; i < data.length; i++) {
								var li = $('<li class="lookup-item" data-id="' + data[i].id + '" data-foreign-key="' + foreignKey + '"> ' + data[i][prop] + '</li>');
								target.append(li);
							}
						}
						console.log(data);
					});
				}
			}
		};
	}
	$.fn.lookupController = GetJQueryPlugin('lookupController', lookupController);
})(jQuery);
