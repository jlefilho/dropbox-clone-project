var express = require('express');
var router = express.Router();
var formidable = require('formidable')  //setando o Formidable
var fs = require('fs')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/upload', (req, res) => {  //criando rota POST para o /upload

	let form = new formidable.IncomingForm({  //instanciando o Formidable

		uploadDir: './upload',  //informando o diretório para armazenar o arquivo
		keepExtensions: true    //mantendo a extensão do arquivo
	})

	form.parse(req, (err, fields, files) => {

		res.json({
		files
		})  
	})  
})

router.get('/file', (req, res) => {

	let path = './' + req.query.path

	if (fs.existsSync(path)){

		fs.readFile(path, (err, data) => {

			if (err) {

				console.error(err)

				res.status(404).json({
					error: err
				})

			} else {

				res.status(200).end(data)

			}
		})

	} else {

		res.status(404).json({
			error: 'File not found.'
		})

	}

})

router.delete('/file', (req, res) => {
	let form = new formidable.IncomingForm({
		uploadDir: './upload',
		keepExtensions: true
	})

	form.parse(req, (err, fields, files) => {

		let filepath = './' + fields.filepath		

		if (fs.existsSync(filepath)) {
			fs.unlink(filepath, err => {

				if (err) {
					res.status(400).json({
						err
					})
				} 
				
			})

		} else {	

			res.json({
				fields
			})
		}
		
	})
})

module.exports = router;
