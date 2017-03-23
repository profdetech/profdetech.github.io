teMgr = {
	init: function (pSubControllers) {
		this.subControllers = pSubControllers;
		if (document.readyState != 'loading') {
			this.initControllers(pSubControllers);
		} else {
			var vSelf = this;
			document.addEventListener('DOMContentLoaded', function () {
				vSelf.initControllers(pSubControllers);
			});
		}
		/*
		document.addEventListener('DOMContentLoaded', function () {
			var v = document.querySelector('video');
			console.log(v.readyState);
			v.addEventListener('loadedmetadata', function () {
				console.log(v.readyState, v.currentTime);

			});
		});
		scOnLoads.push(this);*/
	},

	onLoad: function () {
		this.initControllers(this.subControllers);
	},

	initControllers: function (pSubControllers) {
		try {
			this.controllers = this.queryAll('.teController').map(function (pElement) {
				return new TEController(pElement, pSubControllers);
			});
		} catch (e) {
			console.error('TEController:', e);
		}
	},

	getController: function (pElement) {
		for (var vCtrl, i = 0; i < this.controllers.length, vCtrl = this.controllers[i]; i++) {
			if (vCtrl.element == pElement || vCtrl.container == pElement || vCtrl.container.contains(pElement)) return vCtrl;
		}
		return null;
	},

	getSubController: function (pElement, pClass) {
		var vCtrl = this.getController(pElement);
		for (var vSubCtrl, i = 0; i < vCtrl.subControllers.length, vSubCtrl = vCtrl.subControllers[i]; i++) {
			if (vSubCtrl instanceof pClass) return vSubCtrl;
		}
		return null;
	},

	query: function (pClass, pContext) {
		var vContext = pContext || document;
		return vContext.querySelector(pClass);
	},

	queryAll: function (pClass, pContext) {
		var vContext = pContext || document;
		return Array.prototype.slice.call(vContext.querySelectorAll(pClass));
	},

	matches: function (pElement, pClass) {
		var vMatches = pElement.matches || pElement.msMatchesSelector;
		return vMatches.call(pElement, pClass);
	},

	formatTime: function (pTime) {
		pTime = Number(pTime);
		var vH = Math.floor(pTime / 3600);
		var vM = Math.floor(pTime % 3600 / 60);
		var vS = Math.floor(pTime % 3600 % 60);
		return ((vH > 0 ? vH + ":" : "") + (vM > 0 ? (vH > 0 && vM < 10 ? "0" : "") + vM + ":" : "0:") + (vS < 10 ? "0" : "") + vS);
	},

	getTimes: function (pTimeElts) {
		return pTimeElts.map(function (pTimeElt) {
			return parseFloat(pTimeElt.dataset.teTime);
		}).sort();
	}
};

