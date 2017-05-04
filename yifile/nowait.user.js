// ==UserScript==
// @name         yifile_nowait
// @namespace    https://github.com/reruin
// @version      0.1
// @description  yifile免等待
// @author       reruin@gmail.com
// @match        https://www.yifile.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function main(){
    	var css = '.stxt,#g207,.newfdown{display:none !important;};#bootyz1,#bootyz2,#bootyz3{display:block !important;}';
    	var style = document.createElement("style");
    	style.innerHTML = css;
    	document.getElementsByTagName('head')[0].appendChild(style);
    }
    
    document.onreadystatechange = function() {
    	if(document.readyState=="complete"){
    		main();
    	}
    }
})();

