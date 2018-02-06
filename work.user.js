// ==UserScript==
// @name         soa_fix
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  soa_fix
// @author       reruin@gmail.com
// @grant        none
// @include      http://*
// @include      https://*
// @connect      *
// @run-at       document-start
// ==/UserScript==

// adf.ly
// ctfile.com -ad

(function(root){
  var nw = root.nw = {};
  var stack = [];
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var hasOwnProperty   = ObjProto.hasOwnProperty;

  var page  = {
    addStyle : function(css){
        var el = document.createElement("style");
        el.innerHTML = css;
        document.getElementsByTagName('head')[0].appendChild(el);
    },
    addScript : function(script , pos){
      var el = document.createElement("script");
      el.textContent = script;
      if(typeof pos == 'object'){
        pos.appendChild(el)
      }
      else if(pos == 'head'){
        document.getElementsByTagName('head')[0].appendChild(el);
      }else{
        document.getElementsByTagName('body')[0].appendChild(el);
      }
    },
    addHtml : function(dom){
      var el = document.createElement("dom");
      el.innerHTML = dom;
      document.getElementsByTagName('body')[0].appendChild(el);
    }
  };

  var dom = {
    create : function (tag, id, cls, style, parent,data) {
        var el = document.createElement(tag);
        if (id) el.id = id;
        if (cls) el.className = cls;
        if (style) el.setAttribute("style", style);
        if (data) {
            for (var key in data)
                el.setAttribute(key, data[key]);
        }
        if (parent) parent.appendChild(el);
        return el;
    }
  };

  var promise = (function(){
    return typeof window.Promise === 'function' ?
      window.Promise :
      function(fn) {
        var state = 'pending',
            value = null,
            deferreds = [];

        this.then = function (onFulfilled, onRejected) {
            return new Promise(function (resolve, reject) {
                handle({
                    onFulfilled: onFulfilled || null,
                    onRejected: onRejected || null,
                    resolve: resolve,
                    reject: reject
                });
            });
        };

        function handle(deferred) {
          if (state === 'pending') {
              deferreds.push(deferred);
              return;
          }

          var cb = state === 'fulfilled' ? deferred.onFulfilled : deferred.onRejected,
              ret;
          if (cb === null) {
              cb = state === 'fulfilled' ? deferred.resolve : deferred.reject;
              cb(value);
              return;
          }
          try {
              ret = cb(value);
              deferred.resolve(ret);
          } catch (e) {
              deferred.reject(e);
          }
        }

        function resolve(newValue) {
            if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                var then = newValue.then;
                if (typeof then === 'function') {
                    then.call(newValue, resolve, reject);
                    return;
                }
            }
            state = 'fulfilled';
            value = newValue;
            finale();
        }

        function reject(reason) {
            state = 'rejected';
            value = reason;
            finale();
        }

        function finale() {
            setTimeout(function () {
                deferreds.forEach(function (deferred) {
                    handle(deferred);
                });
            }, 0);
        }

        fn(resolve, reject);
    };
  }());

  function $(e){
    return document.querySelector(e);
  }
  function $$(e){
    return document.querySelectorAll(e);
  }

  function noop(){

  }

  function has(obj, key) {
      return obj != null && hasOwnProperty.call(obj, key);
  }

  function key(obj){
      var k = [];
      for(var i in obj){
          if(has(obj , i)) k.push(i);
      }
      return k;
  }

  function isString(v){
    return typeof v === 'string';
  }

  function is(v , b){ 
    return ObjProto.toString.call(v) === "[object "+b+"]"; 
  } 

  function isArray(v){ 
    return is(v , 'Array'); 
  } 

  function isRegExp(v){ 
    return is(v , 'RegExp'); 
  }

  function isObject(v){ 
    return is(v , 'Object'); 
  }

  function isFunction(v){ 
    return is(v , 'Function'); 
  }

  function create(expr , handler){
    if(expr && handler){
      stack.push({rule:expr , post:handler});
    }
    else{
      stack.push(expr);
    }
  }

  function replace(str,obj , format){
      return str.replace(RegExp('(?:' + key(obj).join('|').replace(/([\:\'\)\(\{\}])/g,'\\$1') + ')','g') , function(match){
          return format ? format(obj[match]) : obj[match];
      });
  }

  

  function toArray(a){
    return Array.prototype.slice.call(a);
  }

  function formatLink(newurl , m){
    return newurl.replace(/\$(\d+)/g , function($0,$1){
      return m[$1];
    });
  }

  function hit(obj){
    var ret = [];
    for(var i in stack){
        var rule = stack[i].rule;
        if( isRegExp(rule) ){
          var m = obj.url.match(rule);
            // console.log(stack[i].post,m)
          if( m ){
            if(isString(stack[i].post)){
              ret.push({
                redirect : formatLink(stack[i].post , toArray(m))
              });
            }else{
              ret.push({
                pre : stack[i].pre || noop,
                post : stack[i].post || noop,
                args : toArray(m)
              });

            }
          }

        }
        else if(isObject(rule)){
          var flag = true;
          var m = null, ret_t = {};
          for(var key in rule){
            m = obj[key].match(rule[key]);
            if(!m){
              flag = false;
              break;
            }else{
              if(m.length>1){
                ret_t[key] = toArray(m);
              }
            }
          }
          if(flag){
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : ret_t
            });
          }
        }
        else if(isFunction(rule)){
          if( rule() ){
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : {}
            });
          }
        }
        else if(isArray(rule)){
          var flag = false;
          for (var j = rule.length - 1; j >= 0; j--) {
            if(obj.url.match(rule[j])){
              flag = true;
              break;
            }
          }
          if(flag){
            ret.push({
              pre : stack[i].pre || noop,
              post : stack[i].post || noop,
              args : {}
            });
          }
        }
    }
    return ret;
  }

  function init(){
    var loc = window.location;

    var obj = {
      url : loc.href,
      scheme: loc.protocol.slice(0, -1),
      host: loc.hostname,
      port: loc.port,
      path: loc.pathname,
      search: loc.search,
      hash: loc.hash
    };

    var handlers = hit(obj);
    if(handlers.length){
      handlers.forEach(function(handler){
        if(handler.redirect){
          open(handler.redirect);
        }
        else if(handler.pre) handler.pre(handler.args);
      });
    }

    document.addEventListener('DOMContentLoaded' , function(){
      if(handlers.length){
        handlers.forEach(function(handler){
          if(handler.post) {
            console.log(handler.post)
            handler.post(handler.args);
          }
        });
      }
    })
  }

  function monitor(tag , expr , callback){
    var d = tag.split(':');
    var evts = {
      'removed':'DOMNodeRemoved',
      'inserted':'DOMNodeInserted',
      'modified':'DOMSubtreeModified'
    };

    tag = d[0];

    var evt = evts[d[1] || 'modified'];

    var watch = d[2] === undefined ? false : true;

    if(isFunction(expr))  {
      callback = expr;
      expr =  null ; 
    }

    var matchSpan = function(target , t){
      var k = document.createElement('div');
      k.appendChild(target.cloneNode(false));
      var ret = k.querySelector(t);
      k = null;
      return ret;
    }

    //return new promise(function(resolve, reject){
      var handler = function(event){
        var target = event.target;
        if(matchSpan(target , tag)){
          if(expr){
            var m = target.textContent.match(expr);
            if(m){
              if(callback) callback(m);
              if(!watch) document.removeEventListener(evt , handler);
            }
          }else{
            if(callback) callback(target);
            
            if(!watch) document.removeEventListener(evt , handler);
          }
        }
      };
      
      document.addEventListener(evt , handler);
    //});
  }

  function open(url){
    open_direct(url);
  }

  function open_direct(url){
    var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    link.href = url;
    link.click();
  }


  nw.c = create;
  nw.m = monitor;
  nw.o = open;

  nw.$ = $;
  nw.$$ = $$;
  nw.r = replace;
  nw.dom = dom;

  nw.init = init;
  nw.noop = noop;

  nw.addStyle = page.addStyle;
  nw.addScript = page.addScript;
}(this));


