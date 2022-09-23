class DropBoxController {

    constructor(){

        this.btnSendFileEl = document.querySelector('#btn-send-file')   //selecionando o botão "Enviar Arquivos"
        this.btnNewFolderEl = document.querySelector('#btn-new-folder') //selecionando o botão "Criar Pasta"
        this.btnRenameEl = document.querySelector('#btn-rename')    //selecionando o botão "Renomear"
        this.btnDeleteEl = document.querySelector('#btn-delete')    //selecionando o botão "Apagar"

		  this.navEl = document.querySelector('#browse-location') 	//selecionando o diretório de navegação          

        this.inputFilesEl = document.querySelector('#files')   //selecionando a janela de selecionar arquivos (input #files)
        this.listFilesEl = document.querySelector('#list-of-files-and-directories') //selecionando a lista de arquivos salvos (ul)
        this.snackBarEl = document.querySelector('#react-snackbar-root')    //selecionando o modal de carregamento
        this.progressBarEl = this.snackBarEl.querySelector('.mc-progress-bar-fg')     //selecionando a barra de carregamento
        this.fileNameEl = this.snackBarEl.querySelector('.filename')    //selecionando o span do nome do arquivo no modal de carregamento
        this.timeleftEl = this.snackBarEl.querySelector('.timeleft')    //selecionando o span de tempo restante no modal de carregamento
		
		    this.currentFolder = ['default']	//criando a pasta "virtual"

        this.onSelectionChange = new Event('selectionchange')   //criando um evento 'selectionchange' para quando a seleção mudar

        this.connectFirebase()  //conectando ao Firebase
        this.initEvents()
        this.openFolder()	//lendo os arquivos existentes no default

    }

    //método para conectar ao Firebase
    connectFirebase(){

        const firebaseConfig = {
            apiKey: "AIzaSyD2fc6Pt_VkGojpAUN9jqP_jLFQYEGFuzI",
            authDomain: "dropbox-clone-jlefilho.firebaseapp.com",
            databaseURL: "https://dropbox-clone-jlefilho-default-rtdb.firebaseio.com",
            projectId: "dropbox-clone-jlefilho",
            storageBucket: "dropbox-clone-jlefilho.appspot.com",
            messagingSenderId: "1024469946841",
            appId: "1:1024469946841:web:cc1249a4e7dafcd90809c8",
            measurementId: "G-DX9GBEG60Z"
        }
                  
        firebase.initializeApp(firebaseConfig)        

    }


    initEvents(){
        
        this.listFilesEl.addEventListener('selectionchange', event => { //adicionando evento de mudança de seleção na lista de arquivos (ul)

            switch (this.getSelection().length) {

                case 0: //caso não houver arquivo selecionado...
                    this.btnDeleteEl.style.display = 'none' //escondendo botão de Apagar
                    this.btnRenameEl.style.display = 'none' //escondendo botão de Renomear
                    break
                case 1: //caso 1 item esteja selecionado...
                this.btnDeleteEl.style.display = 'block' //mostrando botão de Apagar
                this.btnRenameEl.style.display = 'block' //mostrando botão de Renomear
                    break
                default:    //caso 2 ou mais itens estejam selecionados....
                    this.btnRenameEl.style.display = 'none' //escondendo botão de Renomear
                    this.btnDeleteEl.style.display = 'block' //mostrando botão de Apagar
            }   

        })

        this.btnSendFileEl.addEventListener('click', event => { //adicionando evento de click no botão de envio

            this.inputFilesEl.click()       //habilitando a janela de selecionar arquivos
            this.btnSendFileEl.disabled = true  //desabilitandao o botão

        })

        this.btnRenameEl.addEventListener('click', event => {   //adicionando evento de click no botão "Renomear"

            let li = this.getSelection()[0] //selecionando o arquivo selecionado

            let file = JSON.parse(li.dataset.file)  //convertendo as informações (dataset.file) do arquivo selecionado (em string) para objeto json

            let fileName = prompt("Renomear o arquivo: ", file.originalFilename) //abrindo um prompt para renomear arquivo

            if (fileName) { //se for digitado um novo nome....

                file.originalFilename = fileName    //substituindo o nome do arquivo no dataset

                this.fireBaseRef().child(li.dataset.key).set(file)  //salva o arquivo com novo nome no Firebase
            }

        })

        this.btnDeleteEl.addEventListener('click', event => {   //crindo evento de click no botão "Apagar"

            this.removeFile().then(responses => {       //chamando o método de apagar arquivos, retornando as promessas

                responses.forEach(response => {

                    if (response.fields.key) {

                        this.fireBaseRef().child(response.fields.key).remove()  //remove o arquivo no Firebase
                    }

                })
                
            }).catch(err =>{    //em caso de erro...

                console.error(err)

            })

        })

        this.inputFilesEl.addEventListener('change', event => {     //quando selecionamos um arquivo (alteramos o file)
            
            this.uploadFile(event.target.files).then(responses => {    //executando o método de envio de arquivo(s), passando a coleção de arquivo(s) selecionado(s) e trazendo a resposta das promessas

                responses.forEach(resp => {     //para cada uma das respostas...
               
                    this.fireBaseRef().push().set({
						originalFilename: resp.name,
						mimetype: resp.contentType,
						filepath: resp.downloadURLs[0],
						size: resp.size
					}) //salvando o arquivo (as informações do arquivo) respectivo no Firebase

                })

                this.uploadComplete()

            }).catch(err => {   //em caso de erro...

                console.log(err)
                this.uploadComplete()

            })    

            this.snackBarShow()  //exibindo a barra de carregamento (true)           
            
        })

		this.btnNewFolderEl.addEventListener('click', event => {	//criando evento de click para o botão "Nova pasta"

			let newFolderName = prompt('Nome da nova pasta:')	//abrindo um prompt para digitar o nome da nova pasta

			if (newFolderName){	//se for digitado um nome...

				this.fireBaseRef().push().set({	//inserindo no Firebase o arquivo (pasta)

					originalFilename: newFolderName,		//nome
					mimetype:'folder',		//tipo: pasta
					virtualPath: this.currentFolder.join('/')	//caminho

				})
			}
		})
    }

    //método para realizar funções comuns ao completar o envio de arquivos
    uploadComplete(){

        this.snackBarShow(false)    //escondendo a barra de carregamento

        this.inputFilesEl.value = ''    //reseta o valor do arquivo

        this.btnSendFileEl.disabled = false     //habilitando o botão de envio de arquivos
    }

    //método para selecionar a referência do Firebase (onde queremos salvar os arquivos)
    fireBaseRef(path){

		if (!path) path = this.currentFolder.join('/')	//se não receber nenhum caminho, o caminho é a pasta atual (o array [caminho] com '/' entre as pastas)

        return firebase.database().ref(path)

    }

    //méotodo para exibir/esconder modal da barra de carregamento
    snackBarShow(show = true){

        this.snackBarEl.style.display = (show) ? 'block' : 'none'   //se 

    }

    //método para envio de arquivo(s), recebendo o(s) arquivo(s) selecionado(s)
    uploadFile(files){

      let promises = [];  //criando um array para as promessas (que serão geradas por cada file no forEach)

        [...files].forEach(file => {       //os arquivos são colocados em um array e percorremos este array. Para cada arquivo...
			
        	promises.push(new Promise((resolve, reject) => {	//inserindo a promessa no array de promessas
				
				let fileRef = firebase.storage().ref(this.currentFolder.join('/')).child(file.name)	//setando o caminho de referência para o storage do Firebase
	
				let task = fileRef.put(file)	//inserindo o arquivo no storage
	
				task.on('state_changed', snapshot => {	
	
					this.uploadProgress({
						loaded: snapshot.bytesTransferred,
						total: snapshot.totalBytes
					}, file)					
	
				}, error =>{
	
					console.error(error)
					reject(error)
	
				}, () => {

					fileRef.getMetadata().then(metadata => {

						resolve(metadata)

					}).catch(err => {

						reject(err)

					})	
				})
			}))
        })

      return Promise.all(promises)    //retornando a resolução de todas promessas

    }

    
    //método para apagar arquivos
    removeFile(){

		let promises = []   //criando um array para as promessas de cada arquivo

		this.getSelection().forEach(li => { //para cada arquivo selecionado...

			let file = JSON.parse(li.dataset.file)  //armazenando o arquivo selecioando e convertendo o dataset (string) para objeto JSON
			let key = li.dataset.key    //armazendando o key
			
			promises.push(new Promise((resolve, reject) => {
				
				if (file.mimetype === 'folder') {

					this.removeFolderFromDB(this.currentFolder.join('/'), file.originalFilename).then(()=>{

						resolve({
							fields:{
								key
							}
						})

					})

				} else if (file.mimetype){

					this.removeFileFromDB(this.currentFolder.join('/'), file.originalFilename).then(() => {
	
						resolve({
							fields:{
								key
							}
						})
					})
				}
				
			}))
		})

      	return Promise.all(promises)    //retornando todas as promessas
    }


	//método para apagar pastas do banco de dados
	removeFolderFromDB(ref, name){

		return new Promise ((resolve, reject) => {

			let folderRef = this.fireBaseRef(ref + '/' + name)

			folderRef.on('value', snapshot => {

				folderRef.off('value')

				snapshot.forEach(item => {

					let data = item.val()
					data.key = item.key

					if (data.mimetype === 'folder') {

						this.removeFolderFromDB(ref + '/' + name, data.originalFilename).then(()=>{

							resolve({
								fields:{
									key: data.key
								}
							}).catch(err => {

								reject(err)
							})
						})

					} else if (data.mimetype) {

						this.removeFileFromDB(ref + '/' + name, data.originalFilename).then(()=>{

							resolve({
								fields:{
									key: data.key
								}
							}).catch(err => {

								reject(err)
							})
						})

					}

				})

				folderRef.remove()
				
			})			
		})
	}
	
	//méotodo para remover arquivos do bando de dados
	removeFileFromDB(ref, name){
		
		let fileRef = firebase.storage().ref(ref).child(name)

		return fileRef.delete()

	}


     
    //método para execução do AJAX
    ajax(url, method, formData = new FormData(), onprogress = function(){}, onloadstart = function(){}){

       return new Promise((resolve, reject) => {
        
        let ajax = new XMLHttpRequest()     //criando uma requisição assíncrona do servidor

        ajax.open(method, url)       //abrindo a conexão via POST, e direcionando para a pasta /upload

        ajax.onload = event => {        //ao enviar                   

            try {   //caso dê certo...

                resolve(JSON.parse(ajax.responseText))  //faz um JSON.parse (serializa) da resposta do servidor (vem em string)

            } catch (e) {      //caso dê errado...

                reject(e)
            }
        }

        ajax.onerror = event => {   //se houver algum erro...
            
            reject(event)
        }

        ajax.upload.onprogress = onprogress      //durante o carregamento do arquivo...
        
        onloadstart()   //guardando a hora que o envio começou             
        
        ajax.send(formData)     //enviando as informações do arquivo para a pasta direcionada

       }) 

    }
	

    //método para calcular/mostrar o carregamento do arquivo
    uploadProgress(event, file) {

        let timeSpent = Date.now() - this.startUploadTime   //calculando o tempo gasto no carregamento

        let loaded = event.loaded   //bytes carregados
        let total = event.total     //bytes totais

        let porcent = parseInt((loaded / total) * 100)      //cálculo de percentagem de bytes carregados

        let timeleft = ((100 - porcent) * timeSpent) / porcent

        this.progressBarEl.style.width = `${porcent}%`     //atribuindo na barra de carregamento o percentual concluído

        this.fileNameEl.innerHTML = file.name   //atribuindo o nome do arquivo no modal
        this.timeleftEl.innerHTML = this.formatTimeFromMs(timeleft)     //atribuindo o tempo restante no modal

    }

    //método para calcular o tempo em horas, minutos e segundos a partir de ms
    formatTimeFromMs(duration){

        let seconds = parseInt((duration / 1000)) % 60
        let minutes = parseInt((duration / (1000 * 60)) % 60)
        let hours = parseInt((duration / (1000 * 3600)) % 24)
        
        if (hours > 0) {
            return `${hours} horas, ${minutes} minutos, ${seconds} segundos`
        }

        if (minutes > 0) {
            return `${minutes} minutos, ${seconds} segundos`
        }
        
        if (seconds > 0) {
            return `${seconds} segundos`
        }

        return ''

    }

    //método para mostrar o ícone do tipo de arquivo
    getFileIcon(file) {
        switch (file.mimetype) {
          case 'folder':
            return `
            <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                <title>content-folder-large</title>
                <g fill="none" fill-rule="evenodd">
                    <path d="M77.955 53h50.04A3.002 3.002 0 0 1 131 56.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 114.995V45.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z" fill="#71B9F4"></path>
                    <path d="M77.955 52h50.04A3.002 3.002 0 0 1 131 55.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 113.995V44.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z" fill="#92CEFF"></path>
                </g>
            </svg>`;
            break;
    
          case 'application/pdf':
            return `
              <svg version="1.1" id="Camada_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="160px" height="160px" viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
                  <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterUnits="objectBoundingBox" y="-.5%" x="-.7%">
                    <feOffset result="shadowOffsetOuter1" in="SourceAlpha" dy="1"></feOffset>
                    <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1">
                    </feColorMatrix>
                  </filter>
                  <title>PDF</title>
                  <g>
                    <g>
                      <g filter="url(#mc-content-unknown-large-a)">
                        <path id="mc-content-unknown-large-b_2_" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47c-2.209,0-4-1.791-4-4V34
                          C43,31.791,44.791,30,47,30z"></path>
                      </g>
                      <g>
                        <path id="mc-content-unknown-large-b_1_" fill="#F7F9FA" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47
                          c-2.209,0-4-1.791-4-4V34C43,31.791,44.791,30,47,30z"></path>
                      </g>
                    </g>
                  </g>
                  <path fill-rule="evenodd" clip-rule="evenodd" fill="#F15124" d="M102.482,91.479c-0.733-3.055-3.12-4.025-5.954-4.437
                    c-2.08-0.302-4.735,1.019-6.154-0.883c-2.167-2.905-4.015-6.144-5.428-9.482c-1.017-2.402,1.516-4.188,2.394-6.263
                    c1.943-4.595,0.738-7.984-3.519-9.021c-2.597-0.632-5.045-0.13-6.849,1.918c-2.266,2.574-1.215,5.258,0.095,7.878
                    c3.563,7.127-1.046,15.324-8.885,15.826c-3.794,0.243-6.93,1.297-7.183,5.84c0.494,3.255,1.988,5.797,5.14,6.825
                    c3.062,1,4.941-0.976,6.664-3.186c1.391-1.782,1.572-4.905,4.104-5.291c3.25-0.497,6.677-0.464,9.942-0.025
                    c2.361,0.318,2.556,3.209,3.774,4.9c2.97,4.122,6.014,5.029,9.126,2.415C101.895,96.694,103.179,94.38,102.482,91.479z
                    M67.667,94.885c-1.16-0.312-1.621-0.97-1.607-1.861c0.018-1.199,1.032-1.121,1.805-1.132c0.557-0.008,1.486-0.198,1.4,0.827
                    C69.173,93.804,68.363,94.401,67.667,94.885z M82.146,65.949c1.331,0.02,1.774,0.715,1.234,1.944
                    c-0.319,0.725-0.457,1.663-1.577,1.651c-1.03-0.498-1.314-1.528-1.409-2.456C80.276,65.923,81.341,65.938,82.146,65.949z
                    M81.955,86.183c-0.912,0.01-2.209,0.098-1.733-1.421c0.264-0.841,0.955-2.04,1.622-2.162c1.411-0.259,1.409,1.421,2.049,2.186
                    C84.057,86.456,82.837,86.174,81.955,86.183z M96.229,94.8c-1.14-0.082-1.692-1.111-1.785-2.033
                    c-0.131-1.296,1.072-0.867,1.753-0.876c0.796-0.011,1.668,0.118,1.588,1.293C97.394,93.857,97.226,94.871,96.229,94.8z"></path>
              </svg>
            `
            break;
    
          case 'audio/mp3':
          case 'audio/ogg':
            return `
            <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                <title>content-audio-large</title>
                <defs>
                  <rect id="mc-content-audio-large-b" x="30" y="43" width="100" height="74" rx="4"></rect>
                  <filter x="-.5%" y="-.7%" width="101%" height="102.7%" filterUnits="objectBoundingBox" id="mc-content-audio-large-a">
                    <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                    <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                  </filter>
                </defs>
                <g fill="none" fill-rule="evenodd">
                  <g>
                    <use fill="#000" filter="url(#mc-content-audio-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-audio-large-b"></use>
                    <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-audio-large-b"></use>
                  </g>
                  <path d="M67 60c0-1.657 1.347-3 3-3 1.657 0 3 1.352 3 3v40c0 1.657-1.347 3-3 3-1.657 0-3-1.352-3-3V60zM57 78c0-1.657 1.347-3 3-3 1.657 0 3 1.349 3 3v4c0 1.657-1.347 3-3 3-1.657 0-3-1.349-3-3v-4zm40 0c0-1.657 1.347-3 3-3 1.657 0 3 1.349 3 3v4c0 1.657-1.347 3-3 3-1.657 0-3-1.349-3-3v-4zm-20-5.006A3 3 0 0 1 80 70c1.657 0 3 1.343 3 2.994v14.012A3 3 0 0 1 80 90c-1.657 0-3-1.343-3-2.994V72.994zM87 68c0-1.657 1.347-3 3-3 1.657 0 3 1.347 3 3v24c0 1.657-1.347 3-3 3-1.657 0-3-1.347-3-3V68z" fill="#637282"></path>
                </g>
              </svg>
            `
              break;
    
          case 'video/mp4':
          case 'video/quicktime':
            return `
              <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                <title>content-video-large</title>
                <defs>
                  <rect id="mc-content-video-large-b" x="30" y="43" width="100" height="74" rx="4"></rect>
                  <filter x="-.5%" y="-.7%" width="101%" height="102.7%" filterUnits="objectBoundingBox" id="mc-content-video-large-a">
                    <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                    <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                  </filter>
                </defs>
                <g fill="none" fill-rule="evenodd">
                  <g>
                    <use fill="#000" filter="url(#mc-content-video-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-video-large-b"></use>
                    <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-video-large-b"></use>
                  </g>
                  <path d="M69 67.991c0-1.1.808-1.587 1.794-1.094l24.412 12.206c.99.495.986 1.3 0 1.794L70.794 93.103c-.99.495-1.794-.003-1.794-1.094V67.99z" fill="#637282"></path>
                </g>
              </svg>
            `;
            break;
    
          case 'image/jpeg':
          case 'image/jpg':
          case 'image/png':
          case 'image/gif': 
            return `
              <svg version="1.1" id="Camada_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="160px" height="160px" viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
                  <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterUnits="objectBoundingBox" y="-.5%" x="-.7%">
                    <feOffset result="shadowOffsetOuter1" in="SourceAlpha" dy="1"></feOffset>
                    <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1">
                    </feColorMatrix>
                  </filter>
                  <title>Imagem</title>
                  <g>
                    <g>
                        <g filter="url(#mc-content-unknown-large-a)">
                          <path id="mc-content-unknown-large-b_2_" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47c-2.209,0-4-1.791-4-4V34
                            C43,31.791,44.791,30,47,30z"></path>
                        </g>
                        <g>
                          <path id="mc-content-unknown-large-b_1_" fill="#F7F9FA" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47
                            c-2.209,0-4-1.791-4-4V34C43,31.791,44.791,30,47,30z"></path>
                        </g>
                    </g>
                  </g>
                  <g>
                    <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M81.148,62.638c8.086,0,16.173-0.001,24.259,0.001
                        c1.792,0,2.3,0.503,2.301,2.28c0.001,11.414,0.001,22.829,0,34.243c0,1.775-0.53,2.32-2.289,2.32
                        c-16.209,0.003-32.417,0.003-48.626,0c-1.775,0-2.317-0.542-2.318-2.306c-0.002-11.414-0.003-22.829,0-34.243
                        c0-1.769,0.532-2.294,2.306-2.294C64.903,62.637,73.026,62.638,81.148,62.638z M81.115,97.911c7.337,0,14.673-0.016,22.009,0.021
                        c0.856,0.005,1.045-0.238,1.042-1.062c-0.028-9.877-0.03-19.754,0.002-29.63c0.003-0.9-0.257-1.114-1.134-1.112
                        c-14.637,0.027-29.273,0.025-43.91,0.003c-0.801-0.001-1.09,0.141-1.086,1.033c0.036,9.913,0.036,19.826,0,29.738
                        c-0.003,0.878,0.268,1.03,1.069,1.027C66.443,97.898,73.779,97.911,81.115,97.911z"></path>
                    <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M77.737,85.036c3.505-2.455,7.213-4.083,11.161-5.165
                        c4.144-1.135,8.364-1.504,12.651-1.116c0.64,0.058,0.835,0.257,0.831,0.902c-0.024,5.191-0.024,10.381,0.001,15.572
                        c0.003,0.631-0.206,0.76-0.789,0.756c-3.688-0.024-7.375-0.009-11.062-0.018c-0.33-0.001-0.67,0.106-0.918-0.33
                        c-2.487-4.379-6.362-7.275-10.562-9.819C78.656,85.579,78.257,85.345,77.737,85.036z"></path>
                    <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M87.313,95.973c-0.538,0-0.815,0-1.094,0
                        c-8.477,0-16.953-0.012-25.43,0.021c-0.794,0.003-1.01-0.176-0.998-0.988c0.051-3.396,0.026-6.795,0.017-10.193
                        c-0.001-0.497-0.042-0.847,0.693-0.839c6.389,0.065,12.483,1.296,18.093,4.476C81.915,90.33,84.829,92.695,87.313,95.973z"></path>
                    <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M74.188,76.557c0.01,2.266-1.932,4.223-4.221,4.255
                        c-2.309,0.033-4.344-1.984-4.313-4.276c0.03-2.263,2.016-4.213,4.281-4.206C72.207,72.338,74.179,74.298,74.188,76.557z"></path>
                  </g>
              </svg>
            `;
            break;
          
          default:
            return `
              <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                <title>1357054_617b.jpg</title>
                <defs>
                  <rect id="mc-content-unknown-large-b" x="43" y="30" width="74" height="100" rx="4"></rect>
                  <filter x="-.7%" y="-.5%" width="101.4%" height="102%" filterUnits="objectBoundingBox" id="mc-content-unknown-large-a">
                    <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                    <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                  </filter>
                </defs>
                <g fill="none" fill-rule="evenodd">
                  <g>
                    <use fill="#000" filter="url(#mc-content-unknown-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                    <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                  </g>
                </g>
              </svg>
            `;
        }
      }

    //método para criar a listagem do arquivo
    getFileView(file, key){

        let li = document.createElement('li')   //criando o elemento HTML (li)

        li.dataset.key = key    //criando um dataset para a respectiva li com a chave retornada no Firebase
        li.dataset.file = JSON.stringify(file)   //criando um dataset para a respectiva li com os dados do arquivo (em formato string)

        li.innerHTML = `           
            ${this.getFileIcon(file)}
            <div class="name text-center">${file.originalFilename}</div>            
        `
        
        this.initEventsLi(li)

        return li
    }

    //método para adicionar eventos na li
    initEventsLi(li){

        li.addEventListener('click', event => {   //criando evento de click único para o arquivo respectivo

            if (event.shiftKey){   //se tiver com shift pressionado...

                let firstLi = this.listFilesEl.querySelector('.selected')   //selecionando a li selecionada (se houver)

                if (firstLi){   //se houver li selecionada...

                    let firstIndex  //criando variável para primeiro index selecionado
                    let lastIndex   //criando variável para último index selecionado

                    this.listFilesEl.childNodes.forEach((el, index) => {    //para cada filho da ul (li)...

                        if (firstLi === el) firstIndex = index  //se a primeira li selecionada for igual ao elemento em questão, guarda este index do elemento
                        
                        if (li === el) lastIndex = index    //se a segunda li selecionada for igual ao elemento em questão, guarda este index do elemento
                    
                    })

                    let selectedIndex = [firstIndex, lastIndex].sort()  //coloca os index dos elementos e ordena por valor em um array (ex.: [2,6])

                    this.listFilesEl.childNodes.forEach((el, i) => {    //para cada li...

                        if (i >= selectedIndex[0] && i <= selectedIndex[1]){    
                            el.classList.add('selected')    //adicionando a classe selected em todas li's entre o array de selecionados (do primeiro ao último)  (ex.: [2], 3, 4, 5, [6])
                        }
                    })

                    this.listFilesEl.dispatchEvent(this.onSelectionChange)  //"avisando" que houve uma mudança de seleção na lista de arquivos
                    
                    return true
                }
            }

            if (!event.ctrlKey){    //se não tiver com ctrl pressionado....

                this.listFilesEl.querySelectorAll('li.selected').forEach(el =>{ //selecionando todos os arquivos com a classe selected (li) e para cada um

                    el.classList.remove('selected') //removendo a classe em todos selecinados

                })     
            }
            
            li.classList.toggle('selected') //adicionando/removendo classe selected no respectivo item da li

            this.listFilesEl.dispatchEvent(this.onSelectionChange)  //"avisando" que houve uma mudança de seleção na lista de arquivos
        })  

		
		li.addEventListener('dblclick', event => {	//criando evento de duplo click para o arquivo respectivo

			let file = JSON.parse(li.dataset.file)	//pegando o dataset do arquivo e traduzindo para object

			switch (file.mimetype) {

				case 'folder':		//se for tipo pasta...
					this.currentFolder.push(file.originalFilename)	//adicionando o nome da pasta no array currentFolder (formando o caminho)
					this.openFolder()	//abrindo a pasta
					break

				default:	//qualquer outro tipo
					window.open(file.filepath)	//abrindo o arquivo (executa)

			}

		})

    }

	//método para abrir o arquivo tipo pasta
	openFolder(){

		if (this.lastFolder) this.fireBaseRef(this.lastFolder).off('value')	//se houver uma pasta anterior, desliga a "escuta" da pasta anterior

		this.readFiles()	//listando arquivos
		this.renderNav()

	}

	//método para renderizar o diretório de navegação
	renderNav(){

		let nav = document.createElement('nav')
		let path = []	//criando um array que será nosso caminho percorrido

		for (let i = 0; i < this.currentFolder.length; i++){	//criando um FOR que irá percorrer cada pasta acessada (array currentFolder[index])

			let folderName = this.currentFolder[i]	//atribuindo o nome da pasta a uma variável
			let span = document.createElement('span')	//criando o elemento de texto

			path.push(folderName)	//inserindo no array de caminho percorrido o nome da atual pasta

			if ((i+1) === this.currentFolder.length){	//se esta for a última pasta (pasta atual)....

				span.innerHTML = folderName	//mostrando o texto com o nome da pasta atual

			} else {	//se não for a última pasta...

				span.className = 'breadcrumb-segment__wrapper'
				
				span.innerHTML = `
					<span class="ue-effect-container uee-BreadCrumbSegment-link-0">
                        <a href="#" data-path="${path.join('/')}" class="breadcrumb-segment">${folderName}</a>
                    </span>
                        <svg width="24" height="24" viewBox="0 0 24 24" class="mc-icon-template-stateless" style="top: 4px; position: relative;">
                        <title>arrow-right</title>
                        <path d="M10.414 7.05l4.95 4.95-4.95 4.95L9 15.534 12.536 12 9 8.464z" fill="#637282"fill-rule="evenodd"></path>
                    </svg>										
				
				`	//criando uma span acrescentando o nome da pasta e adicionando um dataset com o caminho (array) percorrido, ligado por '/'

			}

			nav.appendChild(span)	//inserindo esta span no elemento nav			
		}
		
		this.navEl.innerHTML = nav.innerHTML	//atribuindo o novo caminho percorrido na nav de exibição

		this.navEl.querySelectorAll('a').forEach(a => {	//buscando todos os elementos anchor da nav e para cada um...

			a.addEventListener('click', event => {		//atribuindo evento de click

				event.preventDefault()

				this.currentFolder = a.dataset.path.split('/')		//atribuindo o nome da pasta atual, recuperando o dataset com o caminho, cortando na '/'

				this.openFolder()	//executando o método de abrir pasta (listando arquivos)

			})

		})
	}

    //método para retornar todas li's (aqruivos) selecionados
    getSelection(){

        return this.listFilesEl.querySelectorAll('.selected')

    }


    //método para atualizar (em tempo real) a listagem de arquivos, oriundo do Firebase
    readFiles(){

		this.lastFolder = this.currentFolder.join('/')

        this.fireBaseRef().on('value', snapshot => {    //criando evento "de escuta" no firebase, em cada alteração ocorre uma snapshot

            this.listFilesEl.innerHTML = ''     //limpando a lista para não gerar duplicidade

            snapshot.forEach(item => {  //para cada item (arquivo) na snapshot...

                let key = item.key      //recebendo a chave do arvquivo
                let data = item.val()   //recebendo valor do arquivo (informações do objeto)

				if (data.mimetype) {

					this.listFilesEl.appendChild(this.getFileView(data, key))   //inserindo a li na lista (ul), passando as informações e chave de cada item (arquivo)                

				}
              
            })

        })
    }

}