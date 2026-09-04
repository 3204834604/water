App({
  globalData: {
    theme: 'light',
    settings: {
      alert: true,
      sync: true,
      unit: 'celsius',
      scoring: 'standard'
    },
    device: {
      connected: false,
      name: '',
      battery: 0
    }
  },

  onLaunch() {
    this.loadGlobalData()
    this.applyTheme(this.globalData.theme)
  },

  loadGlobalData() {
    try {
      const theme = wx.getStorageSync('water_theme')
      if (theme) this.globalData.theme = theme
      const settings = wx.getStorageSync('water_settings')
      if (settings) this.globalData.settings = { ...this.globalData.settings, ...settings }
      const device = wx.getStorageSync('water_device')
      if (device) this.globalData.device = { ...this.globalData.device, ...device }
    } catch (e) {
      console.error('loadGlobalData fail', e)
    }
  },

  saveGlobalData() {
    try {
      wx.setStorageSync('water_theme', this.globalData.theme)
      wx.setStorageSync('water_settings', this.globalData.settings)
      wx.setStorageSync('water_device', this.globalData.device)
    } catch (e) {
      console.error('saveGlobalData fail', e)
    }
  },

  applyTheme(theme) {
    let isDark = theme === 'dark'
    if (theme === 'auto') {
      try {
        isDark = wx.getSystemInfoSync().theme === 'dark'
      } catch (e) {
        isDark = false
      }
    }
    const frontColor = isDark ? '#ffffff' : '#000000'
    const backgroundColor = isDark ? '#0d1b2a' : '#dff1ff'
    wx.setNavigationBarColor({ frontColor, backgroundColor })
    wx.setBackgroundColor({ backgroundColor })
  }
})