//==================================

//==================================

nw.c({
  rule:/ess\.cnsuning\.com\/HRConsultsWeb\/jsp\/secShow/,
  
  post:function(){
    var script = function(){

      function personInfo(index){
        var ifm = window.frames["iframeContent"];
        for(var i=1;i<=10;i++){
          ifm.document.getElementById("div_"+i).style.display="none";
        }
        ifm.document.getElementById("div_"+index).style.display="block";
      }
      window.personInfo = personInfo;
      $('.online').append('<a href="">SUNING ESS</a>');
    };

    nw.addScript(';('+script+'());','body');

    var style = "a{color:#76858c;}a:hover{color:#0e2026;}body{background:#f6f6f6;}.online{height:initial;margin-top:0;}.online dl{display:none;}.online>a{opacity: 0.85;color:#1c1e26;text-decoration: none;font-size:25px;font-family:fantasy;font-size:32px;}.online dd,.loginInfor dd{letter-spacing:0;}.loginInfor li{display:inline-block;}.bottom{height:initial;width:500px;padding: 25px;}.loginInfor,.loginInfor dd{width:initial;font-size:14px;color:#76858c;}.loginInfor dd.logout a{text-indent:0;background:none;}.loginInfor dd.logout a:hover{color:#0e2026;}.bottom dd{float:initial;height:initial;color:#a6aeb3;font-size:13px;padding: 5px 50px;}.secBg{background:#f6f6f6;}.topContent{padding:16px 0;margin:0 25px;width:initial;}.iframeContent{position:absolute;top:0;top:0;float: none;display: block;padding-left:220px;width: 100%;height:100%;overflow-y:auto;box-sizing: border-box;border:none;}.secPage .leftNav{width:220px;border-right: 1px solid #edf0f2;}.secPage .leftNav{margin-top:0;z-index:1000;position: relative}.secPage .leftNav dt{margin-bottom:0;float:none;}.secPage .leftNav dt div{float:none;border-left:none;width:initial;padding:0;}.secPage .leftNav dt div ul li{width:initial;height:initial;border-bottom:none;}.secPage .leftNav dt div ul li a{width:initial;height:initial;line-height:2;margin-top:0;padding: 8px 32px 8px 64px;text-align:left;}.secPage .leftNav dt div ul li a.focus{background:#edf0f2;color:#0e2026;}.secPage .leftNav dt div ul li a:hover{background: #f7f9fa;color:#3d5159;}.secPage .leftNav dl a{width:initial;height:initial;float:none;background:#fff;color:#3d5159;font-size:14px;font-weight:normal;padding:8px 32px 8px 48px}.secPage .leftNav dl a.focus{color:#a6aeb3;/*background-color: #edf0f2;*/}.secPage .leftNav dl a:hover{background-color: #f7f9fa;color:#3d5159;}.secPage .mainContent{background:#fff;box-shadow: 0 2px 6px rgba(0,0,0,0.07);margin: 0 25px;width:auto;}.interac{display:none;}";
    
    nw.addStyle(style);
  }
});

//==================================
nw.init();