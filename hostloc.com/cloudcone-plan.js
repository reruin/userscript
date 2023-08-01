function gg(start,end) {

  const M_MONTH = 3;

  let index = start,
  servers = {};
  const process = () => {
    if (index > end) {
      //output(servers)
      return
    }
    $.ajax({
      url: `/compute/${index}/create`,
      method: 'get',
      success: (resp) => {
        if (resp.indexOf('out of stock') == -1) {
          let fn = resp.match(/function calculate()[\w\W]+?(?=function)/)[0].replace(/[\r\n\s]*$/g, '')
          .replace(/\}$/, `;return parseFloat(m_total_final) /num_months\r\n}`)
          let calc = new Function('$', fn + ';return calculate();')
          let data = calc((...rest) => $(resp).find(...rest))
          //servers[index] = data
          //console.log(data)
          if(data<3) console.log(index,data)
        }
        index++
        setTimeout(() => {
          process()
        }, 200)
      },
      error: () => {
        setTimeout(() => {
          process()
        }, 200)
      }
    })

  }

  const output = (d) => {

    let f = [],
    m = {}
    for (let i in d) {
      let s = d[i]
      let key = [s.v_cpu, s.v_ram, s.v_disk, s.v_ip, s.m_total, s.duration, m_total_reg].join('.')
      if (!m[key]) {
        m[key] = true
        f.push({ id: i, ...s })
      }
    }

    console.log(f.filter(i => (i.m_total < M_MONTH)).map(i => (JSON.stringify(i))).join('\r\n'))
  }
  process()

};