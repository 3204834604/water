const app = getApp()

Page({
  data: {
    themeLabel: '浅色',
    alert: true,
    sync: true,
    settings: [
      { icon: '色', title: '主题设置', desc: '浅色 / 深色 / 跟随系统', action: 'theme' },
      { icon: '设', title: '功能设置', desc: '提醒、单位、评分规则', action: 'function' },
      { icon: '数', title: '数据管理', desc: '导出、清理、云端备份', action: 'data' }
    ],
    themeClass: ''
  },

  onShow() {
    const themeMap = { light: '浅色', dark: '深色', auto: '跟随系统' }
    this.setData({
      themeLabel: themeMap[app.globalData.theme] || '浅色',
      alert: app.globalData.settings.alert,
      sync: app.globalData.settings.sync,
      themeClass: app.globalData.theme === 'dark' ? 'dark' : ''
    })
  },

  onSettingTap(event) {
    const action = event.currentTarget.dataset.action
    switch (action) {
      case 'theme':
        this.chooseTheme()
        break
      case 'function':
        this.openFunctionSettings()
        break
      case 'data':
        this.openDataManagement()
        break
    }
  },

  chooseTheme() {
    wx.showActionSheet({
      itemList: ['浅色', '深色', '跟随系统'],
      success: (res) => {
        const themes = ['light', 'dark', 'auto']
        const labels = ['浅色', '深色', '跟随系统']
        const theme = themes[res.tapIndex]
        app.globalData.theme = theme
        app.saveGlobalData()
        const effectiveDark = theme === 'dark'
        this.setData({ themeLabel: labels[res.tapIndex], themeClass: effectiveDark ? 'dark' : '' })
        app.applyTheme(effectiveDark ? 'dark' : 'light')
        wx.showToast({ title: '主题已切换', icon: 'success' })
      }
    })
  },

  openFunctionSettings() {
    wx.showActionSheet({
      itemList: ['温度单位', '评分规则', '检测提醒'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showActionSheet({
            itemList: ['摄氏度 ℃', '华氏度 ℉'],
            success: (r) => {
              app.globalData.settings.unit = r.tapIndex === 0 ? 'celsius' : 'fahrenheit'
              app.saveGlobalData()
              wx.showToast({ title: '单位已保存', icon: 'success' })
            }
          })
        } else if (res.tapIndex === 1) {
          wx.showActionSheet({
            itemList: ['标准规则', '严格规则'],
            success: (r) => {
              app.globalData.settings.scoring = r.tapIndex === 0 ? 'standard' : 'strict'
              app.saveGlobalData()
              wx.showToast({ title: '规则已保存', icon: 'success' })
            }
          })
        } else {
          wx.showModal({
            title: '检测提醒',
            content: '开启后每 4 小时提醒您检测水质',
            confirmText: '开启',
            success: (r) => {
              app.globalData.settings.reminder = r.confirm
              app.saveGlobalData()
              wx.showToast({ title: r.confirm ? '已开启' : '已取消', icon: 'none' })
            }
          })
        }
      }
    })
  },

  openDataManagement() {
    wx.showActionSheet({
      itemList: ['导出记录到剪贴板', '备份到云端（模拟）', '清理所有本地数据'],
      itemColor: '#19304a',
      success: (res) => {
        if (res.tapIndex === 0) {
          const records = wx.getStorageSync('water_history') || []
          const text = JSON.stringify(records, null, 2)
          wx.setClipboardData({
            data: text,
            success: () => wx.showToast({ title: '已复制', icon: 'success' })
          })
        } else if (res.tapIndex === 1) {
          wx.showLoading({ title: '备份中...' })
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({ title: '备份完成', icon: 'success' })
          }, 1200)
        } else {
          wx.showModal({
            title: '清理数据',
            content: '确定删除所有记录、报告、标记和设置吗？此操作不可恢复。',
            confirmColor: '#e2515d',
            success: (r) => {
              if (r.confirm) {
                wx.clearStorageSync()
                app.globalData = {
                  theme: 'light',
                  settings: { alert: true, sync: true, unit: 'celsius', scoring: 'standard' },
                  device: { connected: false, name: '', battery: 0 }
                }
                app.applyTheme('light')
                this.setData({ themeLabel: '浅色', alert: true, sync: true, themeClass: '' })
                wx.showToast({ title: '已清理', icon: 'success' })
              }
            }
          })
        }
      }
    })
  },

  onAlertChange(event) {
    const value = event.detail.value
    app.globalData.settings.alert = value
    app.saveGlobalData()
    this.setData({ alert: value })
  },

  onSyncChange(event) {
    const value = event.detail.value
    app.globalData.settings.sync = value
    app.saveGlobalData()
    this.setData({ sync: value })
  }
})
