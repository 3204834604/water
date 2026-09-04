const app = getApp()

Page({
  data: {
    report: null,
    themeClass: ''
  },

  onShow() {
    const report = wx.getStorageSync('water_report_latest') || null
    this.setData({
      report,
      themeClass: app.globalData.theme === 'dark' ? 'dark' : ''
    }, () => {
      this.drawScoreRing()
    })
  },

  onReady() {
    this.drawScoreRing()
  },

  drawScoreRing() {
    if (!this.data.report) return
    const query = wx.createSelectorQuery().in(this)
    query.select('#scoreRing')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const { node: canvas, width, height } = res[0]
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = width * dpr
        canvas.height = height * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, width, height)
        const report = this.data.report
        this.paintScoreRing(ctx, width, height, report.score, report.scoreColor, 150 / 200)
      })
  },

  paintScoreRing(ctx, w, h, score, color, innerRatio) {
    const cx = w / 2
    const cy = h / 2
    const ringWidth = w * (1 - innerRatio) / 2
    const radius = w / 2 - ringWidth / 2

    ctx.lineWidth = ringWidth
    ctx.lineCap = 'butt'

    ctx.beginPath()
    ctx.strokeStyle = '#e3edf5'
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    const start = -Math.PI / 2
    const end = start + (Math.max(0, Math.min(score, 100)) / 100) * Math.PI * 2
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.arc(cx, cy, radius, start, end)
    ctx.stroke()
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
