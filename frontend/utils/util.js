/**
 * 智慧景区导览系统 - 工具函数
 */

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 生成 UUID v4
 * @returns {string} UUID字符串
 */
function generateUUID() {
  const hex = '0123456789abcdef'
  let uuid = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-'
    } else if (i === 14) {
      uuid += '4'
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8]
    } else {
      uuid += hex[(Math.random() * 16) | 0]
    }
  }
  return uuid
}

/**
 * 获取当前毫秒级时间戳
 * @returns {number}
 */
function now() {
  return Date.now()
}

/**
 * 停止并销毁音频上下文
 */
function destroyAudio(ctx) {
  if (ctx) {
    try { ctx.stop() } catch (e) { /* ignore */ }
    try { ctx.destroy() } catch (e) { /* ignore */ }
  }
}

module.exports = {
  formatTime,
  generateUUID,
  now,
  destroyAudio
}
