teContentMgr = {
	controllers: new Map(),

	init: function () {

	},

	getController: function (pElement) {
		if (this.controllers.has(pElement)) {
			return this.controllers.get(pElement)
		} else {
			var vCtrl;
			if (pElement.classList.contains('tePause')) {
				vCtrl = new TEPauseController(pElement);
			}
			if (vCtrl) {
				this.controllers.set(pElement, vCtrl);
				return vCtrl;
			}
		}
	},

	getParentController: function (pElement) {
		if (this.controllers.keys) {
			var vEltsIt = this.controllers.keys();
			var vElt;
			while (vElt = vEltsIt.next()) {
				if (vElt.value.contains(pElement)) return this.controllers.get(vElt.value);
			}
		} else {
			// IE11
			var vCtrl;
			this.controllers.forEach(function(pCtrl, pElt) {
				if (pElt.contains(pElement)) vCtrl = pCtrl;
			});
			return vCtrl;
		}
	}
};

TEPauseController = function (pElement) {
	this.element = pElement;
	this.currentStep = null;
};

TEPauseController.prototype = {
	beforeActive: function() {
		teMgr.getController(this.element).media.pause();
	},

	active: function() {
		this.currentStep = this.element.firstElementChild;
		if (this.currentStep) this.currentStep.classList.add('teActive');
	},

	idle: function() {
		this.done();
	},

	done: function() {
		for (var vChild = this.element.firstElementChild; vChild; vChild = vChild.nextElementSibling) {
			vChild.classList.remove('teActive');
		}
	},

	nextStep: function () {
		if (this.currentStep) {
			this.currentStep.classList.remove('teActive');
			vNext = this.currentStep.nextElementSibling;
			if (vNext) {
				vNext.classList.add('teActive');
				this.currentStep = vNext;
			}
		}
	},

	previousStep: function () {
		if (this.currentStep) {
			this.currentStep.classList.remove('teActive');
			var vPrevious = this.currentStep.previousElementSibling;
			if (vPrevious) {
				vPrevious.classList.add('teActive');
				this.currentStep = vPrevious;
			}
		}
	},

	resume: function () {
		if (this.currentStep) this.currentStep.classList.remove('teActive');
		teMgr.getController(this.element).media.play();
	}
};
