function collect(){
	var _ = function(a){
		return document.querySelectorAll(a);
	}

	var total = 0;
	var exrate = {
		'EUR':7.7745,
		'USD':6.5255,
		'GBP':8.5053,
		'SGD':4.8427,
		'RUB':0.1140,
		'CNY':1
	}

	var invoices = [
		{amount:59 , c:'CNY' , desc:'tcloud'},
		{amount:42 , c:'CNY' , desc:'starrydns'},
		{amount:30 , c:'CNY',desc:'vps.pm'},
		{amount:26 , c:'CNY',desc:'vps77-crea'},
		
		{amount:6.99 , c:'EUR',desc:'online'},
		{amount:8.99 , c:'EUR',desc:'ks'},
		{amount:3.75 , c:'EUR',desc:'dedi vie cn2'},
		{amount:3.9 , c:'EUR',desc:'gcore khv'},
		
		{amount:0.9 , c:'GBP',desc:'piohost'},
		{amount:10 , c:'USD',desc:'aliyun hk'},
		{amount:4.5 , c:'USD',desc:'aliyun sgp'},
		{amount:7.99 , c:'USD',desc:'rfc hk'},
		{amount:2.5 , c:'USD',desc:'vultr jp'},
		{amount:1 , c:'USD',desc:'ru-vstoike'},
		{amount:5 , c:'SGD',desc:'beyotta'},
		{amount:1.7 , c:'EUR',desc:'sparta'},
		{amount:1 , c:'USD',desc:'dedi-SK'},
		{amount:0.375 , c:'USD',desc:'eth-qn'},
		{amount:1 , c:'USD',desc:'eth-cc'},
		{amount:3 , c:'USD',desc:'hostdare-usla-qn'},
		{amount:1 , c:'USD',desc:'providerservice-qn'},
		{amount:5.35 , c:'USD',desc:'quadcone(MC)'},
		{amount:0.6 , c:'USD',desc:'virmach'},
		{amount:0.1 , c:'USD',desc:'virmach'},
	];

	var amouts = _('.transactionAmount');

	amouts.forEach(function(el){
		var s = el.querySelector('.vx_h3').innerHTML;
		var v_t = el.querySelector('.vx_h4').innerHTML;
		var c = el.querySelector('.currencyCode') ? el.querySelector('.currencyCode').innerHTML : 'USD';

		var v = parseFloat( (v_t.match(/\d+\.\d+/) || [0])[0] );
		invoices.push({amount:v , c : c , s:s});
	});

	invoices.forEach(function(p){
		if(p.s == '+'){
			total -= exrate[p.c] * p.amount ;
		}else{
			total += exrate[p.c] * p.amount ;
		}

		if(isNaN(p.amount) || !exrate[p.c]) console.log(p)
	});

	console.log('Total : ' , total);
}

collect();