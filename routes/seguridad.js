const express = require('express');
const router = express.Router();
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs/promises')

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

// Cross-origin resource sharing (CORS)
router.use(function (req, res, next) {
    if (req.method === 'OPTIONS') {
        let origen = req.header("Origin")
        if (!origen) origen = '*'
        res.header('Access-Control-Allow-Origin', origen)
        res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With, X-XSRF-TOKEN')
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        res.header('Access-Control-Allow-Credentials', 'true')
    }
    next()
})

// Cookie-to-Header Token
if (VALIDATE_XSRF_TOKEN) {
    const { createHash } = require('crypto')
    function generateXsrfToken(req) {
        const hash = createHash('sha256')
        let client = `${req.client.remoteFamily}-${req.client.remoteAddress}`
        hash.update(client)
        return hash.digest('base64')
    }
    function generateXsrfCookie(req, res) {
        res.cookie('XSRF-TOKEN', generateXsrfToken(req), { httpOnly: false, expires: 0 })
    }
    function isInvalidXsrfToken(req) {
        let token = req.headers['x-xsrf-token'] || req.body['xsrftoken']
        let cookie = req.cookies['XSRF-TOKEN']
        let secret = generateXsrfToken(req)
        return !token || cookie !== token || token !== secret
    }
    router.use(function (req, res, next) {
        if(!req.cookies['XSRF-TOKEN'])
            generateXsrfCookie(req, res)
        if ('POST|PUT|DELETE|PATCH'.indexOf(req.method.toUpperCase()) >= 0 && isInvalidXsrfToken(req)) {
            if(req.cookies['XSRF-TOKEN'] !== generateXsrfToken(req))
                generateXsrfCookie(req, res)
            res.status(401).json({ message: 'Invalid XSRF-TOKEN' })
            return
        }
        res.XsrfToken = generateXsrfToken(req)
        next()
    })
}

// Autenticación
router.use(function (req, res, next) {
    res.locals.isAuthenticated = false;
    let token = ''
    if (!req.headers['authorization']) {
        if (!req.cookies['Authorization']) {
            next();
            return;
        }
        token = req.cookies['Authorization'];
    } else
        token = req.headers['authorization'].substring(AUTHENTICATION_SCHEME.length)
    try {
        let decoded = jwt.verify(token, APP_SECRET);
        res.locals.isAuthenticated = true;
        res.locals.usr = decoded.usr;
        res.locals.name = decoded.name;
        res.locals.roles = decoded.roles;
        res.locals.isInRole = role => res.locals.roles.includes(role)
        next();
    } catch (err) {
        res.status(401).json({ message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
    }
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

router.post(DIR_API_AUTH + 'login', async function (req, res) {
    let payload = {
        success: false
    }
    if (!req.body || !req.body.name || !req.body.password) {
        setTimeout(() => res.status(400).json(payload).end(), 1000)
        return
    }
    let usr = req.body.name
    let pwd = req.body.password
    if (!PASSWORD_PATTERN.test(pwd)) {
        setTimeout(() => res.status(200).json(payload).end(), 1000)
        return
    }
    let data = await fs.readFile(USR_FILENAME, 'utf8')
    let lst = JSON.parse(data)
    let ele = lst.find(ele => ele[PROP_USERNAME] == usr)
    if (ele && await bcrypt.compare(pwd, ele[PROP_PASSWORD])) {
        let token = jwt.sign({
            usr: ele[PROP_USERNAME],
            name: ele.nombre,
            roles: ele.roles
        }, APP_SECRET, { expiresIn: '1h' })
        payload = {
            success: true,
            token: AUTHENTICATION_SCHEME + token,
            name: ele[PROP_NAME],
            roles: ele.roles
        }
        if (req.query.cookie && req.query.cookie.toLowerCase() === "true")
            res.cookie('Authorization', token, { maxAge: 3600000 })
    }
    res.status(200).json(payload).end()
})
router.get(DIR_API_AUTH + 'logout', function (req, res) {
    res.clearCookie('Authorization');
    res.status(200).end()
})

router.get(DIR_API_AUTH + 'register', async function (req, res) {
    if (!res.locals.isAuthenticated) {
        res.status(401).end()
        return
    }
    let usr = res.locals.usr;
    let data = await fs.readFile(USR_FILENAME, 'utf8')
    let lst = JSON.parse(data)
    let ele = lst.find(ele => ele[PROP_USERNAME] == usr)
    if (ele) {
        delete ele[PROP_PASSWORD]
        res.status(200).json(ele).end()
    } else {
        res.status(401).end()
    }
})
router.post(DIR_API_AUTH + 'register', async function (req, res) {
    let data = await fs.readFile(USR_FILENAME, 'utf8')
    let lst = JSON.parse(data)
    let ele = req.body
    if (ele[PROP_USERNAME] == undefined) {
        res.status(400).json({ message: 'Falta el nombre de usuario.'})
    } else if (lst.find(item => item[PROP_USERNAME] == ele[PROP_USERNAME])) {
        res.status(400).json({ message: 'El usuario ya existe'})
    } else if (PASSWORD_PATTERN.test(ele[PROP_PASSWORD])) {
        ele[PROP_PASSWORD] = await encriptaPassword(ele[PROP_PASSWORD])
        lst.push(ele)
        console.log(lst)
        fs.writeFile(USR_FILENAME, JSON.stringify(lst))
            .then(() => { res.sendStatus(200) })
            .catch(err => { res.status(500).end('Error de escritura') })
    } else {
        res.status(400).json({ message: 'Formato incorrecto de la password.'})
    }
})
router.put(DIR_API_AUTH + 'register', async function (req, res) {
    let ele = req.body
    if (res.locals.usr !== ele[PROP_USERNAME]) {
        res.status(403).end()
        return false
    }
    let data = await fs.readFile(USR_FILENAME, 'utf8')
    let lst = JSON.parse(data)
    let ind = lst.findIndex(row => row[PROP_USERNAME] == ele[PROP_USERNAME])
    if (ind == -1) {
        res.status(404).end()
    } else {
        if(ele.nombre)
            lst[ind].nombre = ele.nombre;
        fs.writeFile(USR_FILENAME, JSON.stringify(lst))
            .then(() => { res.sendStatus(200) })
            .catch(err => { res.status(500).end('Error de escritura') })
    }
})

router.put(DIR_API_AUTH + 'register/password', async function (req, res) {
    let ele = req.body
    if (!res.locals.isAuthenticated) {
        res.status(401).end()
        return false
    }
    let data = await fs.readFile(USR_FILENAME, 'utf8')
    let lst = JSON.parse(data)
    let ind = lst.findIndex(row => row[PROP_USERNAME] == res.locals.usr)
    if (ind == -1) {
        res.status(404).end()
    } else if (PASSWORD_PATTERN.test(ele.newPassword) && await bcrypt.compare(ele.oldPassword, lst[ind][PROP_PASSWORD])) {
        lst[ind][PROP_PASSWORD] = await encriptaPassword(ele.newPassword)
        fs.writeFile(USR_FILENAME, JSON.stringify(lst))
            .then(() => { res.sendStatus(200) })
            .catch(err => { res.status(500).end('Error de escritura') })
    } else {
        res.status(400).end()
    }
})

router.get(DIR_API_AUTH + 'auth', function (req, res) {
    res.status(200).json({ isAuthenticated: res.locals.isAuthenticated, usr: res.locals.usr, name: res.locals.name, roles: res.locals.roles })
})

module.exports = router; 
