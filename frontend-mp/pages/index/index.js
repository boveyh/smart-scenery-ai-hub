Page({
  onLoad() {
    console.log('index loaded');
  },
  gotoChat() {
    wx.navigateTo({ url: '/pages/chat/chat' });
  }
});