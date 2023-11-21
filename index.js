import { SelfieSegmentation } from '@mediapipe/selfie_segmentation'
export class VirtualBg {
  #foregroundCanvasElement = document.createElement('canvas')
  #backgroundCanvasElement = document.createElement('canvas')
  inputHtmlVideoElement = document.createElement('video')
  #backgroundCanvasCtx = this.#backgroundCanvasElement.getContext('2d')
  #foregroundCanvasCtx = this.#foregroundCanvasElement.getContext('2d')
  #outputCanvasElement = document.createElement('canvas')

  _stream = null

  selfieSegmentation = null
  #outputCanvasCtx = null
  #effectType = 'filter' // filter | video | image
  #backgroundImage = null
  #backgroundVideo = null
  #foregroundType = 'normal' // normal | presenter
  #presenterModeOffset = 0
  #playingStatus = true
  #holstOptions = {
    width: 240,
    height: 135,
  }
  #modelSelection = 0
  #selfieMode = false

  get effectType() {
    return this.#effectType
  }
  set effectType(value) {
    this.#effectType = value
  }

  get backgroundImage() {
    return this.#backgroundImage
  }
  set backgroundImage(value) {
    this.#backgroundImage = value
  }

  get backgroundVideo() {
    return this.#backgroundVideo
  }
  set backgroundVideo(value) {
    this.#backgroundVideo = value
  }

  get foregroundType() {
    return this.#foregroundType
  }
  set foregroundType(value) {
    this.#foregroundType = value
  }

  get presenterModeOffset() {
    return this.#presenterModeOffset
  }
  set presenterModeOffset(value) {
    this.#presenterModeOffset = value
  }

  get holstOptions() {
    return this.#holstOptions
  }
  set holstOptions(value) {
    this.#holstOptions = value
  }

  get modelSelection() {
    return this.#modelSelection
  }
  set modelSelection(value) {
    this.#modelSelection = value
  }

  get selfieMode() {
    return this.#selfieMode
  }
  set selfieMode(value) {
    this.#selfieMode = value
  }

  get playingStatus() {
    return this.#playingStatus
  }

  async setConstraints() {
    const constraints = {
      advanced: [
        {
          width: this.#holstOptions.width,
          height: this.#holstOptions.height,
        },
      ],
    }

    const track = this.inputHtmlVideoElement.srcObject.getVideoTracks()[0]
    await track.applyConstraints(constraints)
  }

  #setStream = function () {
    this.stream = this.#outputCanvasElement.captureStream(33)
    const audioTrack = this.inputHtmlVideoElement.srcObject.getAudioTracks()[0]
    this.stream.addTrack(audioTrack)
  }
  #startSegmentBackground = function () {
    if (!this.stream) {
      this.#setStream()
    }
    this.inputHtmlVideoElement.addEventListener('play', this.#sendToMediaPipe())
  }
  async initSegmentBackground(mediaStream) {
    this.#foregroundCanvasElement.id = 'foregroundCanvasElement'
    this.#backgroundCanvasElement.id = 'backgroundCanvasElement'
    this.#outputCanvasElement.width = this.#holstOptions.width
    this.#outputCanvasElement.height = this.#holstOptions.height

    this.inputHtmlVideoElement.srcObject = mediaStream
    this.#foregroundCanvasElement.width = this.#backgroundCanvasElement.width =
      this.#outputCanvasElement.width
    this.#foregroundCanvasElement.height =
      this.#backgroundCanvasElement.height = this.#outputCanvasElement.height
    this.#outputCanvasCtx = this.#outputCanvasElement.getContext('2d')

    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      },
    })
    this.selfieSegmentation.setOptions({
      modelSelection: this.modelSelection,
      selfieMode: this.#selfieMode,
    })
    this.selfieSegmentation.onResults((results) => {
      this.mergeForegroundBackground(
        this.#foregroundCanvasElement,
        this.#backgroundCanvasElement,
        results
      )
    })
    this.inputHtmlVideoElement.pause()
    this.inputHtmlVideoElement.play()
    this.#startSegmentBackground()
  }
  #sendToMediaPipe = function () {
    this.inputHtmlVideoElement.muted = true
    const ctx = this
    async function step() {
      if (!ctx.#playingStatus) return
      await ctx.selfieSegmentation.send({
        image: ctx.inputHtmlVideoElement,
      })
      if (!document.hidden) {
        requestAnimationFrame(step)
      } else {
        requestIdleCallback(step, { timeout: 24 })
      }
    }
    requestAnimationFrame(step)
  }
  async pauseSegmentBackground() {
    this.#playingStatus = false
    this.inputHtmlVideoElement.pause()
    this.inputHtmlVideoElement.removeEventListener(
      'play',
      this.#sendToMediaPipe()
    )
  }
  async resumeSegmentBackground() {
    this.#playingStatus = true
    this.#startSegmentBackground()
    this.inputHtmlVideoElement.play()
  }
  mergeForegroundBackground(
    foregroundCanvasElement,
    backgroundCanvasElement,
    results
  ) {
    this.makeCanvasLayer(results, this.#foregroundCanvasCtx, 'foreground')
    if (this.#effectType === 'filter') {
      this.makeCanvasLayer(results, this.#backgroundCanvasCtx, 'background')
    } else if (this.#effectType === 'image') {
      this.#backgroundCanvasCtx.drawImage(
        this.#backgroundImage,
        0,
        0,
        backgroundCanvasElement.width,
        backgroundCanvasElement.height
      )
    } else if (this.#effectType === 'video') {
      this.#backgroundCanvasCtx.drawImage(
        this.#backgroundVideo,
        0,
        0,
        backgroundCanvasElement.width,
        backgroundCanvasElement.height
      )
    }
    this.#outputCanvasCtx.drawImage(backgroundCanvasElement, 0, 0)
    if (this.#foregroundType === 'presenter')
      this.#outputCanvasCtx.drawImage(
        foregroundCanvasElement,
        foregroundCanvasElement.width * 0.5 - this.#presenterModeOffset,
        foregroundCanvasElement.height * 0.5,
        foregroundCanvasElement.width * 0.5,
        foregroundCanvasElement.height * 0.5
      )
    else this.#outputCanvasCtx.drawImage(foregroundCanvasElement, 0, 0)
  }
  makeCanvasLayer(results, canvasCtx, type) {
    canvasCtx.save()
    canvasCtx.clearRect(
      0,
      0,
      this.#holstOptions.width,
      this.#holstOptions.height
    )
    canvasCtx.drawImage(
      results.segmentationMask,
      0,
      0,
      this.#holstOptions.width,
      this.#holstOptions.height
    )
    if (type === 'foreground') {
      canvasCtx.globalCompositeOperation = 'source-in'
    }
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.#holstOptions.width,
      this.#holstOptions.height
    )
    canvasCtx.restore()
  }
  applyFilter(filter) {
    this.#effectType = 'filter'
    this.#foregroundType = 'normal'
    this.#backgroundCanvasCtx.filter = filter
  }

  applyImageBackground() {
    this.#backgroundImage =
      'https://habrastorage.org/r/w1560/webt/uf/x1/ms/ufx1msnzl3xgtcmlt-rkqhpytma.png'
    this.#foregroundType = 'normal'
    this.#effectType = 'image'
  }

  applyVideoBackground(video) {
    this.#backgroundVideo = video
    video.autoplay = true
    video.loop = true
    video.addEventListener('play', () => {
      video.muted = true
    })
    this.#effectType = 'video'
  }
  applyScreenBackground(stream) {
    const videoElement = document.createElement('video')
    videoElement.srcObject = stream
    this.#backgroundVideo = videoElement
    videoElement.autoplay = true
    videoElement.loop = true
    videoElement.addEventListener('play', () => {
      videoElement.muted = true
    })
    this.#effectType = 'video'
  }
  changeForegroundType(type, offset = 0) {
    this.#foregroundType = type
    this.#presenterModeOffset = offset
  }
}
