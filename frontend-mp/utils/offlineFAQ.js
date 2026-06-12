let faqMap = {};
function set(data) { faqMap = data; }
function setDefault(defaultMap) { faqMap = defaultMap; }
function getAnswer(question) {
  for (let key in faqMap) {
    if (question.includes(key)) return faqMap[key];
  }
  return "暂时无法回答，请检查网络后重试。";
}
module.exports = { set, setDefault, getAnswer };