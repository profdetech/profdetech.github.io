var postscriptumMgr = {
	available: function() {
		var vNavVersions = navigator.userAgent.match(/\b\w+\/\d+\./g);
		return vNavVersions.some(function(pNavVersion) {
			var vNavVersion = pNavVersion.split('/');
			var vVersion = parseInt(vNavVersion[1]);
			if (vNavVersion[0] == 'Firefox') return vVersion >= 48;
			else if (vNavVersion[0] == 'Chrome') return vVersion >= 51;
			else if (vNavVersion[0] == 'Edge') return vVersion >= 14;
		});
	},

	init: function(pPlugins, pCb) {
		postscriptumMgr.xLoadScript('postscriptum-min.js', function() {
			var vPluginCount = pPlugins.length;
			pPlugins.forEach(function(pPlugin) {
				postscriptumMgr.xLoadScript('plugins/' + pPlugin + '.js', function() {
					vPluginCount--;
					if (pCb && vPluginCount == 0) {
						postscriptumMgr.fReady = true;
						pCb();
					}
				});
			});
		});
	},

	addLoadMask: function(pParent) {
		this.fLoadMask = pParent.appendChild(document.createElement('ps-loading-mask'));
		this.fLoadMask.appendChild(document.createElement('ps-loading-spinner'));
	},

	removeLoadMask: function() {
		this.fLoadMask.remove();
	},

	isReady: function () {
		return this.fReady;
	},

	xLoadScript: function(pPath, pCb) {
		var vScript = document.createElement("script");
		vScript.type = "application/javascript";
		vScript.src  = scServices.scLoad.resolveDestUri("/lib-md/w_postscriptum/" + pPath);
		vScript.onload = pCb;
		document.head.appendChild(vScript);
	}
}
