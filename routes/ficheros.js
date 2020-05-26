const express = require('express');
const router = express.Router();
const fs = require('fs')
const formidable = require("formidable");

const DIR_UPLOADS = 'uploads/' // __dirname + "/uploads/"

router.use('/files', express.static('uploads'))
router.get('/fileupload', async function (req, res) {
  const files = await fs.promises.readdir(DIR_UPLOADS);
  res.render('fileupload', { title: 'Ficheros', baseUrl: req.path, files: files });
})
router.post('/fileupload', function (req, res) {
  let form = new formidable.IncomingForm();
  form.uploadDir = DIR_UPLOADS;
  form.parse(req, async function (err, fields, files) {
    try {
      if (err) throw err;
      let oldpath = files.filetoupload.path;
      let newpath = DIR_UPLOADS + files.filetoupload.name;
      await fs.promises.rename(oldpath, newpath);
      res.redirect('/fileupload');
    } catch (error) {
      res.status(500).json(error).end();
    }
  });
})
router.get('/deleteupload', async function (req, res) {
  const file = req.query.file;
  if(file)
    await fs.promises.unlink(DIR_UPLOADS + file);
  res.redirect('/fileupload');
})


module.exports = router; 
