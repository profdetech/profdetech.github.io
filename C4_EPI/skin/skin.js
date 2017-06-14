(function (){
	if ("scAssmntMgr" in window){
		scAssmntMgr.xGmcqInitMarker = function(pElt, pMgr){}
	}
})();

// Adaptive illustration height
(function (){
	var vIllus = sc$("illustration");
	if (vIllus){
		window.resizeIllustration = function () {
			var vIllus = sc$("illustration");
			var vIllusHeight =  Math.min(350, scPaLib.findNode("chi:img", vIllus).clientHeight);
			vIllus.style.height = vIllusHeight + "px";
			sc$("content").style.paddingTop = vIllusHeight + "px";
		}
		scSiLib.addRule(vIllus, {
			onResizedDes : function(pOwnerNode, pEvent) {},
			onResizedAnc : function(pOwnerNode, pEvent) {
				if(pEvent.phase==1) resizeIllustration();
			}
		});
		scOnLoads[scOnLoads.length] = {
			onLoad : function() {
				resizeIllustration();
			}
		}
		resizeIllustration();
	}
})();
