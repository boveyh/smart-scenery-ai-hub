Page({
  data: {
    width: 375,
    height: 600,
    renderWidth: 375,
    renderHeight: 600,
  },
  onLoad() {
    const info = wx.getSystemInfoSync();
    const width = info.windowWidth;
    const height = info.windowHeight;
    const dpi = info.pixelRatio;
    this.setData({
      width, height,
      renderWidth: width * dpi,
      renderHeight: height * dpi
    });
  },
})