TEController = function (pElement, pSubControllers) {
	var vSelf = this;

	this.lastTimeUpdate = NaN;

	this.element = pElement;
	if (!this.element) throw "Temporal controller not found";
	this.subControllers = pSubControllers;

	var vContainer = this.element.parentNode;
	while (vContainer instanceof Element && !teMgr.matches(vContainer, this.element.dataset.teContainer)) {
		vContainer = vContainer.parentNode;
	}
	if (vContainer == document) vContainer = document.body;
	this.container = vContainer;

	var vMedia = this.media = vContainer.querySelector(this.element.dataset.teMedia || '.teMedia');
	if (!vMedia) throw "Media not found";

	if (vMedia.dataset.teType == 'audio' || vMedia.localName == 'audio') {
		this.container.classList.add('teAudioType');
	} else {
		this.container.classList.add('teVideoType');
	}
	this.contentArea = vContainer.querySelector(this.element.dataset.teContentArea || '.teContentArea');

	var vSeekInput = this.seekInput = this.query('seek');
	if (vSeekInput) {
		this.seekDragging = false;
		var vSeekInputTimeout = null;
		vSeekInput.addEventListener('input', function () {
			vSelf.seekDragging = true;
			if (!vSeekInputTimeout) vMedia.currentTime = parseFloat(this.value);
			vSeekInputTimeout = setTimeout(function () {
				vSeekInputTimeout = null;
			}, 200);
		}, false);
		vSeekInput.addEventListener('change', function () {
			vSelf.seekDragging = false;
			vMedia.currentTime = parseFloat(this.value);
		});
	}

	this.playPauseBtn = this.query('playPause');
	if (this.playPauseBtn) this.bindButton(this.playPauseBtn, this.playPause);

	this.nextTimeBtn = this.query('nextTime');
	if (this.nextTimeBtn) this.bindButton(this.nextTimeBtn, this.nextTime);

	this.previousTimeBtn = this.query('previousTime');
	if (this.previousTimeBtn) this.bindButton(this.previousTimeBtn, this.previousTime);

	this.currentTimeLabel = this.query('currentTime');
	this.durationLabel = this.query('duration');

	this.muteBtn = this.query('mute');
	if (this.muteBtn) {
		this.muteBtn.addEventListener('click', function () {
			if (vMedia.volume == 0) vMedia.volume = 1;
			vMedia.muted = !vMedia.muted;
		});
	}
	this.volumeInput = this.query('volume');
	if (this.volumeInput) {
		function setVolume () {
			vMedia.volume = vSelf.volumeInput.value / 100;
			if (vMedia.volume != 0) vMedia.muted = false;
		}

		this.volumeInput.addEventListener('input', setVolume);
		this.volumeInput.addEventListener('change', setVolume);
	}

	this.bind(vMedia, 'timeupdate', this.updateTime);
	this.bind(vMedia, 'volumechange', this.updateVolume);
	this.bind(vMedia, 'durationchange', this.updateDuration);
	['loadedmetadata', 'playing', 'pause', 'ended', 'seeking', 'seeked'].forEach(function (pEvent) {
		vSelf.bind(vMedia, pEvent, vSelf.updatePlayingState);
	});

	this.segments = teMgr.queryAll(this.element.dataset.teSegments || '[data-te-start],[data-te-segment-target]', this.container);
	this.segmentsData = new Map();
	for (var vSegment, i = 0; i < this.segments.length, vSegment = this.segments[i]; i++) {
		var vTarget = vSegment.dataset.teSegmentTarget;
		var vTargetSegment, vStart, vEnd;
		if (vTarget) {
			vTargetSegment = document.getElementById(vTarget);
			vStart = parseFloat(vTargetSegment.dataset.teStart);
			vEnd = parseFloat(vTargetSegment.dataset.teEnd);
		} else {
			vStart = parseFloat(vSegment.dataset.teStart);
			vEnd = parseFloat(vSegment.dataset.teEnd);
		}
		this.segmentsData.set(vSegment, {start: vStart, end: vEnd});
	}

	this.points = teMgr.queryAll(this.element.dataset.tePause || '[data-te-position],[data-te-point-target]', this.container);
	this.pointsData = new Map();
	for (var vPoint, i = 0; i < this.points.length, vPoint = this.points[i]; i++) {
		var vTarget = vPoint.dataset.tePointTarget;
		var vTargetPoint, vPosition;
		if (vTarget) {
			vTargetPoint = document.getElementById(vTarget);
			vPosition = parseFloat(vTargetPoint.dataset.tePosition);
		} else {
			vPosition = parseFloat(vPoint.dataset.tePosition);
		}
		var vInteractive = vPoint.localName == 'a' || vPoint.localName == 'button' || vPoint.localName == 'input';
		this.pointsData.set(vPoint, {position: vPosition, interactive: vInteractive});

		if (vInteractive) {
			vPoint.addEventListener('click', function () {
				vMedia.currentTime = vSelf.pointsData.get(this).position;
				return false;
			})
		}
	}


	this.subControllers.forEach(function (pSubCtrl) {
		try {
			if (pSubCtrl.init) pSubCtrl.init(vSelf);
		} catch (e) {
			console.error(pSubCtrl.constructor.name + '.init:', e);
		}
	});

	this.updateActiveStates();

	this.timelines = teMgr.queryAll(this.element.dataset.teTimelines || '.teTimeline', this.element);
	if (this.timelines.length) {
		this.previousTimelineBtn = this.query('previousTimeline');
		if (this.previousTimelineBtn) this.bindButton(this.previousTimelineBtn, this.previousTimeline);
		this.nextTimelineBtn = this.query('nextTimeline');
		if (this.nextTimelineBtn) this.bindButton(this.nextTimelineBtn, this.nextTimeline);

		this.selectTimeline(this.timelines[0]);
	}

	this.updateTime();
	this.updateVolume();
	if (vMedia.readyState >= HTMLMediaElement.HAVE_METADATA) this.updateDuration();

};

