(function () {
	var vValueAttrObserver;

	if (MutationObserver) {
		vValueAttrObserver = new MutationObserver(function (pMutations) {
			pMutations.forEach(function(pMutation) {
				pMutation.target.value = parseFloat(pMutation.target.getAttribute('value'));
				pMutation.target.plainRangeUpdate();
			});
		});

	}

	/* Attente de l'évènement load pour le chargement des CSS */
	window.addEventListener('load', function () {
		var vInputs = document.querySelectorAll('input[type=range].plainRange');
		Array.prototype.forEach.call(vInputs, function (pInput) {
			var vStyle = getComputedStyle(pInput);
			var vColor = vStyle.color;
			var vDirection = vStyle.direction == 'ltr' ? 'to right' : 'to left';

			pInput.plainRangeUpdate = function () {
				var vPercent = ((this.value - this.min) / (this.max - this.min)) * 100;
				var vGradientStart = vColor + ' 0%';
				var vGradientValueEnd = vColor + ' ' + vPercent + '%';
				var vGradientValueStart = "rgba(0,0,0,0)" + ' ' + vPercent + '%';
				var vGradientStop = "rgba(0,0,0,0)";
				var vGradient = [vDirection, vGradientStart, vGradientValueEnd, vGradientValueStart, vGradientStop].join(', ');
				this.style.backgroundImage = 'linear-gradient(' + vGradient + ')';
			};

			if (vValueAttrObserver) vValueAttrObserver.observe(pInput, {attributes: true, attributeFilter: ['value']});
			pInput.addEventListener('input', pInput.plainRangeUpdate);
			pInput.plainRangeUpdate();
		})
	});


})();
