const app = getApp()

Page({
  data: {
    status: '未连接',
    connected: false,
    deviceName: '水质检测设备',
    battery: 0,
    syncInterval: '每 5 分钟',
    nearbyCount: 3,
    pairedDevices: [],
    nearbyDevices: [],
    themeClass: ''
  },

  onShow() {
    const device = app.globalData.device
    this.setData({
      status: device.connected ? '已连接' : '未连接',
      connected: device.connected,
      deviceName: device.name || '水质检测设备',
      battery: device.battery || 0
    })
    this.loadPairedDevices()
    this.simulateNearbyDevices()
    this.setData({
      themeClass: app.globalData.theme === 'dark' ? 'dark' : ''
    })
  },

  loadPairedDevices() {
    const paired = wx.getStorageSync('water_paired_devices') || []
    this.setData({ pairedDevices: paired })
  },

  savePairedDevices() {
    wx.setStorageSync('water_paired_devices', this.data.pairedDevices)
  },

  simulateNearbyDevices() {
    const nearby = [
      { name: 'Water-BLE-01', rssi: -52 },
      { name: 'Water-BLE-02', rssi: -68 },
      { name: 'Aqua-Sensor-A3', rssi: -74 }
    ]
    this.setData({ nearbyDevices: nearby, nearbyCount: nearby.length })
  },

  addDevice() {
    wx.showActionSheet({
      itemList: ['扫码添加', '手动输入设备码'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.scanCode({
            success: (scanRes) => {
              this.registerDevice(scanRes.result || '扫码设备')
            },
            fail: () => {
              wx.showToast({ title: '扫码取消或失败', icon: 'none' })
            }
          })
        } else {
          wx.showModal({
            title: '添加设备',
            editable: true,
            placeholderText: '请输入设备名称或编码',
            success: (modalRes) => {
              if (modalRes.confirm && modalRes.content) {
                this.registerDevice(modalRes.content.trim())
              }
            }
          })
        }
      }
    })
  },

  registerDevice(name) {
    const device = { id: Date.now(), name, addTime: this.formatTime(new Date()) }
    const paired = this.data.pairedDevices
    if (paired.find((d) => d.name === name)) {
      wx.showToast({ title: '设备已存在', icon: 'none' })
      return
    }
    paired.unshift(device)
    this.setData({ pairedDevices: paired }, () => this.savePairedDevices())
    wx.showToast({ title: '添加成功', icon: 'success' })
  },

  toggleConnection() {
    if (this.data.connected) {
      this.disconnectDevice()
    } else {
      this.connectDevice()
    }
  },

  connectDevice() {
    if (this.data.connected) {
      wx.showToast({ title: '设备已连接', icon: 'none' })
      return
    }
    wx.showLoading({ title: '正在连接...' })
    this.setData({ status: '连接中' })

    // 尝试真实蓝牙，失败则进入演示模式
    this.tryRealBLEConnection()
      .then(() => {
        wx.hideLoading()
        this.onConnected('蓝牙水质检测设备')
      })
      .catch(() => {
        setTimeout(() => {
          wx.hideLoading()
          const name = this.data.pairedDevices[0]?.name || 'Water-BLE-01'
          this.onConnected(name)
        }, 1200)
      })
  },

  tryRealBLEConnection() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: () => {
          wx.startBluetoothDevicesDiscovery({
            success: () => {
              setTimeout(() => {
                wx.getBluetoothDevices({
                  success: (res) => {
                    const target = res.devices.find((d) => d.name && d.name.includes('Water'))
                    wx.stopBluetoothDevicesDiscovery()
                    if (target) {
                      wx.createBLEConnection({
                        deviceId: target.deviceId,
                        success: resolve,
                        fail: reject
                      })
                    } else {
                      reject(new Error('no device'))
                    }
                  },
                  fail: reject
                })
              }, 1500)
            },
            fail: reject
          })
        },
        fail: reject
      })
    })
  },

  onConnected(name) {
    const battery = Math.floor(Math.random() * 40) + 40
    this.setData({
      status: '已连接',
      connected: true,
      deviceName: name,
      battery,
      syncInterval: '实时同步'
    })
    app.globalData.device = { connected: true, name, battery }
    app.saveGlobalData()
    wx.showToast({ title: '连接成功', icon: 'success' })
  },

  disconnectDevice() {
    this.setData({
      status: '未连接',
      connected: false,
      battery: 0,
      syncInterval: '每 5 分钟'
    })
    app.globalData.device = { connected: false, name: '', battery: 0 }
    app.saveGlobalData()
    wx.showToast({ title: '已断开', icon: 'success' })
  },

  connectNearby(event) {
    const index = event.currentTarget.dataset.index
    const device = this.data.nearbyDevices[index]
    if (!device) return
    wx.showLoading({ title: '正在连接...' })
    setTimeout(() => {
      wx.hideLoading()
      this.onConnected(device.name)
    }, 1000)
  },

  removePaired(event) {
    const index = event.currentTarget.dataset.index
    wx.showModal({
      title: '移除设备',
      content: '确定移除该配对设备吗？',
      success: (res) => {
        if (res.confirm) {
          const paired = this.data.pairedDevices
          const removed = paired.splice(index, 1)[0]
          this.setData({ pairedDevices: paired }, () => {
            this.savePairedDevices()
            if (this.data.connected && this.data.deviceName === removed.name) {
              this.disconnectDevice()
            }
          })
        }
      }
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
