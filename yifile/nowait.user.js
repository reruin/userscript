// ==UserScript==
// @name         yifile_nowait
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  yifile免等待
// @author       reruin@gmail.com
// @match        https://www.yifile.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.onload = function(){
    	$(".stxt,#g207,.newfdown").hide();
    	$("#bootyz1,#bootyz2,#bootyz3").show();
    }

})();

