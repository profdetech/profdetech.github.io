/**
 * LICENCE[[
 * Version: MPL 2.0/GPL 3.0/LGPL 3.0/CeCILL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is kelis.fr code.
 *
 * The Initial Developer of the Original Code is
 * samuel.monsarrat@kelis.fr
 *
 * Portions created by the Initial Developer are Copyright (C) 2016-2017
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 3.0 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 3.0 or later (the "LGPL"),
 * or the CeCILL Licence Version 2.1 (http://www.cecill.info/licences.en.html),
 * in which case the provisions of the GPL, the LGPL or the CeCILL are applicable
 * instead of those above. If you wish to allow use of your version of this file
 * only under the terms of either the GPL, the LGPL or the CeCILL, and not to allow
 * others to use your version of this file under the terms of the MPL, indicate
 * your decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL, the LGPL or the CeCILL. If you do not
 * delete the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL, the LGPL or the CeCILL.
 * ]]LICENCE
 */

/* === CANOPROF page manager ================================================ */
var tplMgr = {
	fHeaderPath : "ide:header",
	fMenuPath : "ide:outline",
	fPageOutlinePath : "ide:outline/des:ul.pageOutline",
	fContentPath : "ide:content",
	fInfoPath : "ide:info",
	fExternalIframePath : "des:iframe.externalUrl",
	fPdfIframePath : "des:iframe.pdfFrame",
	fCbkPath : "des:.collapsed",
	fGapPath : "des:input.gapInput|input.exoInput",
	fLnkHistPath : "des:a.lnkActivity|a.lnkTool",
	fStudentAreaPath : "des:div.studentArea/chi:textarea",
	fMatchBasketPath : "des:td.mtTdBasket",
	fLogin : null,
	fCbkInit : true,
	fPageOutlineAnchors : [],
	fPageOutlineTargets : [],
	fInfoOpen : true,
	fMenuOpen : false,
	fScrollTicking : false,
	fScrollPos : 0,
	fWheelScrollFactor : 10,
	fHoverScrollSpeed : 2,
	fClickScrollJump : 20,
	fIsIOS : /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()),
	fIsAndroid: /android/i.test(navigator.userAgent.toLowerCase()),
	fListeners : {scrollPage:[],slideMode:[]},
	fStrings : ["Ouvrir le menu","Fermer le menu",
		/*02*/    "Afficher les informations","Cacher les informations",
		/*04*/    "défilement haut","Faire défiler le menu vers le haut",
		/*06*/    "défilement bas","Faire défiler le menu vers le bas",
		/*08*/    "Tout afficher","Afficher toutes les sections qui sont refermées",
		/*10*/    "Tout réduire","Réduire toutes les sections qui sont ouvertes",
		/*12*/    "Retour","Revenir à \'%s\'",
		/*14*/    "Diaporama","Active la consultation du contenu en mode diaporama",
		/*16*/    'Ouvrir le contenu distant \"%s\" dans une nouvelle fenêtre.',"Un contenu non sécurisé (http) ne peut être embarqué dans une page sécurisée (https).",
		/*18*/    "Votre navigateur ne permet pas de visualiser des PDF directement dans une page web. Pour le visualiser : ","cliquez ici",
		""],

	controlLogin : function(pLogin){
		var vSavedCode = sessionStorage.getItem("code");
		if (pLogin.code != vSavedCode) {
			sessionStorage.setItem("page", window.location);
			window.location = pLogin.url;
		}
	},
	init : function(){
		try{
			var vHash = window.location.hash;
			if (vHash.length>0) vHash = vHash.substring(1);
			this.fContent = scPaLib.findNode(this.fContentPath);
			this.fContent.style.position = "relative";
			this.fContent.addEventListener("scroll", function(pEvt){
				tplMgr.fScrollPos = pEvt.target.scrollTop;
				if (!tplMgr.fScrollTicking){
					window.requestAnimationFrame(function() {
						tplMgr.fireEvent("scrollPage");
						tplMgr.fScrollTicking = false;
					});
				}
				tplMgr.fScrollTicking = true;
			});

			// Close collapsable blocks that are closed by default.
			scDynUiMgr.collBlk.fMode = 1;
			if (this.fCbkInit){
				var vCbks = scPaLib.findNodes(this.fCbkPath);
				for (var i=0; i<vCbks.length; i++) {
					var vCbk = vCbks[i];
					var vTgl = vCbk.fTgl = scPaLib.findNode("des:a", vCbk);
					if (!vHash || (!this.xIsContainedBy(sc$(vHash), vCbk) && !this.xIsContainedBy(vCbk, sc$(vHash)))) {
						vTgl.onclick();
					} else {
						var vCo = scPaLib.findNode("chi:div", vCbk);
						vCo.fClassName = vCo.className;
						vCo.fTitle = vTgl;
						vCo.className = vCo.fClassName + " " + scDynUiMgr.collBlk.fClassPrefix + "open";
						vCo.fCollapsed = false;
					}
				}
			}

			// Init activity history
			if (scPaLib.findNode("bod:.default")){
				try {
					this.fLinkHistory = JSON.parse(sessionStorage.getItem("linkHistory"));
					if (!this.fLinkHistory) this.fLinkHistory = [];
				} catch(e){
					this.fLinkHistory = [];
				}
				var vLnkHists = scPaLib.findNodes(this.fLnkHistPath);
				for (var i=0; i<vLnkHists.length; i++) {
					var vLnkHist = vLnkHists[i];
					vLnkHist.onclick = function(){
						var vId = this.id || this.parentNode.id;
						var vHref = (vId ?  scCoLib.hrefBase() + "#" + vId : window.location.href);
						if (tplMgr.fLinkHistory.length==0 || vHref != tplMgr.fLinkHistory[0].href) tplMgr.fLinkHistory.unshift({title:scPaLib.findNode("des:h1/chi:span").textContent, href:vHref});
						sessionStorage.setItem("linkHistory", JSON.stringify(tplMgr.fLinkHistory));
					}
				}
				for (var i=0; i<this.fLinkHistory.length; i++) {
					if (window.location.href == this.fLinkHistory[i].href){
						this.fLinkHistory.splice(0, i+1);
						sessionStorage.setItem("linkHistory", JSON.stringify(tplMgr.fLinkHistory));
						break;
					}
				}
				if (this.fLinkHistory.length>0){
					var vBackButton = scDynUiMgr.addElement("button", scPaLib.findNode(this.fHeaderPath), "backBtn");
					vBackButton.onclick = function(){window.location.assign(tplMgr.fLinkHistory[0].href)};
					vBackButton.innerHTML = '<span>'+this.fStrings[12]+'</span>';
					vBackButton.title = this.fStrings[13].replace("%s", this.fLinkHistory[0].title);
					this.xSwitchClass(document.body, "noBack", "hasBack", true);
				} else if (sessionStorage.getItem('SCportal-parent-url')){
					var vBackButton = scDynUiMgr.addElement("button", scPaLib.findNode(this.fHeaderPath), "backBtn");
					vBackButton.onclick = function(){window.location.assign(sessionStorage.getItem('SCportal-parent-url'))};
					vBackButton.innerHTML = '<span>'+this.fStrings[12]+'</span>';
					vBackButton.title = this.fStrings[13].replace("%s", sessionStorage.getItem('SCportal-parent-title'));
					this.xSwitchClass(document.body, "noBack", "hasBack", true);
				} else this.xSwitchClass(document.body, "hasBack", "noBack", true);
			} else this.xSwitchClass(document.body, "hasBack", "noBack", true);

			// Init Info
			if (scPaLib.findNode(this.fInfoPath)){
				this.fToggleInfoButton = scDynUiMgr.addElement("button", scPaLib.findNode(this.fHeaderPath), "infoBtn");
				this.fToggleInfoButton.onclick = function(){tplMgr.toggleInfo(); window.location = scCoLib.hrefBase() + "#info"};
				this.toggleInfo();
			} else {
				this.xSwitchClass(document.body, "showInfo", "hideInfo", true);
			}
			
			// Init menu
			if (scPaLib.findNode(this.fMenuPath)){
				var vMenu = this.fMenu = scPaLib.findNode(this.fMenuPath+"/chi:ul.outline|.pageOutline");
				var vMenuToolbar = scDynUiMgr.addElement("div", scPaLib.findNode(this.fMenuPath), "menuToolbar", vMenu);
				if (vMenu){
					vMenu.className = vMenu.className + " outlineRoot"
					this.xSwitchClass(document.body, "noMenu", "hasMenu", true);
					var vWaiMenuBtn = scPaLib.findNode("ide:accessibility/des:.waiMenu/des:a");
					if (vWaiMenuBtn) vWaiMenuBtn.onclick = function(){tplMgr.toggleMenu(true)};
					if (vCbks.length>0){
						this.xAddBtn(vMenuToolbar, "cbkOpenBtn", this.fStrings[8], this.fStrings[9]).onclick = function() {tplMgr.openCbks()};
						this.xAddBtn(vMenuToolbar, "cbkCloseBtn", this.fStrings[10], this.fStrings[11]).onclick = function() {tplMgr.closeCbks()};
					}
					if ("ScSiRuleEnsureVisible" in window) this.fMenuRule = new ScSiRuleEnsureVisible("ide:outline/des:.outlineSelect_yes|.currentSection_yes", "anc:ul.outlineRoot");
					vMenu.style.overflow="hidden";
					var vSrlUp = this.fSrlUp = scDynUiMgr.addElement("div", vMenu.parentNode, "mnuSrlUpFra", vMenu);
					vSrlUp.ontouchstart = function(){
						this.fIsTouched = true;
					};
					vSrlUp.onclick = function(){
						this.fIsTouched = false;
					};
					vSrlUp.onmouseover = function(){
						if (this.fIsTouched) return;
						if(tplMgr.scrollTask.fSpeed >= 0) {
							tplMgr.scrollTask.fSpeed = -tplMgr.fHoverScrollSpeed;
							scTiLib.addTaskNow(tplMgr.scrollTask);
						}
					};
					vSrlUp.onmouseout = function(){
						if (this.fIsTouched) return;
						tplMgr.scrollTask.fSpeed = 0;
					};
					var vSrlUpBtn = this.xAddBtn(vSrlUp, "mnuSrlUpBtn", this.fStrings[4], this.fStrings[5]);
					vSrlUpBtn.setAttribute("aria-hiden", "true");
					vSrlUpBtn.onclick = function(){
						tplMgr.scrollTask.step(-tplMgr.fClickScrollJump);
						return false;
					};
					var vSrlDwn = this.fSrlDwn = scDynUiMgr.addElement("div", vMenu.parentNode, "mnuSrlDwnFra", vMenu);
					vSrlDwn.ontouchstart = function(){
						this.fIsTouched = true;
					};
					vSrlDwn.onclick = function(){
						this.fIsTouched = false;
					};
					vSrlDwn.onmouseover = function(){
						if (this.fIsTouched) return;
						if(tplMgr.scrollTask.fSpeed <= 0) {
							tplMgr.scrollTask.fSpeed = tplMgr.fHoverScrollSpeed;
							scTiLib.addTaskNow(tplMgr.scrollTask);
						}
					};
					vSrlDwn.onmouseout = function(){
						if (this.fIsTouched) return;
						tplMgr.scrollTask.fSpeed = 0;
					};
					var vSrlDwnBtn = this.xAddBtn(vSrlDwn, "mnuSrlDwnBtn", this.fStrings[6], this.fStrings[7]);
					vSrlDwnBtn.setAttribute("aria-hiden", "true");
					vSrlDwnBtn.onclick = function(){
						tplMgr.scrollTask.step(tplMgr.fClickScrollJump);
						return false;
					};
					this.scrollTask.checkBtn();
					scSiLib.addRule(vMenu, this.scrollTask);
					vMenu.onscroll = function(){tplMgr.scrollTask.checkBtn()};
					vMenu.onmousewheel = function(){tplMgr.scrollTask.step(Math.round(-event.wheelDelta/(scCoLib.isIE ? 60 : 40)*tplMgr.fWheelScrollFactor))}; //IE, Safari, Chrome, Opera.
					if(vMenu.addEventListener) vMenu.addEventListener('DOMMouseScroll', function(pEvent){tplMgr.scrollTask.step(pEvent.detail*tplMgr.fWheelScrollFactor)}, false);
				}
				if (scPaLib.findNode("bod:.textActivity") && "postscriptumMgr" in window && postscriptumMgr.available()) {
					this.fSldModeBtn = this.xAddBtn(vMenuToolbar, "sldModeBtn", this.fStrings[14], this.fStrings[15]).onclick = function() {
						tplMgr.toggleSldMode()
					}
				}
				if (vMenu || vMenuToolbar.hasChildNodes()){
					this.fToggleMenuButton = scDynUiMgr.addElement("button", scPaLib.findNode(this.fHeaderPath), "menuBtn");
					this.fToggleMenuButton.onclick = function(){tplMgr.toggleMenu()};
					var vSavedToggleMenu = localStorage.getItem("toggleMenu");
					if (vMenu){
						this.fMenuOpen = vSavedToggleMenu=="false" ? true : (vSavedToggleMenu=="true" ? false : (scPaLib.checkNode(".outline", vMenu) ? false : true));
					} else {
						this.fMenuOpen = true;
						this.xSwitchClass(document.body, "noMenu", "floatMenu", true);
					}
					this.toggleMenu();
				} else {
					this.xSwitchClass(document.body, "showMenu", "hideMenu", true);
				}
			}

			// Init page outline
			var vPageOutline = scPaLib.findNode(this.fPageOutlinePath);
			if (vPageOutline){
				this.fPageOutlineAnchors = scPaLib.findNodes("des:a", vPageOutline);
				for (var i=0; i<this.fPageOutlineAnchors.length; i++) {
					var vPageOutlineAnchor = this.fPageOutlineAnchors[i];
					var vTarget = sc$(vPageOutlineAnchor.hash.substring(1));
					vTarget.fAnchor = vPageOutlineAnchor;
					this.fPageOutlineTargets.push(vTarget);
				}
				this.registerListener("scrollPage", function(){tplMgr.updatePageOutline();});
				this.updatePageOutline();
			}

			// HASH listener
			window.addEventListener("hashchange", function(pEvt){
				var vHash = window.location.hash;
				if (vHash.length>0) vHash = vHash.substring(1);
				//scCoLib.log("tplMgr.hashchange : "+vHash);
				var vAnchor = sc$(vHash);
				if (vAnchor){
					var vAncCbks = scPaLib.findNodes("anc:.collBlk_closed", vAnchor);
					for (var i=0; i< vAncCbks.length; i++){
						vAncCbks[i].fTitle.onclick();
					}
					var vCurrBk = scPaLib.findNode("nsi:.collBlk_closed", vAnchor);
					if (vCurrBk) vCurrBk.fTitle.onclick();
					if (vAncCbks.length>0) window.location = window.location;
				}
				tplMgr.updatePageOutline(vAnchor);
			}, false);

			// Init StudentAreas
			var vStudentAreas = scPaLib.findNodes(this.fStudentAreaPath);
			for (var i=0; i<vStudentAreas.length; i++) {
				var vStudentArea = vStudentAreas[i];
				if (scServices.scorm2k4 && scServices.scorm2k4.isScorm2k4Active()){
					vStudentArea.value = tscServices.suspendDataStorage.getVal(["StudentArea", vStudentArea.id]);
				} else vStudentArea.value = localStorage.getItem(vStudentArea.id);
				vStudentArea.addEventListener("blur", function(pEvt){
					if (scServices.scorm2k4 && scServices.scorm2k4.isScorm2k4Active()){
						scServices.suspendDataStorage.setVal(["StudentArea", this.id], this.value);
					} else localStorage.setItem(this.id, this.value);
				}, false);
			}

			// Init pdfFrames
			if (this.fIsAndroid || this.fIsIOS){
				var vPdfIframes = scPaLib.findNodes(this.fPdfIframePath);
				for (var i=0; i<vPdfIframes.length; i++) {
					var vPdfIframe = vPdfIframes[i];
					var vIframeParent = vPdfIframe.parentNode;
					scDynUiMgr.addElement("em", vIframeParent, "pdfFallBack").innerHTML = this.fStrings[18];
					var vPdfLink = scDynUiMgr.addElement("a", vIframeParent, "pdfLink");
					vPdfLink.target="_blank";
					vPdfLink.href=vPdfIframe.src;
					vPdfLink.innerHTML = this.fStrings[19];
					vIframeParent.removeChild(vPdfIframe);
				}
			}
			
			// Init fMatchBasketPath
			this.MatchBaskets = scPaLib.findNodes(this.fMatchBasketPath);
			if (this.MatchBaskets.length>0){
				this.registerListener("scrollPage", function(){tplMgr.updateMatchBaskets();});
				scSiLib.addRule(this.fContent, {
					onResizedAnc : function(pOwnerNode, pEvent) {
						if(pEvent.phase==1 || pEvent.resizedNode == pOwnerNode) return;
						tplMgr.updateMatchBaskets();
					},
					onResizedDes : function(pOwnerNode, pEvent) {
						if(pEvent.phase==1) return;
						tplMgr.updateMatchBaskets();
					}
				});
				for (var i=0; i<this.MatchBaskets.length; i++) {
					var vMatchBasket = this.MatchBaskets[i];
					vMatchBasket.fContainer = scPaLib.findNode("chi:div", vMatchBasket);
					vMatchBasket.fContainer.style.marginTop = "0px";
					vMatchBasket.fContainer.style.marginBottom = "0px";
				}
			}

			if ("scTooltipMgr" in window ) {
				scTooltipMgr.addShowListener(this.sTtShow);
				scTooltipMgr.addHideListener(this.sTtHide);
			}

			if (scPaLib.findNode("bod:.textActivity") && "postscriptumMgr" in window && postscriptumMgr.available()) {
				if (sessionStorage.getItem("sldMode") == "true") tplMgr.toggleSldMode();
			}
			
			scOnLoads[scOnLoads.length] = this;
		} catch(e){scCoLib.log("ERROR tplMgr.init : "+e)}
	},

	loadSortKey:"ZZ",

	onLoad : function(){
		// Init text input resizing
		var vGaps = scPaLib.findNodes(this.fGapPath);
		for (var i=0; i<vGaps.length; i++) {
			var vGap = vGaps[i];
			vGap.fSizeSpan = scDynUiMgr.addElement("span", vGap.parentNode, "gapSize", null, {visibility:"hidden", position:"absolute", left:"-10000px", top:"-10000px"});
			vGap.fWidth = vGap.clientWidth || 12 * vGap.getAttribute("size");
			function resizeForText(vText, vGap) {
				vGap.fSizeSpan.textContent = vText;
				vGap.style.width = Math.max(vGap.fSizeSpan.clientWidth, vGap.fWidth) + "px";
			}
			vGap.addEventListener("keypress", function(pEvt){
				pEvt = pEvt || window.event;
				if (pEvt.which && pEvt.charCode) {
					var c = String.fromCharCode(pEvt.keyCode | pEvt.charCode);
					resizeForText(this.value + c, this);
				}
			}, false);
			vGap.addEventListener("keyup", function(pEvt){
				pEvt = pEvt || window.event;
				if (pEvt.keyCode === 8 || pEvt.keyCode === 46 || pEvt.keyCode === 17) { //backspace, delete, ctrl
					resizeForText(this.value, this);
				}
			}, false);
			resizeForText(vGap.value, vGap);
		}
		// Init external iframes
		if (window.location.protocol == "https:"){
			var vFrames = scPaLib.findNodes(this.fExternalIframePath);
			for (var i=0; i<vFrames.length; i++) {
				var vFrame = vFrames[i];
				var vSrc = vFrame.getAttribute("src");
				if (vSrc.indexOf("http:")==0) vFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent('<html style="font-family:sans-serif;height:100%;"><head></head><body style="position:absolute;top:0;left:0;right:0;bottom:0;box-shadow:inset 0 0 50px #e39595;margin:0;"><p style="position:absolute;top:30%;left:10%;right:10%;text-align:center;color:gray;"><em>'+this.fStrings[16].replace('%s', '<a target="_blank" href="'+vSrc+'">'+vSrc+'<a>')+'<br/><br/>'+this.fStrings[17]+'</em></p></body></html>');
			}
		}
	},
	openCbks : function(){
		var vCbks = scPaLib.findNodes("des:.collBlk_closed");
		for (var i=0; i<vCbks.length; i++) vCbks[i].fTitle.onclick();
	},
	closeCbks : function(){
		var vCbks = scPaLib.findNodes("des:.collBlk_open");
		for (var i=0; i<vCbks.length; i++) vCbks[i].fTitle.onclick();
	},
	updateMatchBaskets : function(){
		//scCoLib.log("updateMatchBaskets");
		for (var i=0; i<this.MatchBaskets.length; i++) {
			var vBasket = this.MatchBaskets[i];
			var vBasketOffset = this.xGetOffsetTop(vBasket, this.fContent);
			if (isNaN(vBasketOffset)) break;
			var vScrollTop = this.fContent.scrollTop;
			var vContentHeight = this.fContent.clientHeight;
			var vBasketHeight = vBasket.clientHeight;
			if (vBasketOffset+vBasketHeight>vScrollTop && vBasketOffset<vScrollTop){ // Basket is visible
				vBasket.fContainer.style.marginTop=Math.min(vScrollTop-vBasketOffset, vBasketHeight-vBasket.fContainer.clientHeight)+"px";
			} else vBasket.fContainer.style.marginTop="0px";
		}
	},
	updatePageOutline : function(pTarget){
		//scCoLib.log("updatePageOutline");
		var vTarget = null, vTargetOffset = null, vTargetHeight = null;
		if (this.fPageOutlineTargets.length==0) return;
		if (pTarget && pTarget.fAnchor) vTarget = pTarget;
		else{
			var vContentHeight = this.fContent.clientHeight;
			for (var i=0; i<this.fPageOutlineTargets.length; i++){
				vTarget = this.fPageOutlineTargets[i];
				vTargetOffset = this.xGetOffsetTop(vTarget, this.fContent);
				vNextTargetOffset = (i < this.fPageOutlineTargets.length-1) ? this.xGetOffsetTop(this.fPageOutlineTargets[i+1], this.fContent) : null;
				vTargetHeight = vTarget.offsetHeight;
				if(vTargetOffset >= this.fScrollPos && vTargetOffset - this.fScrollPos < vContentHeight-vTargetHeight) break;
				else if(vNextTargetOffset && vNextTargetOffset > vContentHeight + this.fScrollPos) break;
			}
		}
		for (var i=0; i<this.fPageOutlineAnchors.length; i++) this.xSwitchClass(this.fPageOutlineAnchors[i], "currentSection_yes", "currentSection_no", true);
		this.xSwitchClass(vTarget.fAnchor, "currentSection_no", "currentSection_yes", true);
		this.fMenuRule.updateNode(vTarget.fAnchor);
		//window.location = scCoLib.hrefBase() + "#" + vTarget.id;
	},
	makeVisible : function(pNode){
		// Ouvre bloc collapsable contenant pNode
		var vCollBlk = scPaLib.findNode("anc:.collBlk_closed",pNode);
		if(vCollBlk) vCollBlk.fTitle.onclick();
	},
	toggleMenu : function(pForceOpen){
		if (pForceOpen) this.fMenuOpen = false;
		if (this.fMenuOpen) this.xSwitchClass(document.body, "showMenu", "hideMenu", true);
		else this.xSwitchClass(document.body, "hideMenu", "showMenu", true);
		this.fMenuOpen = !this.fMenuOpen;
		this.fToggleMenuButton.innerHTML = '<span>'+this.fStrings[(this.fMenuOpen ? 1 : 0)]+'</span>';
		localStorage.setItem("toggleMenu", this.fMenuOpen);
	},
	toggleInfo : function(){
		if (this.fInfoOpen) this.xSwitchClass(document.body, "showInfo", "hideInfo", true);
		else this.xSwitchClass(document.body, "hideInfo", "showInfo", true);
		this.fInfoOpen = !this.fInfoOpen;
		this.fToggleInfoButton.innerHTML = '<span>'+this.fStrings[(this.fInfoOpen ? 3 : 2)]+'</span>';
	},
	toggleSldMode: function() {
		if (this.fSldMode == true) {
			sessionStorage.setItem('sldMode', false);
			window.location.reload();
		} else {
			if (scPaLib.checkNode(".floatMenu", document.body)){
				this.fMenuOpen = true;
				this.toggleMenu();
			}
			function initSldMode() {
				if (postscriptumMgr.isReady() && mathjaxMgr.isReady()) {
					var vWidth = window.innerWidth;
					if (tplMgr.fMenu) {
						var vMenuOpen = tplMgr.fMenuOpen;
						if (!vMenuOpen) tplMgr.toggleMenu();
						if (getComputedStyle(tplMgr.fMenu).position != 'absolute') vWidth -= tplMgr.fMenu.clientWidth;
						tplMgr.toggleMenu();
					}
					document.body.classList.add("sldMode");
					var vProcessor = postscriptum(tplMgr.fContent, {
						media: 'projection',
						defaultPageSize: [vWidth + 'px', tplMgr.fContent.clientHeight + 'px'],
						styles: [scServices.scLoad.resolveDestUri("/skin/sld.css")],
						preprocessStyle: false,
						defaultStyle: false
					});
					vProcessor
						.use('cp-slideshow')
						.paginate()
						.on('end', function () {
							sessionStorage.setItem('sldMode', true);
							postscriptumMgr.removeLoadMask();
							tplMgr.fSldMode = true;
							if (tplMgr.fMenu && vMenuOpen != tplMgr.fMenuOpen) tplMgr.toggleMenu();
						});
				};
			}
			postscriptumMgr.addLoadMask(tplMgr.fContent.parentNode);
			postscriptumMgr.init([ 'cp-slideshow' ], initSldMode);
			if (!mathjaxMgr.isReady()) mathjaxMgr.register(initSldMode);
			this.fireEvent("slideMode", true);
		}
	},
	registerListener : function(pListener, pFunc){
		if (this.fListeners[pListener]) this.fListeners[pListener].push(pFunc);
		else scCoLib.log("ERROR - tplMgr.registerListener - non-existent listener : " + pListener);
	},
	fireEvent : function(pListener, pParam){
		if (this.fListeners[pListener]) for (var i=0; i< this.fListeners[pListener].length; i++) this.fListeners[pListener][i](pParam);
		else scCoLib.log("ERROR - tplMgr.fireEvent - non-existent listener : " + pListener);
	},

	/* === Callback functions =================================================== */
	/** Tooltip lib show callback */
	sTtShow: function(pNode) {
		if (!pNode.fOpt.FOCUS && !pNode.onblur) pNode.onblur = function(){scTooltipMgr.hideTooltip(true);};
	},
	/** Tooltip lib hide callback : this = scTooltipMgr */
	sTtHide: function(pNode) {
		if (pNode) pNode.focus();
	},

	/* === Utilities ============================================================ */
	/** tplMgr.xIsContainedBy : */
	xIsContainedBy : function(pNode, pAncestor) {
		if (!pNode || !pAncestor) return false;
		try{
			var vParent = pNode.parentNode;
			while (pAncestor !== vParent) vParent = vParent.parentNode;
			return true;
		} catch(e){
			return false;
		}
	},

	/** tplMgr.xAddBtn : Add a HTML button to a parent node. */
	xAddBtn : function(pParent, pClassName, pCapt, pTitle, pNxtSib) {
		var vBtn = pParent.ownerDocument.createElement("button");
		vBtn.className = pClassName;
		vBtn.fName = pClassName;
		if (pTitle) vBtn.setAttribute("title", pTitle);
		if (pCapt) vBtn.innerHTML = "<span>" + pCapt + "</span>"
		if (pNxtSib) pParent.insertBefore(vBtn,pNxtSib)
		else pParent.appendChild(vBtn);
		return vBtn;
	},

	/** tplMgr.xSwitchClass - replace a class name. */
	xSwitchClass : function(pNode, pClassOld, pClassNew, pAddIfAbsent, pMatchExact) {
		var vAddIfAbsent = typeof pAddIfAbsent == "undefined" ? false : pAddIfAbsent;
		var vMatchExact = typeof pMatchExact == "undefined" ? true : pMatchExact;
		var vClassName = pNode.className;
		var vReg = new RegExp("\\b"+pClassNew+"\\b");
		if (vMatchExact && vClassName.match(vReg)) return;
		var vClassFound = false;
		if (pClassOld && pClassOld != "") {
			if (vClassName.indexOf(pClassOld)==-1){
				if (!vAddIfAbsent) return;
				else if (pClassNew && pClassNew != '') pNode.className = vClassName + " " + pClassNew;
			} else {
				var vCurrentClasses = vClassName.split(' ');
				var vNewClasses = new Array();
				for (var i = 0, n = vCurrentClasses.length; i < n; i++) {
					var vCurrentClass = vCurrentClasses[i];
					if (vMatchExact && vCurrentClass != pClassOld || !vMatchExact && vCurrentClass.indexOf(pClassOld) != 0) {
						vNewClasses.push(vCurrentClasses[i]);
					} else {
						if (pClassNew && pClassNew != '') vNewClasses.push(pClassNew);
						vClassFound = true;
					}
				}
				pNode.className = vNewClasses.join(' ');
			}
		}
		return vClassFound;
	},

	xGetOffsetTop : function(pNode, pContainer) {
		var vParent = pNode.offsetParent;
		if(!vParent) return Number.NaN;
		var vOffset = pNode.offsetTop;
		while(vParent != pContainer) {
			var vNewParent = vParent.offsetParent;
			if(!vNewParent) return Number.NaN;
			vOffset += vParent.offsetTop;
			vParent = vNewParent;
		}
		return vOffset;
	},

	/** Local Storage API (localStorage/userData/cookie) */
	Storage : function (pId, pRootKey){
		if (pId && !/^[a-z][a-z0-9]+$/.exec(pId)) throw new Error("Invalid store name");
		this.fId = (typeof pId != "undefined") ? pId : "";
		this.fRootKey = (typeof pRootKey != "undefined") ? pRootKey : scServices.scLoad.getRootUrl();
		this.localGet = function(pKey) {var vRet = localStorage.getItem(this.fRootKey+this.xKey(pKey));return (typeof vRet == "string" ? vRet : null)};
		this.localSet = function(pKey, pVal) {localStorage.setItem(this.fRootKey+this.xKey(pKey), pVal)};
		this.sessionGet = function(pKey) {var vRet = sessionStorage.getItem(this.fRootKey+this.xKey(pKey));return (typeof vRet == "string" ? vRet : null)};
		this.sessionSet = function(pKey, pVal) {sessionStorage.setItem(this.fRootKey+this.xKey(pKey), pVal)};
		this.xKey = function(pKey){return this.fId + this.xEsc(pKey)};
	},

	/* === Tasks ============================================================== */
	/** tplMgr.scrollTask : menu scroll timer & size task */
	scrollTask : {
		fClassOffUp : "btnOff",
		fClassOffDown : "btnOff",
		fSpeed : 0,
		execTask : function(){
			try {
				if(this.fSpeed == 0) return false;
				tplMgr.fMenu.scrollTop += this.fSpeed;
				return true;
			}catch(e){
				this.fSpeed = 0;
				return false;
			}
		},
		step: function(pPx) {
			try { tplMgr.fMenu.scrollTop += pPx; }catch(e){}
		},
		checkBtn: function(){
			var vScrollTop = tplMgr.fMenu.scrollTop;
			var vBtnUpOff = tplMgr.fSrlUp.className.indexOf(this.fClassOffUp);
			if(vScrollTop <= 0) {
				if(vBtnUpOff < 0) tplMgr.fSrlUp.className+= " "+this.fClassOffUp;
			} else {
				if(vBtnUpOff >= 0) tplMgr.fSrlUp.className = tplMgr.fSrlUp.className.substring(0, vBtnUpOff);
			}

			var vContentH = scSiLib.getContentHeight(tplMgr.fMenu);
			var vBtnDownOff = tplMgr.fSrlDwn.className.indexOf(this.fClassOffDown);
			if( vContentH - vScrollTop <= tplMgr.fMenu.offsetHeight){
				if(vBtnDownOff < 0) tplMgr.fSrlDwn.className+= " "+this.fClassOffDown;
			} else {
				if(vBtnDownOff >=0) tplMgr.fSrlDwn.className = tplMgr.fSrlDwn.className.substring(0, vBtnDownOff);
			}
		},
		onResizedAnc:function(pOwnerNode, pEvent){
			if(pEvent.phase==2) this.checkBtn();
		},
		ruleSortKey : "checkBtn"
	}
}

