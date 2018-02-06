// ==UserScript==
// @name         PetChainBbaidu
// @namespace    https://github.com/reruin
// @version      0.1
// @license      MIT
// @description  PetChainBbaidu
// @author       reruin@gmail.com
// @grant        none
// @include      https://pet-chain.baidu.com/
// @include      https://pet-chain.baidu.com/*
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
    var pass = {}

    function logger(t){
      console.log("\n %c "+t+" \n","color: #fadfa3; background: #030307; padding:5px 0;");

    }
    function request(url , data){

      let fetchData = { 
          method: 'POST', 
          credentials: "include",
          headers: new Headers({
            'Content-Type': 'application/json'
          })
      }
      if(data){
        fetchData.body = JSON.stringify(data)
      }
      return new Promise(function(resolve, reject) {
        fetch(url, fetchData).then(function(resp) {
          resolve(resp.json())
        },function(e) {
          reject(e)
        }).catch(function(e) {
          reject(e)
        })
      })
    }

    function serial(petId , callback){
      // return request('/data/market/shouldJump2JianDan',{
      //   "requestId":1517811674696,
      //   "appId":1,
      //   "tpl":""
      // }).then(function(){
      function tick(){
        process(petId).then(function(resp){
          //网络原因
          if(resp == -1){
            tick()
          }
          else if(resp == 1){
            callback(1)
          }
          //被抢
          else if(resp == 10002){
            callback(-1)
          }
          else{
            tick()
          }
        })
      }
        
      tick()
    }

    function parallel(petId){
      //并发
      let count = 50

      return new Promise(function(resolve, reject) {
        var c = count
        for(var i = c ; i -- ;){
          process(petId).then(function(resp){
            
            if(resp == -1){
              c--
            }
            if(c <= 0 ){
              resolve(-1)
              return
            }

            else if(resp == 10002){
              c = 0
              resolve(-1)
            }else if( resp == 1){
              c = 0
              resolve(1)
            }
            
            console.log((count-c)+'/'+count)
          })
        }
      })
    }


    function process(petId){
      return new Promise(function(resolve, reject) {
        request('https://pet-chain.baidu.com/data/txn/create',{
          "petId":petId,
          "requestId":Date.now(),
          "appId":1,
          "tpl":""
        }).then(function(resp){
          if (resp.errorNo == '00') {
            console.log("Success")
            resolve(1)
            alert('Success')
          } else if(resp.errorNo == '10002'){
            pass[petId] = 1
            resolve(10002)
          } else {
            resolve(-1)

          }
        },function(error){
          resolve(-1)
        })
      })
    }

    function query(){
      logger('QUERY: '+ new Date().toLocaleString())
      let pets = []
      request('/data/market/queryPetsOnSale',{
        appId:1,
        lastAmount:1.00,
        lastRareDegree:null,
        pageNo:1,
        pageSize:10,
        petIds:[],
        querySortType:"AMOUNT_ASC",
        requestId:Date.now(),
        tpl:""
      }).then(function(resp){

        if(resp.errorNo == '00' && resp.data.hasData){
          pets = resp.data.petsOnSale.filter(function(i){
            if(
              parseInt(i.amount)<=5 &&
              i.rareDegree >= 1 &&
              !pass[i.petId]
            ){
              return i
            }
          })

          pets.sort(function(a,b){
            return a.rareDegree < b.rareDegree
          })
          if(pets.length) {
            //location.href = ('https://pet-chain.baidu.com/chain/detail?from=market&petId='+pets[0].petId)
            create(pets[0].petId)
          }
          else{
            setTimeout(function(){
              query()
            } , 2000)
          }
        }else{
          setTimeout(function(){
            query()
          } , 2000)
        }
      } , function(){
        logger('Wait 10 seconds')
        setTimeout(function(){
          query()
        } , 10000)
      })
    }

    function create(petId){
      serial(petId, function(resp){
        logger('Create : '+resp)
        if(resp == 1){
          logger('Success')
        }else{
          setTimeout(function(){
            query()
          } , 2000)
        }
      })
    }

    var url = location.href , pathname = location.pathname

    if(pathname == '/chain/detail'){
      //let petId = location.search.split('petId=')[1]
      //create(petId)
    }
    else if(pathname == '/'){
      query()
    }
    
  }


  addScript(';(' + script + '());', 'body');
  
}());