const express = require('express');
const fs = require('fs/promises')
const router = express.Router();

const _DATALOG = false
const DIR_API_REST = '/'
const DIR_DATA = 'data/' // __dirname + '/data/'
const USR_FILENAME = DIR_DATA + 'usuarios.json'
const lstServicio = [{
  url: DIR_API_REST + 'personas',
  pk: 'id',
  fich: DIR_DATA + 'personas.json',
  readonly: false
},
{
  url: DIR_API_REST + 'peliculas',
  pk: 'id',
  fich: DIR_DATA + 'peliculas.json',
  readonly: false
},
{
  url: DIR_API_REST + 'tarjetas',
  pk: 'id',
  fich: DIR_DATA + 'tarjetas.json',
  readonly: false
},
{
  url: DIR_API_REST + 'blog',
  pk: 'id',
  fich: DIR_DATA + 'blog.json',
  readonly: false
},
{
  url: DIR_API_REST + 'libros',
  pk: 'idLibro',
  fich: DIR_DATA + 'libros.json',
  readonly: false
},
{
  url: DIR_API_REST + 'biblioteca',
  pk: 'id',
  fich: DIR_DATA + 'biblioteca.json',
  readonly: true
},
{
  url: DIR_API_REST + 'contactos',
  pk: 'id',
  fich: DIR_DATA + 'contactos.json',
  readonly: true
},
{
  url: DIR_API_REST + 'vehiculos',
  pk: 'id',
  fich: DIR_DATA + 'vehiculos.json',
  readonly: false
},
{
  url: DIR_API_REST + 'marcas',
  pk: 'marca',
  fich: DIR_DATA + 'marcas-modelos.json',
  readonly: false
},
]

router.get('/', function (req, res, next) {
  res.render('api', { 
    title: 'API REST', 
    baseUrl: `${req.protocol}://${req.headers.host}`, 
    base: `${req.protocol}://${req.headers.host}${req.baseUrl}`, 
    servicios: lstServicio.sort((a, b) => a.url.localeCompare(b.url)) 
  });
});

