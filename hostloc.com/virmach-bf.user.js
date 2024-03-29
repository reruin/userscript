// ==UserScript==
// @name         virmach-bf2018
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  virmach bf2018
// @author       reruin@gmail.com
// @grant        GM_openInTab
// @include      https://virmach.com/*
// @include      https://billing.virmach.com/*
// @connect      *
// @run-at       document-start
// ==/UserScript==

//https://billing.virmach.com/cart.php?a=add&pid=161&billingcycle=annually recaptcha_widget

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


// keep alive
nw.c({
  rule: /billing\.virmach\.com\/clientarea\.php/,
  pre: function() {},
  post: function() {
    console.log('keep alive')
    setTimeout(()=>{
      location.reload()
    },3 * 60 * 1000)
  }
})

nw.c({
  rule: /billing\.virmach\.com\/cart\.php\?a=confproduct/,
  pre: function() {},
  post: function() {

    setTimeout(function() {
      if($('.alert.alert-danger').length && $('.alert.alert-danger').html().includes('not purchase more than one')){
        console.log('Please empty cart')
        //You can not purchase more than one BF-SPECIAL at a time. Please empty your cart and try again. If that does not work, please clear your cookies.
        location.href = '/cart.php?a=empty'
      }else{
        if($('#bs-modal').length){
          $(".os_selector.os_Other").remove();

          $(".os_selector_final option:first").prop("selected",true);
          $(".os_selector_final").val( $(".os_selector_final option:first").val() )
          $('form button').click();
        }else{
          console.log('no');
        }
      }

    }, 100);
  }
});

nw.c({
  rule: /billing\.virmach\.com\/cart\.php\?a=empty/,
  pre: function() {},
  post: function() {
    location.href = 'https://virmach.com/black-friday-cyber-monday/'
  }
});

nw.c({
  rule: /billing\.virmach\.com\/cart\.php\?a=add&pid=161/,
  pre: function() {},
  post: function() {

    setTimeout(function() {
      if(
        $('#main-body').length &&
        $("#main-body .alert-heading").html().includes('Out of Stock')
      ){
        location.href = 'https://virmach.com/black-friday-cyber-monday'
      }else{
        console.log('no');
      }
    }, 100);
  }
});