TEController.prototype = {
	query: function (pClass) {
		return teMgr.query('.te' + pClass[0].toUpperCase() + pClass.substr(1), this.element);
	},

	queryAll: function (pClass) {
		return teMgr.queryAll('.te' + pClass[0].toUpperCase() + pClass.substr(1), this.element);
	},

	bind: function (pElement, pEvent, pMethod) {
		pElement.addEventListener(pEvent, pMethod.bind(this));
	},

	bindButton: function (pButton, pMethod) {
		pButton.addEventListener('click', pMethod.bind(this));
		this.setButtonTitle(pButton, pButton.title)
	},

	dispatch: function (pEventName, pElement) {
		if (this.subControllers) {
			for (var i = 0; i < this.subControllers.length; i++) {
				var vSubCtrl = this.subControllers[i];
				try {
					if (vSubCtrl[pEventName]) {
						if (!pElement) vSubCtrl[pEventName](this);
						else if (vSubCtrl.handle(pElement)) vSubCtrl[pEventName](pElement, this);
					}
				} catch (e) {
					console.error(vSubCtrl.constructor.name + '.' + pEventName + ':', e);
				}
			}
		}
	},

	updateTime: function () {
		var vSelf = this;
		var vCurrentTime = this.media.currentTime;
		var vFormattedTime = teMgr.formatTime(vCurrentTime);

		// Mise à jour du temps courant et du curseur de lecture
		if (this.currentTimeLabel) {
			this.currentTimeLabel.textContent = vFormattedTime;
		}
		if (!this.seekDragging) {
			this.seekInput.value = vCurrentTime;
			this.seekInput.setAttribute('value', vCurrentTime);
			this.seekInput.setAttribute("aria-valuenow", vCurrentTime);
			this.seekInput.setAttribute("aria-valuetext", vFormattedTime);

		}

		if (this.previousTimeBtn) this.previousTimeBtn.disabled = !this.currentTimes.length || vCurrentTime <= this.currentTimes[0];
		if (this.nextTimeBtn) this.nextTimeBtn.disabled = !this.currentTimes.length || vCurrentTime >= this.currentTimes[this.currentTimes.length - 1];

		this.updateActiveStates();

		this.lastTimeUpdate = vCurrentTime;
	},

	updateDuration: function () {
		var vSelf = this;
		var vDuration = this.media.duration;
		if (this.durationLabel) this.durationLabel.textContent = teMgr.formatTime(vDuration);
		if (this.seekInput) {
			this.seekInput.max = vDuration;
			this.seekInput.setAttribute("aria-valuemax", vDuration);
		}
		this.segments.forEach(function (pSegment) {
			var vStyles = pSegment.dataset.teStyles;
			if (vStyles) {
				vStyles = vStyles.split(' ');
				vStyles.forEach(function (pStyle) {
					var vData = vSelf.segmentsData.get(pSegment);
					if (pStyle == 'width') {
						pSegment.style.width = ((vData.end - vData.start) * 100 / vDuration) + '%';
					} else if (pStyle == 'left' || pStyle == 'margin-left') {
						pSegment.style[pStyle] = (vData.start * 100 / vDuration) + '%';
					}
				});
			}
		});
	},

	updateVolume: function () {
		if (this.muteBtn) {
			if (this.media.muted || this.media.volume == 0) {
				this.muteBtn.classList.add('teChecked');
				this.setButtonTitle(this.muteBtn, this.muteBtn.dataset.teMutedTitle);
			} else {
				this.muteBtn.classList.remove('teChecked');
				this.setButtonTitle(this.muteBtn, this.muteBtn.dataset.teMuteTitle);
			}
		}
		if (this.volumeInput) {
			var vVolume = this.media.muted ? 0 : this.media.volume * 100;
			this.volumeInput.value = vVolume;
			this.volumeInput.setAttribute('value', vVolume);
			this.volumeInput.setAttribute("aria-valuenow", vVolume);
			this.volumeInput.setAttribute("aria-valuetext", vVolume + "%");
		}
	},

	updateActiveStates: function () {
		var vSelf = this;
		var vCurrentTime = this.media.currentTime;

		var vContentClass = this.contentArea.className;
		var vActiveContentPoint = false;
		var vActives = [];
		for (var vPoint, i = 0; i < this.points.length, vPoint = this.points[i]; i++) {
			var vData = this.pointsData.get(vPoint);

			if (vCurrentTime < vData.position - 0.25) {
				if (!vPoint.classList.contains('teIdle')) {
					vPoint.classList.remove('teActive');
					vPoint.classList.remove('teDone');
					vPoint.classList.add('teIdle');
					this.dispatch( 'idle', vPoint);
				}
			} else if (vCurrentTime >= vData.position + 0.25) {
				if (!vPoint.classList.contains('teDone')) {
					vPoint.classList.remove('teActive');
					vPoint.classList.remove('teIdle');
					vPoint.classList.add('teDone');
					this.dispatch( 'done', vPoint);
				}
			} else if (this.currentPause != vPoint &&
				((vCurrentTime >= vData.position - 0.25 && vCurrentTime < vData.position + 0.25) ||
				(this.lastTimeUpdate < vData.position && vCurrentTime > vData.position))) {
				if (!vPoint.classList.contains('teActive')) {
					vActives.push(vPoint);
				}
				if (this.contentArea.contains(vPoint)) vActiveContentPoint = true;
			}
		}


		if (vActiveContentPoint) this.contentArea.classList.add('teActivePoint');
		else this.contentArea.classList.remove('teActivePoint');

		var vActiveContentSegment = false;
		for (var vSegment, i = 0; i < this.segments.length, vSegment = this.segments[i]; i++) {
			var vData = this.segmentsData.get(vSegment);

			if (vCurrentTime < vData.start) {
				if (!vSegment.classList.contains('teIdle')) {
					vSegment.classList.remove('teActive');
					vSegment.classList.remove('teDone');
					vSegment.classList.add('teIdle');
					this.dispatch( 'idle', vSegment);
				}
			} else if (vCurrentTime >= vData.end) {
				if (!vSegment.classList.contains('teDone')) {
					vSegment.classList.remove('teActive');
					vSegment.classList.remove('teIdle');
					vSegment.classList.add('teDone');
					this.dispatch( 'done', vSegment);
				}
			} else {
				if (!vSegment.classList.contains('teActive')) {
					vActives.push(vSegment);
				}
				if (this.contentArea.contains(vSegment)) vActiveContentSegment = true;
			}
		}

		if (vActiveContentSegment) this.contentArea.classList.add('teActiveSegment');
		else this.contentArea.classList.remove('teActiveSegment');

		for (var vActive, i = 0; i < vActives.length, vActive = vActives[i]; i++) {
			vActive.classList.remove('teIdle');
			vActive.classList.remove('teDone');
			vActive.classList.add('teActive');
			this.dispatch( 'active', vActive);
		}

		if (this.contentArea.className != vContentClass) {
			this.dispatch( 'contentChange');
		}
	},

	updatePlayingState: function () {
		var vSelf = this;
		if (this.media.seeking) {
			if (!this.seekTimeout) {
				this.seekTimeout = setTimeout(function () {
					if (vSelf.previousTimeBtn) vSelf.previousTimeBtn.disabled = true;
					if (vSelf.nextTimeBtn) vSelf.nextTimeBtn.disabled = true;
				}, 500);
			}
		} else {
			clearTimeout(this.seekTimeout);
			this.seekTimeout = null;
			if (this.media.paused || this.media.ended) {
				this.playPauseBtn.classList.remove('teChecked');
				this.setButtonTitle(this.playPauseBtn, this.playPauseBtn.dataset.tePausedTitle);
			} else {
				this.playPauseBtn.classList.add('teChecked');
				this.setButtonTitle(this.playPauseBtn, this.playPauseBtn.dataset.tePlayingTitle);
			}
		}
		if (this.media.ended) {
			console.log('ended', this.media.currentTime);
		}
	},

	playPause: function () {
		if (this.media.paused || this.media.ended) this.media.play();
		else this.media.pause();
	},

	previousTime: function () {
		var vCurrentTime = this.media.currentTime;
		for (var i = this.currentTimes.length - 1; i >= 0; i--) {
			var vTime = this.currentTimes[i];
			if (vTime + 0.25 <= vCurrentTime) {
				this.media.currentTime = vTime;
				return;
			}
		}
	},

	nextTime: function () {
		var vCurrentTime = this.media.currentTime;
		for (var i = 0; i < this.currentTimes.length; i++) {
			var vTime = this.currentTimes[i];
			if (vTime - 0.25 >= vCurrentTime) {
				this.media.currentTime = vTime;
				return;
			}
		}
	},

	previousTimeline: function () {
		var vIndex = this.timelines.indexOf(this.currentTimeline);
		if (vIndex-- > 0) this.selectTimeline(this.timelines[vIndex]);
	},

	nextTimeline: function () {
		var vIndex = this.timelines.indexOf(this.currentTimeline);
		if (vIndex++ < this.timelines.length) this.selectTimeline(this.timelines[vIndex]);
	},

	selectTimeline: function (pTimeline) {
		if (this.currentTimeline) this.currentTimeline.classList.remove('teCurrent');
		this.currentTimeline = pTimeline;
		this.currentTimeline.classList.add('teCurrent');
		this.currentTimes = [];
		for (var vPoint, i = 0; i < this.points.length, vPoint = this.points[i]; i++) {
			if (this.currentTimeline.contains(vPoint)) {
				this.currentTimes.push(this.pointsData.get(vPoint).position);
			}
		}

		var vIndex = this.timelines.indexOf(pTimeline);
		if (this.previousTimelineBtn) {
			if (vIndex > 0) {
				this.previousTimelineBtn.disabled = false;
				this.setButtonTitle(this.previousTimelineBtn, this.timelines[vIndex - 1].title);
			} else {
				this.previousTimelineBtn.disabled = true;
				this.setButtonTitle(this.previousTimelineBtn, '');
			}
		}
		if (this.nextTimelineBtn) {
			if (vIndex < this.timelines.length - 1) {
				this.nextTimelineBtn.disabled = false;
				this.setButtonTitle(this.nextTimelineBtn, this.timelines[vIndex + 1].title);
			} else {
				this.nextTimelineBtn.disabled = true;
				this.setButtonTitle(this.nextTimelineBtn, '');
			}
		}

		if (this.previousTimeBtn) this.setButtonTitle(this.previousTimeBtn, pTimeline.dataset.tePreviousTitle);
		if (this.nextTimeBtn) this.setButtonTitle(this.nextTimeBtn, pTimeline.dataset.teNextTitle);
	},

	setButtonTitle: function (pButton, pTitle) {
		pButton.setAttribute('title', pTitle);

		var vSpan = pButton.querySelector('span');
		if (!vSpan) vSpan = pButton.appendChild(document.createElement('span'));
		vSpan.textContent = pButton.title;
	}
};
