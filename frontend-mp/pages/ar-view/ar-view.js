// ar-view.js
import * as THREE from '../../libs/three.js';  // 需自行引入 three 库
Page({
  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#webgl').node().exec((res) => {
      const canvas = res[0].node;
      const renderer = new THREE.WebGLRenderer({ canvas });
      // 编写固定场景，相机，加载一个预置模型（苏堤建筑.glb）
      // 具体代码略（与普通 Three.js 一致）
    });
  }
});