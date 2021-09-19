let materialIcons = document.createElement('link')
materialIcons.setAttribute('href', 'https://fonts.googleapis.com/icon?family=Material+Icons')
materialIcons.setAttribute('rel', 'stylesheet')

document.body.prepend(materialIcons)

const closeBtn = document.createElement('div')
const minimizeBtn = document.createElement('div')

closeBtn.innerHTML = '<button title="Shift + Click to close" id="btn-close"><span class="material-icons">close</span></button>'
minimizeBtn.innerHTML = '<button id="btn-minimize"><span class="material-icons">minimize</span></button>'

document.querySelector("#right-content").prepend(closeBtn)
document.querySelector("#right-content").prepend(minimizeBtn)

document.querySelector('#btn-close').addEventListener('click', e => window.api.closeWindow(e.shiftKey ? true : false))
document.querySelector('#btn-minimize').addEventListener('click', () => window.api.minimizeWindow())