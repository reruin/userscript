// ==UserScript==
// @name         nowait
// @namespace    https://github.com/reruin
// @version      0.3
// @license      MIT
// @description  nowait
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

/**
 * yifile.com
 */
nw.c(/yifile\.com\/file\/[\w\W]+/ , function(){
  var css = '.stxt,#g207,.newfdown{display:none !important;}#bootyz1,#bootyz2,#bootyz3{display:block !important;}';
  nw.addStyle(css);
});

//==================================

/**
 * adf.ly
 */
nw.c({
  rule:/adf\.ly\/[^\/]+/,
  pre : function(data){
    function decode( ysmm ) {
        var left = '';
        var right = '';
        for ( var i = 0; i < ysmm.length; i++ ) {
            if ( i % 2 === 0 ) {
                left += ysmm.charAt(i);
            } else {
                right = ysmm.charAt(i) + right;
            }
        }
        return atob( left + right ).substr(2);
    }
    
    nw.m('script:removed',/var ysmm = '([a-zA-Z0-9+/=]+)'/,function(m){
      if(m) nw.o( decode(m[1]) );
    });
  }
});

//redirect
nw.c(/adf\.ly\/ad\/locked\?url=([^&]+)/ , '/$1');

//==================================

/**
 * ctfile.com
 *
 * remove ad
 */
nw.c({
  rule:/ctfile\.com\/(file|downhtml)\//,
  pre : function(){
    var css = '#ad_left,.download-box+.row-fluid,.download-box>ul li:last-child,#ad_right,.downpage_rl,.downpage_rl+.row-fluid{display:none;}';
    nw.addStyle(css);
  }
});

//==================================

/*
 * v.qq.com
 */
nw.c({
  rule : [
    /v\.qq\.com\/x/
  ],
  pre : function(){

    //__tenplay_switch2html5();
    var format = function(a , cb){
        a.adList.item.forEach(function(o){
          o.duration = 0;
        });
        ori_removead(a);
    }

    function hook(url){
      var cb_name = (url.match(/callback=([^&]+)/) || [0,''])[1];
      if(cb_name){
          var script = 'var ori_removead = window.'+cb_name+'; window.'+cb_name+'='+format.toString()+';';
          nw.addScript(';(function(){'+script+'}());');
      }
    }

    nw.m('script:inserted:watch',function(m){
      if(m.src && m.src.indexOf('livew.l.qq.com/livemsg') >=0){
        hook(m.src);
      }
    });
  },
  post : function(){
    var script = function(){

      $('body').on('click' , '.mod_episode a,.mod_playlist a' , function(){
        var isFlash = !!('__tenplay_switch2html5' in window);
        if(isFlash)
          location.href = $(this).attr('href');
      });
    };

    nw.addScript(';('+script+'());','body');
  }
});

//==================================

nw.c({
  rule:/console\.online\.net\/en\/order\/server\_limited$/,
  post:function(){
    if(!/server\-availability/.test(document.body.innerHTML)){
        setTimeout(function(){
            location.reload();
        },10000);
    }else{
        alert('OFFER');
    }
  }
});
//==================================
nw.init();