nw.c({
  rule: /virmach\.com\/black-friday-cyber-monday/,
  pre: function() {},
  post: function() {

    var script = function(){
      var rules = []
      function createRules(r) {
        let wrapArray = (a) => {
          if(a.length == 1) return [a[0],1e8]
          else return  a
        }
        return r.replace(/[\r\n]+/g,"\r").split('\r').map( i => {
          let t = i.replace(/^\s+/g,'').replace(/\s+$/g,'')
          if(t && !t.startsWith('#')){
            let rule = {}
            // KVM/1C/1000M/1T
            t.split('/').forEach( i => {
              if(!i) return

              i = i.toUpperCase()
              //virt
              if( ['KVM','OVZ'].includes(i) ){
                rule['virt'] = [i]
              }
              //cpu
              else if( i.endsWith('C') ){
                rule['cpu'] = wrapArray(i.replace('C','').split('-').map( i => parseInt(i) ))
              }
              // ram
              else if( i.endsWith('M') ){
                rule['ram'] = wrapArray(i.replace('M','').split('-').map( i => parseInt(i) ))
              }
              // disk
              else if( i.endsWith('G') ){
                rule['disk'] = wrapArray(i.replace('G','').split('-').map( i => parseInt(i) ))
              }
              // bandwidth
              else if( i.endsWith('T') ){
                rule['bandwidth'] = wrapArray(i.replace('T','').split('-').map( i => parseFloat(i) ))
              }else if( i.endsWith('IP') ){
                rule['ip'] = wrapArray(i.replace('IP','').split('-').map( i => parseInt(i) ))
              }
              // bandwidth
              else if( ['CA','TX','GA','DE','IL','WA','NJ','NY','AZ','AZ1','NL'].includes(i) ){
                if(!rule['location']) rule['location'] = []
                rule['location'].push(i)
              }
              // area
              else if( ['LA','SJ','DAL','PHX','SEA'].includes(i) ){
                if(!rule['area']) rule['area'] = []
                rule['area'].push(i)
              }
              else if( ['WIN','WINDOWS','W'].includes(i)){
                rule['os'] = 'windows'
              }
              // rate
              else if( i.endsWith('R') ){
                rule['rate'] = wrapArray(i.replace('R','').split('-').map( i => parseFloat(i) ))
              }
              // price
              else if( /([\d\.]+\-[\d\.]+|[\d\.]+)/.test(i) ){
                rule['price'] = wrapArray(i.split('-').map( i => parseFloat(i) ))
              }
              //
            })

            let ret = []
            for(let j in rule){
              if( ['location','area','os','virt'].includes(j)){
                ret.push({type:'include' , value:rule[j] , key:j})
              }
              else{
                ret.push({type:'compare' , value:rule[j] , key:j})
              }
            }
            return ret

          }else{
            return false
          }
        }).filter( i => !!i )
      }

      function checkRules(data) {
        if( rules.length == 0 ) return true

        for(let i = 0 ; i< rules.length ; i++ ){
          if( checkRule(data , rules[i]) ){
            return true
          }

        }

        return false
      }

      function checkRule(data , rule){
        for(let j = 0 ; j< rule.length ; j++ ){
          let { type , key , value } = rule[j]
          let current = data[key]
          if( type == 'include'){
            if( ! value.includes(data[key]) ){
              return false
            }
          }

          if( type == 'compare'){
            if( current > value[1] || current < value[0] ){
              return false
            }
          }
        }

        return true
      }

      function notify(msg){
        let Notification = window.webkitNotification || window.Notification
        if (Notification.permission == "granted") {
            var notification = new Notification("发现匹配", {
                body: msg,
                icon: 'https://cdn3.virmach.com/images/logo.png'
            });

            notification.onclick = function() {
              window.open('https://virmach.com/black-friday-cyber-monday')
              notification.close();
            };
        }else {
            Notification.requestPermission();
        };
      }

      var dig = (function($){
        var retry = 0;
        var current;
        var storage = window.localStorage;
        var flag = true;
        var session = $('<iframe src="https://billing.virmach.com/clientarea.php" style="display:none;" />');
        var orderUrl = 'https://billing.virmach.com/aff.php?aff=5935&a=add&pid=161&billingcycle=annually'
        function init(){
          current = $(`<a class="btn large greensea flat">开始</a>`)
          let el_btn_setting = $(`<a class="btn large greensea flat" id="j_setting">设置</a>`)
          let el = $('<div id="j_box" class="setting-box"><div class="hd">设置</div><div class="item"><span>价格策略</span><textarea type="text" id="j_rule" value="" placeholder="邮箱">'+
              `# 参数：虚拟化/cpu数量/内存/硬盘/地域/价格/溢价率\r# 例如：kvm，价格20以内，核心2~4，内存>=3000M，硬盘至少20G，流量至少1T,仅限CA\r# KVM/0-20/2-4C/3000M/20G/1T/CA\r4R/0-10/1000M/10G/1T\r0-2\r1.6R/0-5/100G/0.5T\r1.8R/0-7/KVM/1T/CA/AZ/AZ1/10G`
            +'</textarea></div><div class="item center"><button id="j_setting_save" class="btn large greensea flat">确定</button></div></div>')

          $('.entry-content').prepend(el_btn_setting);
          $('.entry-content').prepend(current);

          el_btn_setting.on('click' , () => {

          })
          current.on('click',function(){
            flag = !flag
          })
          $('body').on('click' , '#j_setting',() => {
            $('#j_box').fadeIn()
          })

          $('body').on('click' , '#j_setting_save',() => {
            rules = createRules($('#j_rule').val())
            console.log(rules)
            $('#j_box').fadeOut()
          })

          $('body').append(session);
          $('body').append(el);

          setInterval(function(){
            console.log('keep alive')
            session.attr('src', session.attr('src'));
          } , 60 * 1000);

          rules = createRules($('#j_rule').val())

          process();
        }

        function isGoodPrice(d){

          let dom = $(d)
          let raw = $('body')
          let available = dom.find('.pricetable').length > 0
          if( available ){
            let win = dom.find('.price-content li').length == 8
            let points = win ? [0,2,3,4,5,6,7] : [0,1,2,3,4,5,6]
            let price = parseFloat(dom.find('.price-font').html().replace(/[^\d\.]/g,''))
            let virt = dom.find('.price-content li:eq('+points[0]+') strong').html()
            let ram = parseInt(dom.find('.price-content li:eq('+points[1]+') strong').html())
            let cpu = parseInt(dom.find('.price-content li:eq('+points[2]+') strong').html())
            let disk = parseInt(dom.find('.price-content li:eq('+points[3]+') strong').html())
            let bandwidth = parseInt(dom.find('.price-content li:eq('+points[4]+') strong').html())
            let ip = parseInt(dom.find('.price-content li:eq('+points[6]+') strong').html())

            let location = dom.find('.price-content li:eq('+points[5]+') strong').html().replace(/\s/g,'').split(',')[1]
            let area = dom.find('.price-content li:eq('+points[5]+') strong').html().replace(/\s/g,'').split(',')[0]
            let areaMap = {'Los Angeles':'LA','San Jose':'SJ','Seattle':'SEA','Phoenix':'PHX','Dallas':'DAL','Buffalo':'BUF'}
            area = areaMap[area]
            bandwidth = Math.round(bandwidth / 10) / 100

            $('.pricing-inner').html( dom.find('.pricing-inner').html() )

            let mprice = cpu * 2.5 + Math.round(ram * 10 / 128) * 0.5 / 10 + (disk / 10) * 2 + bandwidth * 1 + (ip-1)*2.5

            if(location == 'CA') mprice *= 1
            else if(location == 'AZ'|| location == 'AZ1' || location == 'WA') mprice *= 0.9
            else if(location == 'TX') mprice *= 0.8
            else mprice *= 0.7

            if(virt == 'OpenVZ') mprice *= 0.6
            if(win) mprice *= 1.2

            mprice = Math.round(mprice*100)/100;

            let rate =  Math.round(100 * mprice / price) / 100;

            let os = win ? 'windows' : undefined
            let msg = (`$${price}: ${virt}/$${price}/${cpu}C/${ram/1024}G/${disk}GB SSD/${bandwidth}TB/${location}/${ Math.round(rate * 100)}%`)

            let res = checkRules({virt ,ip, price , ram , cpu , disk , bandwidth , location , area , os , rate})
            $('.price-font').after(`<p style="margin-top:1em;margin-bottom:0;font-size:12px;font-family:'microsoft yahei'">${rate}:${res}(${retry}) 估值：$ ${mprice} / yr （溢价 ${Math.round(100*(mprice-price)/price)}%）</p>`)

            console.log(res+':'+msg)

            if( res ){
              notify(msg)
            }
            return res
          }else{
            return false
          }
        }

        function process(){
          current.prop('disabled',false).html('运行中('+ retry++ +')');
          if(!flag){
             current.prop('disabled',false).html('暂停');
             setTimeout(process, 1200);
          }
          $.get('?t='+Date.now()).then(function(resp){
            if(
              resp.includes('Out of Stock') ||
              resp.includes('SOLD OUT')
            ){
              console.log('SOLD OUT')
              setTimeout(process, 1200);
            }else{
              if(isGoodPrice(resp)){
                location.href = orderUrl;
              }else{
                setTimeout(process, 1200);
              }
            }

          },function(){
              setTimeout(function(){
                  location.reload();
              }, 10*1000);
          });
        }

        init();

      }(jQuery));

      window.dig = dig;
    }

    nw.addScript(';(' + script + '());', 'body');
    nw.addStyle('.setting-box{font-size:12px;z-index:99999;display:none;position:fixed;top:50%;left:50%;width:70%;padding:0 12px;transform: translate(-50%,-50%);background:#fff;box-shadow:0 0 3px rgba(0,0,0,.3);}.setting-box .hd{padding:12px;font-size:15px;color:#333;border-bottom:1px solid #eee;}.setting-box .item{ margin:12px; display:flex;align-items:center;}.setting-box .item span{ flex:0 0 80px; font-size:12px;}.setting-box .item textarea{height:300px;padding:8px;flex:1 1 auto;border:1px solid #bbb;}.setting-box .item.center{justify-content:center;}')

  }
});


