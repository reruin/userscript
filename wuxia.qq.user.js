// ==UserScript==
// @name         wuxia
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  wuxia
// @author       reruin@gmail.com
// @grant        none
// @include      http://wuxia.qq.com/cp/a20180117tdspring/
// @connect      *
// @run-at       document-start
// ==/UserScript==

function noop() {
  return true;
}


(function(){


  function addScript(script, pos) {
    var el = document.createElement("script");
    el.textContent = script;
    if (typeof pos == 'object') {
      pos.appendChild(el)
    } else if (pos == 'head') {
      document.getElementsByTagName('head')[0].appendChild(el);
    } else {
      document.getElementsByTagName('body')[0].appendChild(el);
    }
  }

  

  var script = function() {
    // 0 今日未打卡 1 下一轮打卡 2 今日已经打卡
    var status = 0;

    var el;

    var lastReport;

    function logger(t){
      console.log("\n %c "+t+" \n","color: #fadfa3; background: #030307; padding:5px 0;");
    }

    function createDom(span , id , style){
      var el = document.createElement(span);
      el.id = id;
      el.style = style;
      document.body.appendChild(el);
      return el;
    }

    function request(url , data){

      let fetchData = { 
          method: 'GET', 
          credentials: "include",
          
      }
      if(data){
        fetchData.body = JSON.stringify(data)
      }
      return new Promise(function(resolve, reject) {
        fetch(url, fetchData).then(function(resp) {
          resolve(resp.text())
        },function(e) {
          reject(e)
        }).catch(function(e) {
          reject(e)
        })
      })
    }

    

    function init(){
      el = createDom('div' , '_tips_'  , 'position:fixed;height:48px;line-height:48px;box-sizing:border-box;padding:0 20px; width : 100%;background:#ff0000;color:#fff;z-index:9999;bottom:0;left:0;');;
      el.innerHTML = '自动打卡中'
      process()
      
    }

    function action(){
      document.querySelector('.btn-log').click()
    }
    
    function timeHit(){
      var date = new Date()
      el.innerHTML = '自动打卡中(上次检查：'+date.toLocaleString()+' )'

      var h = date.getHours()
      if( h == 8 ){
        if(status == 0){
          status = 1
        }
      }else if(h == 0){
        status = 0
      }
    }

    function process(){
      request(location.href).then(function(resp){
        timeHit()
        if( status == 1 ){
          action()
          status = 2
        }else{
          setTimeout( function(){
            process()
          } , 30 * 1000 )
        }
      })
    }

   
    var url = location.href , pathname = location.pathname
    init()

  }


  addScript(';(' + script + '());', 'body');
  
}());