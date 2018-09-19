(function (){
	if ("scAssmntMgr" in window){
		scAssmntMgr.xGmcqInitMarker = function(pElt, pMgr){}
	}
	/* ajout label derrière inputs des choiceList pour stylage*/
	try{
		var vInputs=scPaLib.findNodes("des:.choiceList_in/des:input");
		for (i = 0; i < vInputs.length; i++) {
			var vLabel = document.createElement("label");
			vLabel.setAttribute("for", vInputs[i].id);
			vInputs[i].parentNode.appendChild(vLabel);
		}
	}catch(e){}
})();

// Adaptive illustration height
(function (){
	var vIllus = sc$("illustration");
	if (vIllus){
		window.resizeIllustration = function () {
			var vIllus = sc$("illustration");
			var vIllusHeight =  Math.min(350, scPaLib.findNode("chi:img", vIllus).clientHeight);
			vIllus.style.height = vIllusHeight + "px";
			sc$(scPaLib.checkNode(".quiz", document.body) ? "header" : "content").style.paddingTop = vIllusHeight + "px";
		}
		scSiLib.addRule(vIllus, {
			onResizedDes : function(pOwnerNode, pEvent) {},
			onResizedAnc : function(pOwnerNode, pEvent) {
				if(pEvent.phase==1) resizeIllustration();
			}
		});
		tplMgr.registerListener("slideMode", function(pActive){
			if (pActive) sc$(scPaLib.checkNode(".quiz", document.body) ? "header" : "content").style.paddingTop = "";
		});
		scOnLoads[scOnLoads.length] = {
			onLoad : function() {
				resizeIllustration();
			}
		}
		resizeIllustration();
	}
})();