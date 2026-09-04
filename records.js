const app = getApp()

Page({
  data: {
    records: [],
    themeClass: ''
  },

  onShow() {
    this.loadRecords()
    this.setData({
      themeClass: app.globalData.theme === 'dark' ? 'dark' : ''
    })
  },

  loadRecords() {
    const records = wx.getStorageSync('water_history') || []
    this.setData({ records })
  },

  clearAll() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空所有检测记录吗？',
      confirmColor: '#e2515d',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('water_history')
          this.setData({ records: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  }
})
