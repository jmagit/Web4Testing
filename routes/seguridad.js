const express = require('express');
const router = express.Router();
var cookie = require('cookie');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')

const DIR_API_AUTH = '/api/' // DIR_API_REST
const APP_SECRET = 'Es segura al 99%'
const AUTHENTICATION_SCHEME = 'Bearer '

const PROP_USERNAME = 'idUsuario'
const PROP_PASSWORD = 'password'
const PROP_NAME = 'nombre'
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/
const USR_FILENAME = 'data/usuarios.json'

const VALIDATE_XSRF_TOKEN = false;

// parse header/cookies
router.use(cookieParser())
function generateXsrfTokenCookie(res) {
    res.cookie('XSRF-TOKEN', '123456790ABCDEF', { httpOnly: false })
}

// Cross-origin resource sharing (CORS)
router.use(function (req, res, next) {
    var origen = req.header("Origin")
    if (!origen) origen = '*'
    res.header('Access-Control-Allow-Origin', origen)
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With, X-XSRF-TOKEN')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.header('Access-Control-Allow-Credentials', 'true')
    generateXsrfTokenCookie(res)
    next()
})
// Autenticación
router.use(function (req, res, next) {
    res.locals.isAutenticated = false;
    let token = ''
    if (!req.headers['authorization']) {
        if (!req.cookies['Authorization']) {
            next();
            return;
        }
        token = req.cookies['Authorization'];
    } else
        token = req.headers['authorization'].substr(AUTHENTICATION_SCHEME.length)
    try {
        var decoded = jwt.verify(token, APP_SECRET);
        res.locals.isAutenticated = true;
        res.locals.usr = decoded.usr;
        res.locals.name = decoded.name;
        res.locals.roles = decoded.roles;
        next();
    } catch (err) {
        res.status(401).end();
    }
})

// Cookie-to-Header Token
router.use(function (req, res, next) {
    if (VALIDATE_XSRF_TOKEN) {
        if ('POST|PUT|DELETE|PATCH'.indexOf(req.method.toUpperCase()) >= 0 && req.cookies['XSRF-TOKEN'] !== req.headers['x-xsrf-token']) {
            res.status(401).end('No autorizado.')
            return
        }
        generateXsrfTokenCookie(res)
    }
    next()
})


// Control de acceso
async function encriptaPassword(password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    console.log(hash)
    return hash
}
  
router.options(DIR_API_AUTH + 'login', function (req, res) {
    res.status(200).end()
})
router.post(DIR_API_AUTH + 'login', function (req, res) {
    var rslt = {
        success: false
    }
    if (req.body && req.body.name && req.body.password) {
        let usr = req.body.name
        let pwd = req.body.password
        if (!PASSWORD_PATTERN.test(pwd)) {
            res.status(200).json(rslt).end()      
            return
          } 
        fs.readFile(USR_FILENAME, 'utf8', async function (err, data) {
            var lst = JSON.parse(data)
            var ele = lst.find(ele => ele[PROP_USERNAME] == usr)
            if (ele && await bcrypt.compare(pwd, ele[PROP_PASSWORD])) {
                let token = jwt.sign({
                    usr: ele[PROP_USERNAME],
                    name: ele.nombre,
                    roles: ele.roles
                }, APP_SECRET, { expiresIn: '1h' })
                rslt = {
                    success: true,
                    token: AUTHENTICATION_SCHEME + token,
                    name: ele[PROP_NAME],
                    roles: ele.roles
                }
                if(req.query.cookie && req.query.cookie.toLowerCase() === "true")
                    res.cookie('Authorization', token, { maxAge: 3600000 })
            }
            res.status(200).json(rslt).end()
        })
    } else {
        res.status(200).json(rslt).end()
    }
})
router.get(DIR_API_AUTH + 'logout', function (req, res) {
    res.clearCookie('Authorization');
    res.status(200).end()
})

router.get(DIR_API_AUTH + 'register', function (req, res) {
    if (!res.locals.isAutenticated) {
        res.status(401).end()
        return
    }
    let usr = res.locals.usr;
    fs.readFile(USR_FILENAME, 'utf8', function (err, data) {
        var lst = JSON.parse(data)
        var ele = lst.find(ele => ele[PROP_USERNAME] == usr)
        if (ele) {
            delete ele[PROP_PASSWORD]
            res.status(200).json(ele).end()
        } else {
            res.status(401).end()
        }
    })
})
router.post(DIR_API_AUTH + 'register', function (req, res) {
    fs.readFile(USR_FILENAME, 'utf8', async function (err, data) {
        var lst = JSON.parse(data)
        var ele = req.body
        if (ele[PROP_USERNAME] == undefined) {
            res.status(400).end('Falta el nombre de usuario.')
        } else if (lst.find(item => item[PROP_USERNAME] == ele[PROP_USERNAME])) {
            res.status(400).end('El usuario ya existe')
        } else if (PASSWORD_PATTERN.test(ele[PROP_PASSWORD])) {
            ele[PROP_PASSWORD] = await encriptaPassword(ele[PROP_PASSWORD])
            lst.push(ele)
            console.log(lst)
            fs.writeFile(USR_FILENAME, JSON.stringify(lst), 'utf8', function (err) {
                if (err)
                    res.status(500).end('Error de escritura')
                else
                    res.status(201).end()
            })
        } else {
            res.status(400).end('Formato incorrecto de la password.')
        }
    })
})
router.put(DIR_API_AUTH + 'register', function (req, res) {
    var ele = req.body
    if (res.locals.usr !== ele[PROP_USERNAME]) {
        res.status(403).end()
        return false
    }
    fs.readFile(USR_FILENAME, 'utf8', function (err, data) {
        var lst = JSON.parse(data)
        var ind = lst.findIndex(row => row[PROP_USERNAME] == ele[PROP_USERNAME])
        if (ind == -1) {
            res.status(404).end()
        } else {
            ele[PROP_PASSWORD] = lst[ind][PROP_PASSWORD]
            lst[ind] = ele
            console.log(lst)
            fs.writeFile(USR_FILENAME, JSON.stringify(lst), 'utf8', function (err) {
                if (err)
                    res.status(500).end('Error de escritura')
                else
                    res.status(200).end()
            })
        }
    })
})

router.put(DIR_API_AUTH + 'register/password', function (req, res) {
    var ele = req.body
    if(!res.locals.isAutenticated) {
      res.status(401).end()
      return false
    }
    fs.readFile(USR_FILENAME, 'utf8', async function (err, data) {
      var lst = JSON.parse(data)
      var ind = lst.findIndex(row => row[PROP_USERNAME] == res.locals.usr)
      if (ind == -1) {
        res.status(404).end()
      } else if(PASSWORD_PATTERN.test(ele.newPassword) && await bcrypt.compare(ele.oldPassword, lst[ind][PROP_PASSWORD])) {
        lst[ind][PROP_PASSWORD] = await encriptaPassword(ele.newPassword)
        console.log(lst)
        fs.writeFile(USR_FILENAME, JSON.stringify(lst), 'utf8', function (err) {
          if (err)
            res.status(500).end('Error de escritura')
          else
            res.status(200).end()
        })
      } else {
        res.status(400).end()
      }
    })
})

router.get(DIR_API_AUTH + 'auth', function (req, res) {
    res.status(200).json({ isAutenticated: res.locals.isAutenticated, usr: res.locals.usr, name: res.locals.name, roles: res.locals.roles })
})

module.exports = router; 
