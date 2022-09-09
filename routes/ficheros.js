const express = require('express');
const router = express.Router();
const fs = require('fs/promises')
const Formidable = require("formidable");

const DIR_UPLOADS = 'uploads/' // __dirname + "/uploads/"

router.use('/files', express.static('uploads'))

router.get('/fileupload', async function (req, res) {
  const files = await fs.readdir(DIR_UPLOADS);
  res.render('fileupload', { title: 'Ficheros', baseUrl: req.path, files: files });
})

router.post('/fileupload', function (req, res) {
  const form = new Formidable();
  form.maxFileSize = 2000000; // 2mb
  form.uploadDir = DIR_UPLOADS;
  form.keepExtensions = false;
  form.multiples = true;
  form.minFileSize = 1;

  form.parse(req, async function (err, _fields, files) {
    try {
      if (err) throw err;
      let ficheros = []
      if (files.filetoupload instanceof Array)
        ficheros = files.filetoupload
      else
        ficheros.push(files.filetoupload);
      for (let file of ficheros) {
        let oldpath = file.path;
        if (file.name) {
          let newpath = DIR_UPLOADS + file.name;
          try {
            await fs.unlink(newpath)
          } catch {
          }
          await fs.rename(oldpath, newpath);
        } else {
          await fs.unlink(oldpath)
        }
      }
      res.redirect('/fileupload');
    } catch (error) {
      res.status(500).json(error).end();
    }
  });
})

router.get('/deleteupload', async function (req, res) {
  const file = req.query.file;
  if (file)
    await fs.unlink(DIR_UPLOADS + file);
  res.redirect('/fileupload');
})

module.exports = router; 
