const api = require('../../utils/api.js');
const config = require('../../config.js');

Page({
  data: {
    imagePath: '',
    result: null,
    recognizing: false,
    question: ''
  },

  onLoad() {
    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());
  },

  /** 获取图片（通用方法：优先 chooseMedia，降级 chooseImage） */
  getImage(sourceType) {
    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());

    const onSuccess = (tempPath) => {
      this.setData({
        imagePath: tempPath,
        result: null,
        question: ''
      });
    };
    const onFail = (err) => {
      const msg = err.errMsg || '';
      // 用户取消不提示
      if (msg.includes('cancel') || msg.includes('fail cancel')) return;
      // 降级到 wx.chooseImage（兼容低版本）
      if (msg.includes('chooseMedia:fail')) {
        console.warn('[AR] chooseMedia 失败，降级到 chooseImage');
        wx.chooseImage({
          count: 1,
          sourceType: [sourceType],
          success: (res) => onSuccess(res.tempFilePaths[0]),
          fail: (err2) => {
            if (!(err2.errMsg || '').includes('cancel')) {
              wx.showToast({ title: sourceType === 'camera' ? '拍照失败' : '选择失败', icon: 'none' });
            }
          }
        });
        return;
      }
      // 其他错误
      wx.showToast({ title: '获取图片失败', icon: 'none' });
    };

    try {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: [sourceType],
        camera: 'back',
        success: (res) => onSuccess(res.tempFiles[0].tempFilePath),
        fail: onFail
      });
    } catch (e) {
      // chooseMedia 方法不存在（极低版本），使用 chooseImage
      wx.chooseImage({
        count: 1,
        sourceType: [sourceType],
        success: (res) => onSuccess(res.tempFilePaths[0]),
        fail: () => {}
      });
    }
  },

  /** 拍照 */
  takePhoto() {
    this.getImage('camera');
  },

  /** 从相册选择 */
  chooseImage() {
    this.getImage('album');
  },

  /** 开始识别 */
  startRecognize() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先拍照或选择图片', icon: 'none' });
      return;
    }

    this.setData({ recognizing: true, result: null });

    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());

    api.recognizeVision(this.data.imagePath, this.data.question)
      .then(res => {
        if (res && res.code === 200 && res.data) {
          this.setData({
            result: res.data,
            recognizing: false
          });
        } else {
          this.handleRecognizeError();
        }
      })
      .catch(err => {
        console.error('[AR] 识别失败:', err);
        this.handleRecognizeError();
      });
  },

  /** 识别失败处理（使用本地 Mock） */
  handleRecognizeError() {
    wx.showToast({ title: '识别服务暂不可用', icon: 'none' });

    // Mock 识别结果
    const mockResults = [
      { object: '荷花', confidence: 0.94, description: '荷花是中国传统名花，出淤泥而不染，濯清涟而不妖。在景区内主要分布在「曲院风荷」，夏季 6-8 月为最佳观赏期。' },
      { object: '雷峰塔', confidence: 0.97, description: '雷峰塔始建于北宋太平兴国二年（977年），位于西湖风景区南岸夕照山上。传说《白蛇传》中白娘子被法海镇压于此塔下，使其闻名遐迩。' },
      { object: '苏堤', confidence: 0.95, description: '苏堤是北宋苏轼任杭州知州时疏浚西湖，利用挖出的淤泥构筑而成。堤长2797米，贯穿西湖南北，是西湖十景之首「苏堤春晓」所在地。' },
      { object: '古建筑', confidence: 0.88, description: '这是一处具有中国传统风格的建筑。景区内分布着大量宋、明、清时期的古建筑，展现了江南园林建筑的独特魅力。' },
    ];

    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    this.setData({ result, recognizing: false });
  },

  /** 重置图片 */
  resetImage() {
    this.setData({
      imagePath: '',
      result: null,
      question: ''
    });
  },

  /** 问题输入 */
  onQuestionInput(e) {
    this.setData({ question: e.detail.value });
  },

  /** 提问 */
  askQuestion() {
    if (!this.data.question.trim()) return;
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先拍照', icon: 'none' });
      return;
    }
    // 重新识别，带问题参数
    this.startRecognize();
  }
});