lstServicio.forEach(servicio => {
  router.get(servicio.url, async function (req, res) {
    try {
      let data = await fs.readFile(servicio.fich, 'utf8');
      let lst = JSON.parse(data)
      if (Object.keys(req.query).length > 0) {
        if ('_search' in req.query) {
          lst = lst.filter(item => JSON.stringify(Object.values(item)).includes(req.query._search))
        } else {
          const q = Object.keys(req.query).filter(item => !item.startsWith('_'));
          if (q.length > 0) {
            for (let cmp in q) {
              if (req.query[q[cmp]] === 'true') req.query[q[cmp]] = true;
              if (req.query[q[cmp]] === 'false') req.query[q[cmp]] = false;
            }
            lst = lst.filter(function (item) {
              for (let cmp in q) {
                if (item[q[cmp]] != req.query[q[cmp]]) return false;
              }
              return true;
            })
          }
        }
      }
      let orderBy = req.query._sort ? req.query._sort.split(',') : [servicio.pk];
      orderBy = orderBy.map(cmp => {
          let dir = 1;
          if (cmp.startsWith("-")) {
            cmp = cmp.substring(1);
            dir = -1;
          }
          return { cmp, dir }
        })
      const compara = function(a, b, index) {
        let rslt = orderBy[index].dir * (a[orderBy[index].cmp] == b[orderBy[index].cmp] ? 0 : (a[orderBy[index].cmp] < b[orderBy[index].cmp] ? -1 : 1))
        if(rslt !== 0 || index + 1 === orderBy.length) return rslt;
        return compara(a, b, index + 1);
      }
      lst = lst.sort((a, b) => compara(a, b, 0));
      if (req.query._page != undefined || req.query._rows != undefined) {
        const rows = req.query._rows && !isNaN(+req.query._rows) ? Math.abs(+req.query._rows) : 20;
        if (req.query._page && req.query._page.toUpperCase() == "COUNT") {
          res.json({ pages: Math.ceil(lst.length / rows), rows: lst.length }).end()
          return;
        }
        const page = req.query._page && !isNaN(+req.query._page) ? Math.abs(+req.query._page) : 0;
        lst = {
          content: lst.slice(page * rows, page * rows + rows),
          totalElements: lst.length,
          totalPages: Math.ceil(lst.length / rows),
          number: lst.length === 0 ? 0 : page + 1,
          size: rows,
        }
        lst.empty = lst.content.length === 0;
        lst.first = !lst.empty && page === 0;
        lst.last = !lst.empty && page === (lst.totalPages - 1);
        lst.numberOfElements = lst.content.length
      }
      if ('_projection' in req.query) {
        const cmps = req.query._projection.split(',');
        const mapeo = item => { let e = {}; cmps.forEach(c => e[c] = item[c]); return e; }
        if(lst.content) {
          lst.content = lst.content.map(mapeo)
        } else {
          lst = lst.map(mapeo)
        }
      }
      res.json(lst)
    } catch (error) {
      res.status(500).json(error)
    }
  })
  router.get(servicio.url + '/:id', async function (req, res) {
    try {
      let data = await fs.readFile(servicio.fich, 'utf8');
      let lst = JSON.parse(data)
      let ele = lst.find(ele => ele[servicio.pk] == req.params.id)
      if (ele) {
        if ('_projection' in req.query) {
          const cmps = req.query._projection.split(',');
          let projection = {};
          cmps.forEach(c => projection[c] = ele[c]);
          ele = projection;
        }
        if (_DATALOG) console.log(ele)
        res.status(200).json(ele).end()
      } else {
        res.status(404).end()
      }
    } catch (err) {
      res.status(500).end();
      console.log(err.stack);
    }
  })
  router.post(servicio.url, async function (req, res) {
    if (servicio.readonly && !res.locals.isAuthenticated) {
      res.status(401).json({ message : 'No autorizado.'})
      return
    }
    if(!req.is('json') || !req.body) {
      res.sendStatus(406)
      return
    }
    let data = await fs.readFile(servicio.fich, 'utf8');
    try {
      let lst = JSON.parse(data)
      let ele = req.body
      if (ele[servicio.pk] == undefined) {
        res.status(400).json({ message : 'Falta clave primaria.'})
      } else if (lst.find(item => item[servicio.pk] == ele[servicio.pk]) == undefined) {
        if (ele[servicio.pk] == 0) {
          if (lst.length == 0)
            ele[servicio.pk] = 1;
          else {
            let newId = +lst.sort((a, b) => (a[servicio.pk] == b[servicio.pk] ? 0 : (a[servicio.pk] < b[servicio.pk] ? -1 : 1)))[lst.length - 1][servicio.pk];
            ele[servicio.pk] = newId + 1;
          }
        }
        lst.push(ele)
        if (_DATALOG) console.log(lst)
        await fs.writeFile(servicio.fich, JSON.stringify(lst), 'utf8');
        res.status(201).header('Location', `${req.protocol}://${req.hostname}:${req.connection.localPort}${req.originalUrl}/${ele[servicio.pk]}`).end()
      } else {
        res.status(400).json({ message : 'Clave duplicada.'})
      }
    } catch (error) {
      res.status(500).json(error).end()
    }
  })
  router.put(servicio.url, async function (req, res) {
    if (servicio.readonly && !res.locals.isAuthenticated) {
      res.status(401).json({ message : 'No autorizado.'})
      return
    }
    if(!req.is('json') || !req.body) {
      res.sendStatus(406)
      return
    }
    let data = await fs.readFile(servicio.fich, 'utf8');
    try {
      let lst = JSON.parse(data)
      let ele = req.body
      let ind = lst.findIndex(row => row[servicio.pk] == ele[servicio.pk])
      if (ind == -1) {
        res.status(404).end()
      } else {
        lst[ind] = ele
        if (_DATALOG) console.log(lst)
        await fs.writeFile(servicio.fich, JSON.stringify(lst), 'utf8');
        res.status(200).json(lst[ind]).end()
      }
    } catch (error) {
      res.status(500).json(error).end()
    }
  })
  router.put(servicio.url + '/:id', async function (req, res) {
    if (servicio.readonly && !res.locals.isAuthenticated) {
      res.status(401).json({ message : 'No autorizado.'})
      return
    }
    
    if(!req.is('json') || !req.body) {
      res.sendStatus(406)
      return
    }
    if(req.body[servicio.pk] != req.params.id) {
      res.status(400).json({ message : "Invalid identifier"})
      return
    }
    let data = await fs.readFile(servicio.fich, 'utf8');
    try {
      let lst = JSON.parse(data)
      let ele = req.body
      let ind = lst.findIndex(row => row[servicio.pk] == req.params.id)
      if (ind == -1) {
        res.status(404).end()
      } else {
        lst[ind] = ele
        if (_DATALOG) console.log(lst)
        await fs.writeFile(servicio.fich, JSON.stringify(lst), 'utf8');
        res.status(200).json(lst[ind]).end()
      }
    } catch (error) {
      res.status(500).json(error).end()
    }
  })
  router.patch(servicio.url + '/:id', async function (req, res) {
    if (servicio.readonly && !res.locals.isAuthenticated) {
      res.status(401).json({ message : 'No autorizado.'})
      return
    }
    if(!req.is('json') || !req.body) {
      res.sendStatus(406)
      return
    }
    if(req.body[servicio.pk] && req.body[servicio.pk] != req.params.id) {
      res.status(400).json({ message : "Invalid identifier"})
      return
    }
    let data = await fs.readFile(servicio.fich, 'utf8');
    try {
      let lst = JSON.parse(data)
      let ele = req.body
      let ind = lst.findIndex(row => row[servicio.pk] == req.params.id)
      if (ind == -1) {
        res.status(404).end()
      } else {
        lst[ind] = Object.assign({}, lst[ind], ele)
        if (_DATALOG) console.log(lst)
        await fs.writeFile(servicio.fich, JSON.stringify(lst), 'utf8');
        res.status(200).json(lst[ind]).end()
      }
    } catch (error) {
      res.status(500).json(error).end()
    }
  })
  router.delete(servicio.url + '/:id', async function (req, res) {
    if (servicio.readonly && !res.locals.isAuthenticated) {
      res.status(401).json({ message : 'No autorizado.'})
      return
    }
    let data = await fs.readFile(servicio.fich, 'utf8');
    try {
      let lst = JSON.parse(data)
      let ind = lst.findIndex(row => row[servicio.pk] == req.params.id)
      if (ind == -1) {
        res.status(404).end()
      } else {
        lst.splice(ind, 1)
        if (_DATALOG) console.log(lst)
        await fs.writeFile(servicio.fich, JSON.stringify(lst), 'utf8');
        res.sendStatus(204)
      }
    } catch (error) {
      res.status(500).json(error).end()
    }
  })
  router.options(servicio.url + '/:id', function (req, res) {
    res.status(200).end()
  })
})

module.exports = { router, lstServicio }; 
