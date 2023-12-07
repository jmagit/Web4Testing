const express = require('express');
const router = express.Router();
const fs = require('fs/promises')
const multer = require('multer')
const { generateErrorByError } = require('./utils')

const DIR_UPLOADS = 'uploads/' // __dirname + "/uploads/"

const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 /* 2mb */ },
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DIR_UPLOADS),
    filename: (_req, file, cb) => cb(null, file.originalname),
    limits: { fileSize: 100000 /* 2 * 1024 * 1024 /* 2mb */ },
  })
})
router.use('/files', express.static('uploads'))

router.get('/fileupload', async function (req, res) {
  const files = await fs.readdir(DIR_UPLOADS);
  res.render('fileupload', { title: 'Ficheros', baseUrl: req.path, files: files });
})

router.post('/fileupload', upload.array('filestoupload'), function (req, res) {
  try {
    let rutas = req.files.map(f => ({ url: `${req.protocol}://${req.headers.host}/files/${f.originalname}` }))
    if (req.headers?.accept?.includes('application/json'))
      res.status(200).json(rutas).end();
    else {
      res.redirect('/fileupload');
    }
  } catch (error) {
    res.status(500).json(generateErrorByError(req, 500, error)).end();
  }
})

router.get('/deleteupload', async function (req, res) {
  const file = req.query.file;
  if (file)
    await fs.unlink(DIR_UPLOADS + file);
  res.redirect('/fileupload');
})

module.exports = router; 
