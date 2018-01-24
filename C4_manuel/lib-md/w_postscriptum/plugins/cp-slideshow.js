'use strict';

(function (ps) {

	let resizeTimeout = -1, currentPageIndex = -1;
	window.addEventListener('resize', () => {
		sessionStorage.setItem("sldReloadPageIndex", currentPageIndex);
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => window.location.reload(), 500);
    });

	ps.plugin('cp-slideshow', (processor, options) => {
		let doc = processor.source.ownerDocument;

		let sldScroll = false;
		processor.on('page-content', function() {
			if (this.currentPage.body.querySelector('div.exercice:not(.openQuestion)')) {
				sldScroll = true;
			}
		});
		processor.on('break-point-invalid', function () {
			let fontSize = parseFloat(getComputedStyle(this.currentPage.body).fontSize, 10);
			if (fontSize == 8) sldScroll = true;
			if (sldScroll) {
				this.breakPoint = ps.ranges.getPositionAfter(this.currentPage.body.lastChild);
				return 'break-point-found';
			} else {
				fontSize = fontSize * 80 / 100;
				if (fontSize < options.minFontSize) fontSize = options.minFontSize;
				this.currentPage.body.style.fontSize = fontSize + 'px';
				ps.layout.collapseMargin(this.currentPage);
				return 'detect-overflow';
			}
		});

		processor.on('page-end', function () {
			if (sldScroll) this.currentPage.body.classList.add('sldScroll');
			sldScroll = false;
		});

		let pages;
		processor.on('end', function () {
			pages = this.dest.getElementsByTagName('ps-page');

			window.addEventListener('hashchange', hashchange);

			let sldReloadPageIndex = sessionStorage.getItem("sldReloadPageIndex");
			if (sldReloadPageIndex !== null) gotoPage(parseInt(sldReloadPageIndex));
			else hashchange();
			sessionStorage.removeItem("sldReloadPageIndex");

			doc.addEventListener('keydown', event => {
				if (event.keyCode == 37 /* LEFT ARROW */) previousPage();
			else if (event.keyCode == 39 /* RIGHT ARROW */) nextPage();
		});

			var touchStart, tap;
			document.addEventListener('touchstart', function(event) {
				touchStart = event.changedTouches[0];
				touchStart.time = Date.now();
			}, false);

			document.addEventListener('touchend', function(event) {
				var touchEnd = event.changedTouches[0],
					distanceX = touchEnd.pageX - touchStart.pageX,
					distanceY = touchEnd.pageY - touchStart.pageY,
					elapsedTime = Date.now() - touchStart.time;
				if (Math.abs(distanceX) >= 150 && elapsedTime <= 500 && Math.abs(distanceY) <= 100) {
					// Swipe
					if (distanceX > 0) previousPage();
					else nextPage();
				}
			}, false);
		});

		function hashchange() {
			let hash = window.location.hash;
			if (!hash) gotoPage(0);
			let target = document.getElementById(hash.substr(1));
			if (!target) gotoPage(0);
			else gotoElement(target);
		}

		function nextPage() {
			gotoPage(currentPageIndex+1);
		}

		function previousPage() {
			gotoPage(currentPageIndex-1);
		}

		function gotoElement(element) {
			let parent = element;
			while (parent.nodeType == Node.ELEMENT_NODE) {
				if (parent.localName == 'ps-page') {
					gotoPage(Array.prototype.indexOf.call(pages, parent));
					break;
				}
				parent = parent.parentNode;
			}
		}

		function gotoPage(pageIndex) {
			if (pageIndex < 0) pageIndex = 0;
			else if (pageIndex >= pages.length) pageIndex = pages.length -1;
			if (currentPageIndex != -1) pages[currentPageIndex].removeAttribute('ps-slideshow-current');
			let currentPage = pages[pageIndex];
			currentPage.setAttribute('ps-slideshow-current', 'true');
			currentPageIndex = pageIndex;
			for (var i=0; i<tplMgr.fPageOutlineTargets.length; i++) {
				let target = tplMgr.fPageOutlineTargets[i];
				if (currentPage.contains(target)) {
					tplMgr.updatePageOutline(target);
				}
			}
		}

	}, { minFontSize: 8 });
})(postscriptum);