/** ### ScSiRuleEnsureVisible ######### */
function ScSiRuleEnsureVisible(pPathNode, pPathContainer) {
	this.fPathNode = pPathNode;
	this.fPathContainer = pPathContainer;
	this.fEnable = true;
	scOnLoads[scOnLoads.length] = this;
}
ScSiRuleEnsureVisible.prototype = {
	enable : function(pState) {
		this.fEnable = pState;
	},
	updateNode : function(pNode) {
		this.fEnable = true;
		this.fNode = pNode;
		if(!this.fNode) this.fEnable = false;
		this.fContainer = scPaLib.findNode(this.fPathContainer, this.fNode);
		if(!this.fContainer) this.fEnable = false;
		this.xEnsureVis();
	},
	updateNodePath : function(pPathNode) {
		this.fEnable = true;
		if (typeof pPathNode != "undefined") this.fPathNode = pPathNode;
		this.fNode = scPaLib.findNode(this.fPathNode);
		if(!this.fNode) this.fEnable = false;
		this.fContainer = scPaLib.findNode(this.fPathContainer, this.fNode);
		if(!this.fContainer) this.fEnable = false;
		this.xEnsureVis();
	},
	onResizedAnc : function(pOwnerNode, pEvent) {
		if(pEvent.phase==1 || pEvent.resizedNode == pOwnerNode) return;
		this.xEnsureVis();
	},
	onResizedDes : function(pOwnerNode, pEvent) {
		if(pEvent.phase==1) return;
		this.xEnsureVis();
	},
	xEnsureVis : function() {
		if (!this.fEnable) return;
		var vOffsetTop = scSiLib.getOffsetTop(this.fNode, this.fContainer)+this.fContainer.scrollTop;
		var vOffsetMiddle = vOffsetTop + this.fNode.offsetHeight/2;
		var vMiddle = this.fContainer.clientHeight / 2;
		this.fContainer.scrollTop = Math.min(vOffsetMiddle - vMiddle, vOffsetTop);
	},
	onLoad : function() {
		try {
			if (this.fPathNode) this.fNode = scPaLib.findNode(this.fPathNode);
			if(!this.fNode) this.fEnable = false;
			this.fContainer = scPaLib.findNode(this.fPathContainer, this.fNode);
			if(!this.fContainer) this.fEnable = false;
			else{
				scSiLib.addRule(this.fContainer, this);
				this.xEnsureVis();
			}
		} catch(e){scCoLib.log("ScSiRuleEnsureVisible.onLoad error : "+e);}
	},
	loadSortKey : "SiZ",
	ruleSortKey : "Z"
};