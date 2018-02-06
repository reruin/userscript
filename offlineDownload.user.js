// ==UserScript==
// @name         BaiduPanAutoDownload
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  添加到百度云盘离线下载任务
// @author       reruin@gmail.com
// @grant        none
// @include      http://*
// @include      https://*
// @require      http://cdn.bootcss.com/jquery/3.2.1/jquery.min.js
// @connect      *
// @run-at       document-start
// ==/UserScript==

function noop() {
  return true;
}

document.addEventListener('DOMContentLoaded', function() {
  $('a').each(function(){
    $(this).after('<a class="add_task"> +</a>')
  })

  $(document).on('click','.add_task' , function(){
    var el = $(this).previousSbiling
    console.log(el)
  })
})


function addTask(e) {
  // Executed when user click on menuitem
  // aEvent.target is the <menuitem> element


  var form = document.createElement("form");
  form.setAttribute("method", "POST");
  form.setAttribute("action", "//www.google.com/searchbyimage/upload");
  form.setAttribute("enctype", "multipart/form-data");
  form.setAttribute("target", "_blank");
  addParamsToForm(form, "image_content", inlineImage);
  addParamsToForm(form, "filename", "");
  addParamsToForm(form, "image_url", "");
  body.appendChild(form);
  form.submit();
https://pan.baidu.com/rest/2.0/services/cloud_dl
 
}