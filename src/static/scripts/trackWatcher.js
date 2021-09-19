setInterval(() => {
  let track = {
    title: document.querySelector("#layout > ytmusic-player-bar > div.middle-controls.style-scope.ytmusic-player-bar > div.content-info-wrapper.style-scope.ytmusic-player-bar > yt-formatted-string").title,
    thumbnail: document.querySelector('#song-image #img').src,
    length: document.querySelector('video').duration,
    currentTime: document.querySelector('video').currentTime,
    lengthFormatted: document.querySelector("#left-controls > span").innerText,
    playing: !document.querySelector('video').paused,
    author: document.querySelector(".subtitle .ytmusic-player-bar").title.split(' • ')[0]
  }

  if(!track.title) return
  
  window.api.emitTrackUpdate(track)
}, 1000)