nw.c({
  rule: /billing\.virmach\.com\/cart\.php\?a=view/,
  pre: function() {},
  post: function() {
    setTimeout(function(){
      if($('#orderdesctable').html().includes('Cart is Empty')){
        location.href = 'https://virmach.com/black-friday-cyber-monday';
      }else{
        location.href = '/cart.php?a=checkout';
      }
    },60)

  }
});

nw.c({
  rule: /billing\.virmach\.com\/cart\.php\?a=checkout/,
  pre: function() {},
  post: function() {
    var payType = 'paypalbilling'
    fetch('https://tinyapi.sinaapp.com/proxy/ftqq.php?key=SCU26628T3d98d3a0c6503d95ebaf49054f7179b95afe5c34322b8&text=VIRMACH下单成功')

    setTimeout(function(){
      // $('#checkout').click();
      $('.selector:not([data-value="'+payType+'"])').remove()
      $('.selector[data-value="'+payType+'"]').click()
      // $("input[name='paymentmethod'][value='paypal']").remove();
      $("input[name='paymentmethod'][value='"+payType+"']").prop("checked",'true').change();
      // $("input[name='paymentmethod'][value='newalipay']").prop("checked",'true').change();
      $("#accepttos").prop("checked", true).change();
      $('input[type="submit"]').val('Please Wait...').data('modal', true).click();

      //nw.o( 'https://virmach.com/black-friday-cyber-monday');
      // automatically removed from the cart
      setTimeout(function(){
        nw.o( 'https://virmach.com/black-friday-cyber-monday');
       //location.href = 'https://virmach.com/black-friday-cyber-monday';
      },60*1000);
    },100);
  }
});

nw.c({
  rule: /billing\.virmach\.com\/cart\.php\?a=complete/,
  pre: function() {},
  post: function() {
    fetch('https://tinyapi.sinaapp.com/proxy/ftqq.php?key=SCU26628T3d98d3a0c6503d95ebaf49054f7179b95afe5c34322b8&text=VIRMACH验证码')
  }
});


//==================================
