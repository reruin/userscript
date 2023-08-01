// ==UserScript==
// @name         oracle
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  virmach bf2018
// @author       reruin@gmail.com
// @grant        GM_openInTab
// @include      https://compute.plugins.oci.oraclecloud.com/*
// @connect      *
// @run-at       document-start
// ==/UserScript==


(function(root) {
    var nw = root.nw = {};
    var stack = [];
    var ArrayProto = Array.prototype,
        ObjProto = Object.prototype;
    var hasOwnProperty = ObjProto.hasOwnProperty;

    var page = {
        addStyle : function(css){
          var el = document.createElement("style");
          el.innerHTML = css;
          document.getElementsByTagName('head')[0].appendChild(el);
        },
        addScript: function(script, pos) {
            var el = document.createElement("script");
            el.textContent = script;
            if (typeof pos == 'object') {
                pos.appendChild(el);
            } else if (pos == 'head') {
                document.getElementsByTagName('head')[0].appendChild(el);
            } else {
                document.getElementsByTagName('body')[0].appendChild(el);
            }
        },

    }


    function noop() {

    }

    function has(obj, key) {
        return obj != null && hasOwnProperty.call(obj, key);
    }

    function key(obj) {
        var k = [];
        for (var i in obj) {
            if (has(obj, i)) k.push(i);
        }
        return k;
    }

    function isString(v) {
        return typeof v === 'string';
    }

    function is(v, b) {
        return ObjProto.toString.call(v) === "[object " + b + "]";
    }

    function isArray(v) {
        return is(v, 'Array');
    }

    function isRegExp(v) {
        return is(v, 'RegExp');
    }


    function create(expr, handler) {
        if (expr && handler) {
            stack.push({ rule: expr, post: handler });
        } else {
            stack.push(expr);
        }
    }

    function replace(str, obj, format) {
        return str.replace(RegExp('(?:' + key(obj).join('|').replace(/([\:\'\)\(\{\}])/g, '\\$1') + ')', 'g'), function(match) {
            return format ? format(obj[match]) : obj[match];
        });
    }

    function toArray(a) {
        return Array.prototype.slice.call(a);
    }

    function formatLink(newurl, m) {
        return newurl.replace(/\$(\d+)/g, function($0, $1) {
            return m[$1];
        });
    }

    function hit(obj) {
        var ret = [];
        for (var i in stack) {
            var rule = stack[i].rule;
            if (isRegExp(rule)) {
                var m = obj.url.match(rule);
                if (m) {
                    if (isString(stack[i].post)) {
                        ret.push({
                            redirect: formatLink(stack[i].post, toArray(m))
                        });
                    } else {
                        ret.push({
                            pre: stack[i].pre || noop,
                            post: stack[i].post || noop,
                            args: toArray(m)
                        });

                    }
                }

            }
        }
        return ret;
    }

    function init() {
        var loc = window.location;

        var obj = {
            url: loc.href,
            scheme: loc.protocol.slice(0, -1),
            host: loc.hostname,
            port: loc.port,
            path: loc.pathname,
            search: loc.search,
            hash: loc.hash
        };

        var handlers = hit(obj);
        if (handlers.length) {
            handlers.forEach(function(handler) {
                if (handler.redirect) {
                    open(handler.redirect);
                } else if (handler.pre) {
                  handler.pre(handler.args);
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function() {
            if (handlers.length) {
                handlers.forEach(function(handler) {
                    if (handler.post) {
                        handler.post(handler.args);
                    }
                });
            }
        })
    }

    function open_direct(url){
      GM_openInTab(url , true);
    }
    nw.c = create
    nw.init = init
    nw.o = open_direct
    nw.addScript = page.addScript
    nw.addStyle = page.addStyle
    setTimeout(()=>{
      init()
    },0)
}(this));

//https://compute.plugins.oci.oraclecloud.com/latest/prod-ap-seoul-1-index.tpl.html?1568877735570
nw.c({
  rule: /compute\.plugins\.oci\.oraclecloud\.com\/latest\/prod-ap-seoul-1-index\.tpl\.html/,
  pre: function() {},
  post: function() {

    let origin = window.console.error
    let stop = false
    let count = 0
    let start = Date.now()
    let lastTick = Number.POSITIVE_INFINITY
    let errorCount = 0
    let lastErr = ''
    const process = (delay = 0) => {
      let btn = document.querySelector('.oui-savant__Panel--Footer button')

      count++
      let ave = (count * 60 * 1000 / (Date.now() - start) ).toFixed(2) + ' qpm'
      
      setTimeout(() => {
        lastTick = Date.now()
        btn.click()
      },delay)

      let msg = `success(${count-errorCount}),error(${errorCount}), ${ave}, ${Math.round((Date.now() - start)/1000)}s, msg:${lastErr}`
      let board = document.querySelector('.oui-savant__Panel--Title')
      if(board) board.innerHTML = msg
    }

    const sessionCheck = () => {
      if( stop ) return

      // 3600s 保持会话
      let btn = document.querySelector('.oui-form-dialog__footer-controls button')
      if(btn){
        btn.click()
      }

      let el = document.querySelector('.oui-savant__Panel--PanelMessageBlock')
      console.log(el)
      if(el){
        let str = el.innerHTML
        if( str.includes('Out of host capacity') || str.includes('Failed to fetch') ){
          delay = 7500 - (Date.now() - lastTick)
          process(delay)
        }
        //请求太频繁
        else if(str.includes('Too many requests for the user')){
          delay = 12000 //12000 - (Date.now() - lastTick)
          process(delay)
        }
        //500
        else if(str.includes('发生意外错误') || str.includes('Service Unavailable')){
          errorCount++
          process(5000)
        }
        else{
          process(5000)
        }
        else if(str){
          process(5000)
        }
        
        if(str) lastErr = str
        el.innerHTML = ''
      }

      setTimeout(()=>{
        sessionCheck()
      } , 1000)
    }

    const notify = (content) => {
      fetch('https://tinyapi.sinaapp.com/proxy/ftqq.php?key=SCU26628T3d98d3a0c6503d95ebaf49054f7179b95afe5c34322b8&text='+content)
    }

    setTimeout(() => {
      //process(0)
      sessionCheck()
      //notify('已启动')
    } , 5*1000)
  }
});

//==================================
