<template>
  <div
    class="tuner h-screen flex flex-col"
  >
    <nav-bar
      exact-match-only
    />
    <div class="wrapper flex-1">
      <canvas ref="canvas" />
    </div>
  </div>
</template>

<script>
import NavBar from '@components/NavBar'

const NOTES = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#'
]

export default {
  name: 'TunerView',
  components: { NavBar },

  data: () => ({
    iteration: 0,
    repaintInterval: null,
    notes: []
  }),

  created () {
    this.$bus.$on('guitarix :: tuner_changed', this.handleTunerChange)
  },

  beforeDestroy () {
    this.$bus.$off('guitarix :: tuner_changed', this.handleTunerChange)
  },

  mounted () {
    this.repaint()
  },

  methods: {
    handleTunerChange ({ params }) {
      const [freq, note] = params

      if (freq > 0) {
        this.notes.push({ freq, note })

        if (this.repaintInterval == null) {
          this.repaintInterval = setInterval(this.repaint, 100)
        }
      } else {
        this.notes = []

        clearInterval(this.repaintInterval)
        this.repaintInterval = null
        this.repaint()
      }
    },

    repaint () {
      const canvas = this.$refs.canvas

      if (canvas == null) {
        return
      }

      this.iteration++

      const { width, height } = canvas.parentElement.getBoundingClientRect()

      canvas.width = width
      canvas.height = height

      const M = 11

      const minDim = Math.min(width, height)
      const side = minDim / M

      if (canvas.offscreenCanvas == null) {
        canvas.offscreenCanvas = document.createElement('canvas')
        canvas.offscreenCanvas.width = width
        canvas.offscreenCanvas.height = height + side

        const hCount = Math.floor(width / side)
        const xOffset = (width - hCount * side) / 2

        const ctx = canvas.offscreenCanvas.getContext('2d')

        for (let i = 0; i <= hCount; i++) {
          ctx.beginPath()
          ctx.moveTo(xOffset + side * i, -side)
          ctx.lineTo(xOffset + side * i, height + side)
          ctx.stroke()
        }

        const vCount = Math.ceil(height / side) + 1

        for (let i = 0; i <= vCount; i++) {
          ctx.beginPath()
          ctx.moveTo(0, side * i)
          ctx.lineTo(width, side * i)
          ctx.stroke()
        }
      }

      const ctx = canvas.getContext('2d')

      ctx.clearRect(0, 0, width - 1, height - 1)

      ctx.drawImage(canvas.offscreenCanvas, 0, Math.round(side * (-1.0 + 0.1 * (this.iteration % 10))))

      const R = side / 5

      const maxNotes = Math.ceil(height * 0.9 / 2 / R)
      if (this.notes.length > maxNotes) {
        this.notes = this.notes.slice(this.notes.length - maxNotes, this.notes.length)
      }

      ctx.lineWidth = 8

      const bad = [93, 102, 84]
      const soSo = [214, 234, 192]
      const good = [119, 153, 79]

      const interpolate = (color1, color2, d) => [
        color1[0] * (1 - d) + color2[0] * d,
        color1[1] * (1 - d) + color2[1] * d,
        color1[2] * (1 - d) + color2[2] * d
      ]

      const firstNote = this.notes[this.notes.length - 1]
      const targetNote = Math.round(firstNote?.note ?? 440)
      const targetFreq = 440 * Math.pow(2, targetNote / 12)
      const minFreq = 440 * Math.pow(2, (targetNote - 0.25) / 12)
      const maxFreq = 440 * Math.pow(2, (targetNote + 0.25) / 12)

      const minGoodFreq = 440 * Math.pow(2, (targetNote - 0.03) / 12)
      const maxGoodFreq = 440 * Math.pow(2, (targetNote + 0.03) / 12)

      const getFreqXPosition = freq => width * (freq - minFreq) / (maxFreq - minFreq)

      for (const goodFreq of [minGoodFreq, maxGoodFreq]) {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${good[0]}, ${good[1]}, ${good[2]}, 0.5)`
        ctx.setLineDash([side, side])

        const x = getFreqXPosition(goodFreq)

        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      if (this.notes.length === 0) {
        return
      }

      const getRenderFreq = freq => Math.max(Math.min(freq, maxFreq), minFreq)

      const getNoteColor = freq => {
        const renderFreq = getRenderFreq(freq)

        const quality = 2 * Math.abs(targetFreq - renderFreq) / (maxFreq - minFreq)
        return quality >= 0.5 ? interpolate(soSo, bad, 2 * (quality - 0.5)) : interpolate(soSo, good, 2 * (0.5 - quality))
      }

      const getColorString = (color, opacity = 1) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`

      const targetNoteName = NOTES[(12 + NOTES.indexOf('A') + targetNote % 12) % 12]

      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'

      const avgRenderFreq = this.notes.reduce((p, v) => p + getRenderFreq(v.freq), 0) / this.notes.length

      for (let i = 1; i <= this.notes.length; i++) {
        const { freq } = this.notes[this.notes.length - i]

        const renderFreq = Math.max(Math.min(freq, maxFreq), minFreq)

        const color = getNoteColor(freq)

        const x = getFreqXPosition(renderFreq)
        const y = height * 0.1 + 2 * R * i

        ctx.beginPath()
        ctx.fillStyle = getColorString(color, 1 - (i - 1) / maxNotes)
        ctx.arc(x, y, R, 0, 2 * Math.PI, false)
        ctx.arc(x, y, R / 2, 0, 2 * Math.PI, true)
        ctx.fill()
      }

      ctx.fillStyle = getColorString(getNoteColor(avgRenderFreq), 1)
      ctx.font = `${Math.round(side * M / 4)}px sans-serif`
      ctx.fillText(targetNoteName, width / 2, height / 2)
    }
  }
}
</script>

<style scoped>
  .tuner canvas {
    box-shadow: inset 0 0 20px 10px rgba(93, 102, 84, 0.5);
  }
</style>
