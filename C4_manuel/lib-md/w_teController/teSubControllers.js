(function () {

	window.TEHashCtrl = function TEHashCtrl(pSelector) {
		this.selector = pSelector;
		this.selfHashChanged = false;
	};

	TEHashCtrl.prototype = {
		constructor: TEHashCtrl,

		handle: function (pElement) {
			return elementMatches(pElement, this.selector);
		},

		init: function (pCtrl) {
			var vSelf = this;
			window.addEventListener('hashchange', function (pEvent) {
				if (!vSelf.selfHashChange) vSelf.hashChanged(pCtrl);
			}, true);
			if (pCtrl.media.readyState) this.hashChanged(pCtrl);
			else pCtrl.media.addEventListener('loadedmetadata', function (pEvent) {
				vSelf.hashChanged(pCtrl)
			}, false);
		},

		active: function (pElement) {
			var vSelf = this;
			this.selfHashChange = true;
			window.location.hash = '#' + pElement.id;
			window.setTimeout(function () {
				vSelf.selfHashChange = false;
			}, 200)
		},

		hashChanged: function (pCtrl) {
			var vTarget = window.location.hash.substr(1);
			if (vTarget) {
				var vTargetParts = vTarget.split(',');
				var vState = null;
				var vTime = null;
				vTargetParts.forEach(function (vTargetPart) {
					if (vTargetPart.indexOf('=') > 0) {
						var vParam = vTargetPart.split('=');
						if (vParam[0] == 'state') {
							vState = vParam[1];
						} else if (vParam[0] == 't') {
							var vTimeParts = vParam[1].split(':');
							vTime = parseInt(vTimeParts[vTimeParts.length - 1]);
							if (vTimeParts.length > 1) {
								vTime += parseInt(vTimeParts[vTimeParts.length - 2]) * 60;
								if (vTargetParts.length > 2) {
									vTime += parseInt(vTimeParts[0]) * 3600;
								}
							}
						}
					} else {
						var vTargetElt = document.getElementById(vTargetPart);
						pCtrl.points.some(function (pPoint) {
							if (pPoint == vTargetElt || pPoint.contains(vTargetElt)) {
								vTime = pCtrl.pointsData.get(pPoint).position;
								return true;
							}
						});

						if (vTime === null) pCtrl.segments.some(function (pSegment) {
							if (pSegment == vTargetElt || pSegment.contains(vTargetElt)) {
								vTime = pCtrl.segmentsData.get(pSegment).start;
								return true;
							}
						});
					}
				});

				if (vTime !== null && vTime != pCtrl.media.currentTime) pCtrl.media.currentTime = vTime;

				if (vState == 'play') pCtrl.media.play();
				else if (vState == 'pause') pCtrl.media.pause();
			}
		}
	};

	window.TEPauseCtrl = function TEPauseCtrl(pSelector) {
		this.selector = pSelector;
		this.currentStep = null;
	};

	TEPauseCtrl.prototype = {
		constructor: TEPauseCtrl,

		init: function (pCtrl) {
			this.controller = pCtrl;
		},

		handle: function (pElement) {
			return elementMatches(pElement, this.selector);
		},

		active: function (pElement) {
			teMgr.getController(pElement).media.pause();
			this.currentStep = pElement.firstElementChild;
			if (this.currentStep) this.currentStep.classList.add('teActive');
		},

		idle: function (pElement) {
			this.done(pElement);
		},

		done: function (pElement) {
			for (var vChild = pElement.firstElementChild; vChild; vChild = vChild.nextElementSibling) {
				vChild.classList.remove('teActive');
			}
			this.currentStep = null;
		},

		nextStep: function () {
			if (this.currentStep) {
				this.currentStep.classList.remove('teActive');
				var vCtrl = teMgr.getController(this.currentStep);
				this.updateOverflow(this.currentStep.parentNode, vCtrl);

				vNext = this.currentStep.nextElementSibling;
				if (vNext) {
					vNext.classList.add('teActive');
					this.currentStep = vNext;
					this.updateOverflow(this.currentStep.parentNode, vCtrl);
				}
			}
		},

		previousStep: function () {
			if (this.currentStep) {
				this.currentStep.classList.remove('teActive');
				var vCtrl = teMgr.getController(this.currentStep);
				this.updateOverflow(this.currentStep.parentNode, vCtrl);
				var vPrevious = this.currentStep.previousElementSibling;
				if (vPrevious) {
					vPrevious.classList.add('teActive');
					this.currentStep = vPrevious;
					this.updateOverflow(this.currentStep.parentNode, vCtrl);
				}
			}
		},

		updateOverflow: function (pElement, pCtrl) {
			for (var i = 0; i < pCtrl.subControllers.length; i++) {
				var vSubCtrl = pCtrl.subControllers[i];
				if (vSubCtrl instanceof TEOverflowCtrl && vSubCtrl.handle(pElement)) {
					vSubCtrl.done(pElement, pCtrl);
					vSubCtrl.active(pElement, pCtrl);
				}
			}
		},

		resume: function (pElement) {
			if (this.currentStep) this.currentStep.classList.remove('teActive');
			this.controller.media.play();
		}
	};

	function TEOverflowCtrl(pSelector, pTransitionClass) {
		var vSelf = this;
		this.selector = pSelector;
		this.currentActive = null;

		this.transitionClass = pTransitionClass;
		this.hasTransitionClass = null;

		this.transitionListener = function (pEvent) {
			vSelf.testOverflow(vSelf.currentActive);
			pEvent.currentTarget.removeEventListener('transitionend', vSelf.transitionListener);
		}
	}

	TEOverflowCtrl;
	TEOverflowCtrl.prototype = {
		constructor: TEOverflowCtrl,

		init: function (pCtrl) {
			var vSelf = this;
			this.resizeTimeout;
			window.addEventListener('resize', function () {
				clearTimeout(vSelf.resizeTimeout);
				vSelf.resizeTimeout = setTimeout(function () {
					if (vSelf.currentActive) {
						vSelf.endOverflow(vSelf.currentActive);
						vSelf.testOverflow(vSelf.currentActive);
					}
				}, 200);
			});
		},

		handle: function (pElement) {
			return elementMatches(pElement, this.selector);
		},

		active: function (pElement, pCtrl) {
			var vSelf = this;
			this.currentActive = pElement;
			if (document.readyState != 'complete') {
				window.addEventListener('load', function () {
					setTimeout(function () {
						vSelf.hasTransitionClass = null;
						vSelf.active(pElement, pCtrl);
					}, 100)
				});
				return;
			} else if (this.transitionClass) {
				var vHasTransitionClass = pCtrl.contentArea.classList.contains(this.transitionClass);
				if (this.hasTransitionClass === null || this.hasTransitionClass != vHasTransitionClass) {
					this.currentActive = pElement;
					pCtrl.contentArea.addEventListener('transitionend', this.transitionListener);
					return;
				}
			}
			this.testOverflow(pElement);
		},

		idle: function (pElement, pCtrl) {
			this.endOverflow(pElement, pCtrl);
		},

		done: function (pElement, pCtrl) {
			this.endOverflow(pElement);
			if (this.currentActive == pElement) this.currentActive = null;
		},

		contentChange: function (pCtrl) {
			this.hasTransitionClass = pCtrl.contentArea.classList.contains(this.transitionClass);
		},

		testOverflow: function (pElement) {
			var vHeight = pElement.parentNode.clientHeight;
			var vScrollHeight = pElement.scrollHeight;
			if (vScrollHeight > vHeight) {
				var vScale = vHeight / vScrollHeight;
				if (vScale < 1) {
					this.onOverflow(pElement, vScale);
				}
			}
		},

		onOverflow: function (pElement, pScale) {
			pElement.classList.add('teOverflow');
		},
		endOverflow: function (pElement) {
			pElement.classList.remove('teOverflow');
		}
	};

	window.TEOverflowTransformCtrl = function TEOverflowTransformCtrl(pSelector, pScrollThreshold, pTransitionClass) {
		TEOverflowCtrl.call(this, pSelector, pTransitionClass);
		this.scrollThreshold = pScrollThreshold;
	};
	TEOverflowTransformCtrl.prototype = Object.create(TEOverflowCtrl.prototype);
	TEOverflowTransformCtrl.prototype.constructor = TEOverflowTransformCtrl;

	TEOverflowTransformCtrl.prototype.onOverflow = function (pElement, pScale) {
		if (pScale <= this.scrollThreshold) TEOverflowScrollCtrl.prototype.onOverflow.call(this, pElement, pScale);
		else {
			pElement.classList.add('teOverflowTransform');
			pElement.style.transform = 'scale(' + pScale + ')';
			pElement.style.transformOrigin = '50% 0';
			pElement.style.overflow = 'visible';
			pElement.style.alignSelf = 'start';
		}
	};

	TEOverflowTransformCtrl.prototype.endOverflow = function (pElement) {
		pElement.classList.remove('teOverflowTransform');
		pElement.style.transform = pElement.style.transformOrigin = pElement.style.overflow = pElement.style.alignSelf = '';
	};

	window.TEOverflowScrollCtrl = function TEOverflowScrollCtrl(pSelector, pTransitionClass) {
		TEOverflowCtrl.call(this, pSelector, pTransitionClass);
	};
	TEOverflowScrollCtrl.prototype.constructor = TEOverflowTransformCtrl;
	TEOverflowScrollCtrl.prototype = Object.create(TEOverflowCtrl.prototype);

	TEOverflowScrollCtrl.prototype.onOverflow = function (pElement, pScale) {
		pElement.classList.add('teOverflowScroll');
		pElement.style.overflow = 'auto';
		pElement.style.alignSelf = 'stretch';
	};

	TEOverflowScrollCtrl.prototype.endOverflow = function (pElement) {
		pElement.classList.remove('teOverflowScroll');
		pElement.style.overflow = pElement.style.alignSelf = '';
	};


	function elementMatches(pElement, pSelector) {
		return pElement.matches ? pElement.matches(pSelector) : pElement.msMatchesSelector(pSelector)
	}
})();