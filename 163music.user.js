// ==UserScript==
// @name         163music
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  为网易音乐无版权音乐提供试听功能
// @author       reruin@gmail.com
// @grant        GM_xmlhttpRequest
// @include      http://music.163.com/*
// @include      https://music.163.com/*
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
    addStyle: function(css) {
      var el = document.createElement("style");
      el.innerHTML = css;
      document.getElementsByTagName('head')[0].appendChild(el);
    },
    addScript: function(script, pos) {
      var el = document.createElement("script");
      el.textContent = script;
      if (typeof pos == 'object') {
        pos.appendChild(el)
      } else if (pos == 'head') {
        document.getElementsByTagName('head')[0].appendChild(el);
      } else {
        document.getElementsByTagName('body')[0].appendChild(el);
      }
    },
    addHtml: function(dom) {
      var el = document.createElement(dom);
      el.innerHTML = dom;
      document.getElementsByTagName('body')[0].appendChild(el);
    }
  };

  var dom = {
    create: function(tag, id, cls, style, parent, data) {
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

  function $(e) {
    return document.querySelector(e);
  }

  function $$(e) {
    return document.querySelectorAll(e);
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

  function isObject(v) {
    return is(v, 'Object');
  }

  function isFunction(v) {
    return is(v, 'Function');
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

      } else if (isObject(rule)) {
        var flag = true;
        var m = null,
          ret_t = {};
        for (var key in rule) {
          m = obj[key].match(rule[key]);
          if (!m) {
            flag = false;
            break;
          } else {
            if (m.length > 1) {
              ret_t[key] = toArray(m);
            }
          }
        }
        if (flag) {
          ret.push({
            pre: stack[i].pre || noop,
            post: stack[i].post || noop,
            args: ret_t
          });
        }
      } else if (isFunction(rule)) {
        if (rule()) {
          ret.push({
            pre: stack[i].pre || noop,
            post: stack[i].post || noop,
            args: {}
          });
        }
      } else if (isArray(rule)) {
        var flag = false;
        for (var j = rule.length - 1; j >= 0; j--) {
          if (obj.url.match(rule[j])) {
            flag = true;
            break;
          }
        }
        if (flag) {
          ret.push({
            pre: stack[i].pre || noop,
            post: stack[i].post || noop,
            args: {}
          });
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
    /*    console.log(handlers);
        debugger;*/
    if (handlers.length) {
      handlers.forEach(function(handler) {
        if (handler.redirect) {
          open(handler.redirect);
        } else if (handler.pre) handler.pre(handler.args);
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

  /*function domReady(){

  }*/
  function monitor(expr, evt, callback) {
    var evts = {
      'removed': 'DOMNodeRemoved',
      'inserted': 'DOMNodeInserted',
      'modified': 'DOMSubtreeModified'
    };


    evt = evts[evt || 'modified'];

    var watch = false //d[2] === undefined ? false : true;


    var matchTag = function(target, t) {
      var k = document.createElement('div');
      k.appendChild(target.cloneNode(false));
      var ret = k.querySelector(t);
      k = null;
      return ret;
    }

    //return new promise(function(resolve, reject){
    var handler = function(event) {
      var target = event.target;
      if (matchTag(target, expr)) {
        if (callback) callback(target);
        if (!watch) document.removeEventListener(evt, handler);
      }
    };

    document.addEventListener(evt, handler);
    //});
  }

  function open(url) {
    open_direct(url);
  }

  function open_direct(url) {
    var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    link.href = url;
    link.click();
  }

  var ajax = {
    get: function(url, fn) {
      var obj = new XMLHttpRequest(); // XMLHttpRequest对象用于在后台与服务器交换数据          
      obj.open('GET', url, true);
      obj.onreadystatechange = function() {
        console.log(obj)
        if (obj.readyState == 4 && obj.status == 200 || obj.status == 304) { // readyState == 4说明请求已完成
          fn.call(this, obj.responseText); //从服务器获得数据
        }
      };
      obj.send();
    },
    post: function(url, data, fn) { // datat应为'a=a1&b=b1'这种字符串格式，在jq里如果data为对象会自动将对象转成这种字符串格式
      var obj = new XMLHttpRequest();
      obj.open("POST", url, true);
      obj.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); // 添加http头，发送信息至服务器时内容编码类型
      obj.onreadystatechange = function() {
        if (obj.readyState == 4 && (obj.status == 200 || obj.status == 304)) { // 304未修改
          fn.call(this, obj.responseText);
        }
      };
      obj.send(data);
    }
  };

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

  nw.request = ajax;

}(this));


//==================================
//==================================
// 播放页
nw.c({
  rule: [
    /music\.163\.com\/song\?id/
  ],
  pre:function(){
    function $(a){
      return document.querySelector(a)
    }

    function hasClass(obj, cls) {
      return obj.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
    }
     
    function addClass(obj, cls) {
      if (!this.hasClass(obj, cls)) obj.className += " " + cls;
    }
     
    function removeClass(obj, cls) {
      if (hasClass(obj, cls)) {
          var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
          obj.className = obj.className.replace(reg, ' ');
      }
    }

    function setAttr(el , obj){
      for(let i in obj){
        el.setAttribute(i , obj[i])
      }
    }

    let handle = window.setInterval(function(){
      let el = $('#content-operation')
      if(el){
        window.clearInterval( handle )

        if($('.u-btni-play-dis')){
          let id = el.getAttribute('data-rid')
          let type = el.getAttribute('data-type')

          let btn = $('.u-btni-play-dis')

          removeClass(btn,'u-btni-play-dis')

          setAttr(btn , {
            'data-res-action':'play',
            'data-res-id' : id,
            'data-res-type' : type,
            'title':'播放'
          })
          document.body.setAttribute('cp','0')
        }
      }
    },0)

  }
})

//==================================
// 去除不可播放时样式

nw.c({
  rule:[
    /music\.163\.com\/artist\?id/,
    /music\.163\.com\/search\//,
  ], 

  pre:function(){
    console.log('')
    var css = '.m-table .js-dis *{color:#333;}.m-table .js-dis .ply, .m-table .js-dis .ply:hover{opacity:1;cursor: pointer;}';
    nw.addStyle(css);
  }
})

//==================================
// 去除不可播放时样式

nw.c({
  rule:[
    /music\.163\.com\/album\?id/
  ], 

  pre:function(){

    function modData(el){
      let data = JSON.parse( el.value )
      data.forEach(i=>{
        if(i.privilege.cp == 0){
          i.privilege.cp = 1
          i.privilege.dl = 320000
          i.privilege.fl = 320000
          i.privilege.pl = 320000
          i.privilege.sp = 7
          i.privilege.st = 0
          i.privilege.subp = 1
          i.privilege.flag = 128
        }
      })

      el.value = JSON.stringify( data )

      nw.addScript(';window.songsMeta='+el.value+';','head');

    }


    let el = document.getElementById('song-list-pre-data')
    if(el){
      modData(el)
    }else{
      let handle = window.setInterval(function(){
        el = document.getElementById('song-list-pre-data')
        if(el){
          modData(el)
          window.clearInterval( handle )
        }
      },0)
    }
  }
})


//=============================================================
nw.c({
  rule: [
    /music\.163\.com\//
  ],
  pre:function(){
    var script = function(){

      const _XMLHttpRequest = window.XMLHttpRequest

      const isPromise = (v) => (Object.prototype.toString.call(v) === `[object Promise]`)

      // 模拟原生 XMLHttpRequest
      function fakeXHR(){

        //拦截器
        this.xhr = new _XMLHttpRequest()
        this.readyState = 0
        this.onreadystatechange = function(){}

        this.getProps = [
          'readyState','response','responseText','responseType','responseURL','responseXML','status','statusText','timeout','upload','withCredentials','channel'
        ]

        this.setProps = [
          'responseType','timeout','withCredentials'
        ]

        this._get()

      }

      fakeXHR.prototype = {
        interceptors : { response:[] , request:[] },

        open:function(method, url, async = true, user, password){

          this._get()

          this.async = async

          this.method = method

          this.url = url

          this.xhr.open(method, url, async, user, password)

          this.xhr.onreadystatechange = ()=>{
            this._handleChange()
          }

          return this
        },

        send:function(data){
          this._set()
          
          try{
            this.xhr.send(data)
          }
          catch(e){

          }
          finally{
            if (!this.async)
            {
              this.readyState = this.xhr.readyState
              this._handleComplete()
            }
          }

          return this
        },
        setRequestHeader:function(header, value){
          return this.xhr.setRequestHeader(header, value)
        },

        abort:function(){
          this.xhr.abort()
          this._get()
        },

        getResponseHeader:function(){
          return this.xhr.getResponseHeader(header)
        },

        getAllResponseHeaders:function(){
          return this.getAllResponseHeaders()
        },

        overrideMimeType:function(mimeType){
          this.overrideMimeType(mimeType)
        },


        _handleComplete:function(){
          this._get()

          let point = 0 , count = this.interceptors.response.length

          let process = ()=>{
            if(point < count){
              let handler = this.interceptors.response[point](this)
              if(isPromise(handler)){
                handler.then(resp=>{
                  point++
                  process()
                })
              }else{
                point++
                process()
              }
            }else{
              this.onreadystatechange()
            }
            
          }

          process()
        },

        _handleChange:function(){
          this.readyState = this.xhr.readyState

          if (this.readyState == 4)
          {
            this._handleComplete()
            this.xhr.onreadystatechange = function(){};
          }else{
            this.onreadystatechange()
          }
          
        },

        _get:function(){
          let xhr = this.xhr
          this.getProps.forEach(name=>{
            try {
              this[name] = xhr[name]
            }
            catch(e) {
              console.log(`ERROR ${e}`)
            }
          })
        },

        //fake -> xhr
        _set:function(){
          let xhr = this.xhr
          this.setProps.forEach(name => {
            try{
              xhr[name] = this[name]
            }
            catch(e){}
          })
        }
      }
    
      window.XMLHttpRequest = fakeXHR

      const request = (url , { method , data } = {method:'GET' , data:{}})=>{
        let opts = { method  }
        return new Promise((resolve)=>{
          fetch(url,opts)
          .then((response) => {
            return response.json()
          })
          .then((response) => {
            resolve({status:0 , data:response})
          })
          .catch((error) => {
            resolve({status:-1})
          })
        })
      }


      XMLHttpRequest.prototype.interceptors.response.push(function(xhr){
        return new Promise( (resolve) => {
          //这个接口是 parent 调用
          if(xhr.url.includes('weapi/song/enhance/player/url')){
            let body = xhr.responseText
            let data = JSON.parse(body)
            
            let flag = data.data[0].url == null

            //没有url
            if(flag){
              let songMeta = document.querySelector('#g_iframe').contentWindow.songMeta

              if(!songMeta){
                let songsMeta = document.querySelector('#g_iframe').contentWindow.songsMeta
                let songId = data.data[0].id
                if(songsMeta){
                  let hit = songsMeta.find(i=>(i.id == songId))
                  if(hit){
                    songMeta = {
                      id:songId,
                      name : hit.name , 
                      artist : hit.artists[0].name
                    }
                  }
                }else{
                  resolve()
                }
              }

              if(songMeta.id){
                request('https://tinyapi.applinzi.com/proxy/musicsearch.php?key='+songMeta.name+' '+songMeta.artist).then(resp=>{
                  let url = resp.data.url
                  data.data.forEach(i=>{
                    i.url = resp.data.url
                    i.code = 200
                    i.size = resp.data.size
                    i.br = resp.data.br
                    i.type = resp.data.type
                  })

                  xhr.responseText = JSON.stringify( data )
                  xhr.response = xhr.responseText

                  resolve()
                })
              }else{
                resolve()
              }
            }else{
              resolve()
            }
            
            
          }

          //搜索
          else if(xhr.url.includes('/weapi/cloudsearch/get/web')){
            let body = xhr.responseText
            let data = JSON.parse(body)
            if(data.code == 200){
              //当只查找曲目时
              if(data.result.songs){
                data.result.songs.forEach(i=>{
                  if(i.privilege.cp != 1){
                    i.privilege.cp = 1
                    i.privilege.dl = 320000
                    i.privilege.fl = 320000
                    i.privilege.pl = 320000
                    i.privilege.sp = 7
                    i.privilege.st = 0
                    i.privilege.subp = 1
                    i.privilege.flag = 128
                  }
                })

                xhr.responseText = JSON.stringify( data )
                xhr.response = xhr.responseText
              }
              
            }

            resolve()
          }

          //这个是 iframe 调用
          else if(xhr.url.includes('/weapi/v3/song/detail')){
            let body = xhr.responseText
            let data = JSON.parse(body)

            let flag = data.privileges.some(i=>(i.cp==0))

            
            if(flag){
              data.privileges.forEach(i=>{
                i.cp = 1
                i.dl = 320000
                i.fl = 320000
                i.pl = 320000
                i.sp = 7
                i.st = 0
                i.subp = 1
                i.flag = 128
              })

              let songId = data.privileges[0].id //location.href.match(/(?<=id=)(\d+)/)[0]
              window.songMeta = {
                id:songId,
                name : data.songs[0].name,
                artist : data.songs[0].ar[0].name,
                flag:true
              }

              xhr.response = xhr.responseText = JSON.stringify(data)
             
            }
            
            resolve()

          }else{
            resolve()
          }


        })

        
      })

      console.log('muisc fix is running')
    };

    nw.addScript(';('+script+'());','head');
     
  }
})


nw.init()