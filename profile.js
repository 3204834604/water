const app = getApp()

Page({
  data: {
    userName: '检测员用户',
    avatarUrl: '',
    stats: { count: 0, markers: 0 },
    menus: [
      { icon: '记', title: '查看检测记录', desc: '按日期、点位、水质等级筛选', action: 'records' },
      { icon: '位', title: '定位标记', desc: '保存采样位置并支持地图回看', action: 'location' },
      { icon: '报', title: '报告内容', desc: '检测结论、指标明细、改善建议', action: 'report' },
      { icon: '帮', title: '帮助反馈', desc: '常见问题、设备故障、意见提交', action: 'help' }
    ],
    themeClass: ''
  },

  onShow() {
    this.loadProfile()
    this.loadStats()
    this.setData({
      themeClass: app.globalData.theme === 'dark' ? 'dark' : ''
    })
  },

  loadProfile() {
    const profile = wx.getStorageSync('water_profile') || {}
    this.setData({
      userName: profile.userName || this.data.userName,
      avatarUrl: profile.avatarUrl || ''
    })
  },

  loadStats() {
    const records = wx.getStorageSync('water_history') || []
    const markers = wx.getStorageSync('water_markers') || []
    this.setData({
      'stats.count': records.length,
      'stats.markers': markers.length
    })
  },

  onUserCardTap() {
    wx.showActionSheet({
      itemList: ['修改昵称', '更换头像'],
      success: (res) => {
        if (res.tapIndex === 0) this.editName()
        if (res.tapIndex === 1) this.chooseAvatar()
      }
    })
  },

  editName() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim()
          if (!name) return
          this.setData({ userName: name })
          this.saveProfile({ userName: name })
          wx.showToast({ title: '修改成功', icon: 'success' })
        }
      }
    })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ avatarUrl: tempPath })
        this.saveProfile({ avatarUrl: tempPath })
        wx.showToast({ title: '头像已更新', icon: 'success' })
      }
    })
  },

  saveProfile(part) {
    const profile = wx.getStorageSync('water_profile') || {}
    wx.setStorageSync('water_profile', { ...profile, ...part })
  },

  onMenuTap(event) {
    const index = event.currentTarget.dataset.index
    const action = this.data.menus[index].action
    switch (action) {
      case 'records':
        wx.navigateTo({ url: '/pages/records/records' })
        break
      case 'location':
        wx.chooseLocation({
          success: (res) => {
            const marker = {
              name: res.name || '未命名采样点',
              address: res.address || '',
              latitude: res.latitude,
              longitude: res.longitude,
              time: this.formatTime(new Date())
            }
            let markers = wx.getStorageSync('water_markers') || []
            markers.unshift(marker)
            wx.setStorageSync('water_markers', markers)
            wx.showToast({ title: '标记已保存', icon: 'success' })
            this.loadStats()
          },
          fail: () => {
            wx.showToast({ title: '请授权位置权限', icon: 'none' })
          }
        })
        break
      case 'report':
        wx.navigateTo({ url: '/pages/report/report' })
        break
      case 'help':
        wx.showModal({
          title: '帮助反馈',
          editable: true,
          placeholderText: '请描述您遇到的问题或建议',
          success: (res) => {
            if (res.confirm && res.content) {
              wx.showToast({ title: '反馈已提交', icon: 'success' })
            }
          }
        })
        break
    }
  },

  openMap() {
    const markers = wx.getStorageSync('water_markers') || []
    if (markers.length) {
      const latest = markers[0]
      wx.openLocation({
        latitude: latest.latitude,
        longitude: latest.longitude,
        name: latest.name,
        address: latest.address
      })
    } else {
      wx.showToast({ title: '暂无定位标记', icon: 'none' })
    }
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
