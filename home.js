const app = getApp()

const CONFIG = {
  ph: { label: 'pH值', min: 0, max: 14, maxLabel: '14', step: 0.1, fixed: 1, defaultValue: 7.2, color: '#2f91e8' },
  temp: { label: '温度', min: 0, max: 50, maxLabel: '50℃', step: 1, fixed: 0, defaultValue: 24, color: '#f2b93c' },
  oxygen: { label: '溶解氧', min: 0, max: 20, maxLabel: '20mg/L', step: 0.1, fixed: 1, defaultValue: 6.8, color: '#28c49a' }
}

const STORAGE_HISTORY = 'water_history'
const STORAGE_REPORT = 'water_report_latest'

Page({
  data: {
    values: {
      ph: CONFIG.ph.defaultValue,
      temp: CONFIG.temp.defaultValue,
      oxygen: CONFIG.oxygen.defaultValue
    },
    metricList: [],
    phDisplay: '7.2',
    tempDisplay: '24',
    oxygenDisplay: '6.8',
    score: 0,
    scoreText: '0',
    scoreColor: '#28c49a',
    qualityLabel: '水质良好',
    qualityNote: '水质状况良好，可正常使用',
    scoreRows: [],
    suggestions: [],
    showHistory: true,
    historyButtonText: '隐藏历史',
    historyRecords: [],
    themeClass: ''
  },

  sliderReady: false,
  areaWidth: 0,
  thumbWidth: 0,

  onLoad() {
    this.loadHistory()
    this.refresh()
  },

  onReady() {
    this.measureSlider()
    this.drawScoreRing()
  },

  measureSlider() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.slider-area').boundingClientRect()
    query.select('.boat-thumb').boundingClientRect()
    query.exec((res) => {
      if (res && res[0] && res[1]) {
        this.areaWidth = res[0].width
        this.thumbWidth = res[1].width
      }
      this.sliderReady = true
      this.refresh()
      if (this.data.showHistory && this.data.historyRecords.length) {
        this.drawHistoryChart()
      }
    })
  },

  onShow() {
    this.loadHistory()
    if (this.data.showHistory && this.data.historyRecords.length) {
      this.drawHistoryChart()
    }
    this.setData({
      themeClass: app.globalData.theme === 'dark' ? 'dark' : ''
    })
  },

  loadHistory() {
    try {
      const history = wx.getStorageSync(STORAGE_HISTORY) || []
      this.setData({ historyRecords: history })
    } catch (e) {
      console.error('loadHistory fail', e)
    }
  },

  onStep(event) {
    const key = event.currentTarget.dataset.key
    const step = Number(event.currentTarget.dataset.step)
    this.setMetric(key, this.data.values[key] + step)
  },

  onInputBlur(event) {
    const key = event.currentTarget.dataset.key
    this.setMetric(key, Number(event.detail.value))
  },

  onSliderMove(event) {
    if (!this.sliderReady) return
    if (event.detail.source !== 'touch') return
    const key = event.currentTarget.dataset.key
    const config = CONFIG[key]
    const maxX = Math.max(this.areaWidth - this.thumbWidth, 1)
    const percent = Math.min(Math.max(event.detail.x / maxX, 0), 1)
    const rawValue = config.min + (config.max - config.min) * percent
    const steppedValue = Math.round(rawValue / config.step) * config.step
    this.setMetric(key, steppedValue)
  },

  resetMetrics() {
    this.setData({
      values: {
        ph: CONFIG.ph.defaultValue,
        temp: CONFIG.temp.defaultValue,
        oxygen: CONFIG.oxygen.defaultValue
      }
    }, () => {
      this.refresh()
      wx.showToast({ title: '已重置', icon: 'success' })
    })
  },

  saveRecord() {
    const record = {
      id: Date.now(),
      timestamp: Date.now(),
      date: this.formatTime(new Date()),
      values: { ...this.data.values },
      score: this.data.score,
      qualityLabel: this.data.qualityLabel
    }
    try {
      let history = wx.getStorageSync(STORAGE_HISTORY) || []
      history.unshift(record)
      if (history.length > 20) history = history.slice(0, 20)
      wx.setStorageSync(STORAGE_HISTORY, history)
      this.setData({ historyRecords: history }, () => {
        if (this.data.showHistory) this.drawHistoryChart()
      })
      wx.showToast({ title: '记录已保存', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  toggleHistory() {
    const showHistory = !this.data.showHistory
    const historyButtonText = showHistory ? '隐藏历史' : '显示历史'
    this.setData({ showHistory, historyButtonText }, () => {
      if (showHistory && this.data.historyRecords.length) {
        this.drawHistoryChart()
      }
    })
  },

  clearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确定清空所有历史对比数据吗？',
      confirmColor: '#e2515d',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync(STORAGE_HISTORY)
          } catch (e) {}
          this.setData({ historyRecords: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  openMap() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.openLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          name: '当前采样点',
          address: '水质检测位置'
        })
      },
      fail: () => {
        wx.openLocation({
          latitude: 30.52,
          longitude: 114.36,
          name: '东湖 3 号采样点',
          address: '默认演示位置（可在真机使用定位）'
        })
      }
    })
  },

  generateReport() {
    const report = {
      id: Date.now(),
      createdAt: this.formatTime(new Date()),
      values: { ...this.data.values },
      score: this.data.score,
      scoreColor: this.data.scoreColor,
      qualityLabel: this.data.qualityLabel,
      qualityNote: this.data.qualityNote,
      scoreRows: this.data.scoreRows,
      suggestions: this.data.suggestions,
      historyCount: this.data.historyRecords.length
    }
    try {
      wx.setStorageSync(STORAGE_REPORT, report)
      let reports = wx.getStorageSync('water_reports') || []
      reports.unshift(report)
      if (reports.length > 50) reports = reports.slice(0, 50)
      wx.setStorageSync('water_reports', reports)
      wx.navigateTo({ url: '/pages/report/report' })
    } catch (e) {
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  setMetric(key, nextValue) {
    const config = CONFIG[key]
    const safeValue = Math.min(Math.max(Number(nextValue) || config.min, config.min), config.max)
    this.setData({
      [`values.${key}`]: Number(safeValue.toFixed(config.fixed))
    }, () => this.refresh())
  },

  refresh() {
    const values = this.data.values
    const maxX = Math.max(this.areaWidth - this.thumbWidth, 1)
    const metricList = Object.keys(CONFIG).map((key) => {
      const config = CONFIG[key]
      const value = values[key]
      const percent = ((value - config.min) / (config.max - config.min)) * 100
      return {
        key,
        label: config.label,
        min: config.min,
        maxLabel: config.maxLabel,
        step: config.step,
        minusStep: -config.step,
        display: value.toFixed(config.fixed),
        percent,
        x: maxX * percent / 100,
        color: this.metricColor(key, value)
      }
    })

    const scores = {
      ph: this.metricScore('ph', values.ph),
      temp: this.metricScore('temp', values.temp),
      oxygen: this.metricScore('oxygen', values.oxygen)
    }
    const score = Math.round((scores.ph + scores.temp + scores.oxygen) / 3)
    const scoreColor = score >= 85 ? '#28c49a' : score >= 70 ? '#f5b32f' : '#f05b65'

    this.setData({
      metricList,
      phDisplay: values.ph.toFixed(1),
      tempDisplay: values.temp.toFixed(0),
      oxygenDisplay: values.oxygen.toFixed(1),
      score,
      scoreText: String(score),
      scoreColor,
      qualityLabel: score >= 85 ? '水质良好' : score >= 70 ? '水质需关注' : '水质异常',
      qualityNote: score >= 85 ? '水质状况良好，可正常使用' : score >= 70 ? '部分指标接近边界，建议及时复测' : '存在异常指标，请优先处理高风险项目',
      scoreRows: [
        { label: 'pH值', score: scores.ph, color: this.scoreColor(scores.ph) },
        { label: '温度', score: scores.temp, color: this.scoreColor(scores.temp) },
        { label: '溶解氧', score: scores.oxygen, color: this.scoreColor(scores.oxygen) }
      ],
      suggestions: this.buildSuggestions(values)
    }, () => {
      this.drawScoreRing()
    })
  },

  drawScoreRing() {
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
        this.paintScoreRing(ctx, width, height, this.data.score, this.data.scoreColor, 112 / 156)
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

  metricColor(key, value) {
    if (key === 'ph') {
      if (value < 6.5) return '#f5b32f'
      if (value > 8.5) return '#f05b65'
      return '#2f91e8'
    }
    if (key === 'temp') {
      if (value < 18) return '#38bdf8'
      if (value > 30) return '#f05b65'
      return '#28c49a'
    }
    if (value < 5) return '#f05b65'
    if (value < 6) return '#f5b32f'
    return '#28c49a'
  },

  metricScore(key, value) {
    if (key === 'ph') {
      if (value >= 6.5 && value <= 8.5) return 100
      const distance = value < 6.5 ? 6.5 - value : value - 8.5
      return Math.max(20, Math.round(100 - distance * 24))
    }
    if (key === 'temp') {
      if (value >= 18 && value <= 30) return 100
      const distance = value < 18 ? 18 - value : value - 30
      return Math.max(25, Math.round(100 - distance * 7))
    }
    if (value >= 6) return 100
    if (value >= 5) return 75
    return Math.max(20, Math.round(value * 12))
  },

  scoreColor(score) {
    if (score >= 85) return '#28c49a'
    if (score >= 70) return '#f5b32f'
    return '#f05b65'
  },

  buildSuggestions(values) {
    const items = []
    if (values.ph < 6.5) items.push({ title: 'pH值偏低', level: '高优先级', text: `当前 pH ${values.ph.toFixed(1)} 偏酸，建议少量多次加入碱性调节剂，并在 30 分钟后复测。` })
    if (values.ph > 8.5) items.push({ title: 'pH值偏高', level: '高优先级', text: `当前 pH ${values.ph.toFixed(1)} 偏碱，建议添加酸性物质或换水稀释，并校准 pH 探头。` })
    if (values.temp < 18) items.push({ title: '温度偏低', level: '中优先级', text: `当前水温 ${values.temp.toFixed(0)}℃，建议减少投喂量，检查保温或加热设备。` })
    if (values.temp > 30) items.push({ title: '温度偏高', level: '中优先级', text: `当前水温 ${values.temp.toFixed(0)}℃，建议增加遮阴、补充新水，并避开正午检测。` })
    if (values.oxygen < 5) items.push({ title: '溶解氧不足', level: '高优先级', text: `当前溶解氧 ${values.oxygen.toFixed(1)} mg/L，建议立即开启增氧 60 分钟，减少投喂。` })
    if (values.oxygen >= 5 && values.oxygen < 6) items.push({ title: '溶解氧接近下限', level: '中优先级', text: `当前溶解氧 ${values.oxygen.toFixed(1)} mg/L，建议开启增氧 30 分钟，并在 2 小时后复测。` })
    if (!items.length) items.push({ title: '水质状态稳定', level: '观察', text: '当前 pH、温度、溶解氧均处于适宜范围，建议保持日常巡检，每 4 小时记录一次。' })
    return items
  },

  drawHistoryChart() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#historyChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return
        const { node: canvas, width, height } = res[0]
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = width * dpr
        canvas.height = height * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, width, height)

        const records = this.data.historyRecords.slice().reverse()
        if (!records.length) return

        const padding = { top: 24, right: 16, bottom: 32, left: 40 }
        const chartW = width - padding.left - padding.right
        const chartH = height - padding.top - padding.bottom

        // grid
        ctx.strokeStyle = '#e0eaf5'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
          const y = padding.top + (chartH / 4) * i
          ctx.beginPath()
          ctx.moveTo(padding.left, y)
          ctx.lineTo(padding.left + chartW, y)
          ctx.stroke()
          ctx.fillStyle = '#8da2b4'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText(String(100 - i * 25), padding.left - 6, y + 3)
        }

        // axes
        ctx.strokeStyle = '#b8cce0'
        ctx.beginPath()
        ctx.moveTo(padding.left, padding.top)
        ctx.lineTo(padding.left, padding.top + chartH)
        ctx.lineTo(padding.left + chartW, padding.top + chartH)
        ctx.stroke()

        // draw each metric
        const metrics = ['ph', 'temp', 'oxygen']
        metrics.forEach((key) => {
          const config = CONFIG[key]
          const color = config.color
          ctx.strokeStyle = color
          ctx.fillStyle = color
          ctx.lineWidth = 2
          ctx.beginPath()
          records.forEach((record, index) => {
            const x = padding.left + (chartW / Math.max(records.length - 1, 1)) * index
            const value = record.values[key]
            const normalized = (value - config.min) / (config.max - config.min)
            const y = padding.top + chartH - normalized * chartH
            if (index === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.stroke()
          records.forEach((record, index) => {
            const x = padding.left + (chartW / Math.max(records.length - 1, 1)) * index
            const value = record.values[key]
            const normalized = (value - config.min) / (config.max - config.min)
            const y = padding.top + chartH - normalized * chartH
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.fill()
          })
        })

        // x labels
        ctx.fillStyle = '#8da2b4'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        records.forEach((record, index) => {
          const x = padding.left + (chartW / Math.max(records.length - 1, 1)) * index
          const label = record.date.split(' ')[0].split('/').slice(1).join('/')
          ctx.fillText(label, x, padding.top + chartH + 14)
        })

        // legend
        let legendX = padding.left
        const legendY = 12
        metrics.forEach((key) => {
          const config = CONFIG[key]
          ctx.fillStyle = config.color
          ctx.beginPath()
          ctx.arc(legendX + 5, legendY, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#19304a'
          ctx.font = '11px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(config.label, legendX + 12, legendY + 4)
          legendX += 56
        })
      })
  },

  formatTime(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}/${m}/${d} ${h}:${min}`
  }
})
