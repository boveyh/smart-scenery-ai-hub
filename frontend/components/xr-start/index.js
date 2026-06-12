// components/xr-start/index.js
Component({
  properties: {
    tenantId: {
      type: String,
      value: 'west_lake'
    },
    // 是否可见（文本模式隐藏，数字人模式显示）
    visible: {
      type: Boolean,
      value: true
    },
    // 当前状态：idle / speaking
    animState: {
      type: String,
      value: 'idle',
      observer(newVal) {
        if (newVal === 'speaking') {
          this.playAnimation('speak');
        } else {
          this.playAnimation('idle');
        }
      }
    }
  },

  data: {
    modelLoaded: false,
    currentAnimation: null
  },

  lifetimes: {
    attached() {
      console.log('[XR] 组件已加载, 租户:', this.properties.tenantId);
    },
    ready() {
      // scene实例通过事件获取
    }
  },

  methods: {
    /** 场景准备就绪 */
    handleReady({ detail }) {
      const scene = detail.value;
      this.scene = scene;
      console.log('[XR] 场景已准备');
    },

    /** 资源加载完成 */
    handleAssetsLoaded({ detail }) {
      console.log('[XR] 资源加载完成');
      this.setData({ modelLoaded: true });
      this.triggerEvent('modelLoaded', { loaded: true });
      // 自动播放idle动画
      this.playAnimation('idle');
    },

    /** 模型点击 */
    handleModelTap({ detail }) {
      const { target } = detail.value;
      this.triggerEvent('modelTap', {
        modelId: target.id || 'avatar',
        type: 'click'
      });
    },

    /** 播放动画 */
    playAnimation(animationName) {
      if (!this.scene) return;
      try {
        const modelNode = this.scene.getElementById('avatarModel');
        if (modelNode && modelNode.anim) {
          modelNode.anim.play(animationName);
          this.setData({ currentAnimation: animationName });
          this.triggerEvent('animationStart', { animation: animationName });
        }
      } catch (e) {
        console.error('[XR] 动画播放失败:', e);
      }
    },

    /** 切换数字人模式显示/隐藏 */
    switchMode(mode) {
      if (mode === 'digital_human') {
        this.setData({ visible: true });
        this.playAnimation('idle');
      } else {
        this.setData({ visible: false });
        if (this.scene) {
          try {
            const modelNode = this.scene.getElementById('avatarModel');
            if (modelNode && modelNode.anim) modelNode.anim.stop();
          } catch (e) { /* ignore */ }
        }
      }
    },

    /** 世界坐标转屏幕坐标 */
    getScreenPosition(worldPos) {
      if (!this.scene) return null;
      try {
        const xrSystem = wx.getXrFrameSystem();
        const cameraComp = this.camera?.getComponent(xrSystem.Camera);
        if (!cameraComp) return null;
        const clipPos = cameraComp.convertWorldPositionToClip(worldPos);
        const { frameWidth, frameHeight } = this.scene;
        return {
          x: ((clipPos.x + 1) / 2) * frameWidth,
          y: (1 - (clipPos.y + 1) / 2) * frameHeight
        };
      } catch (e) {
        return null;
      }
    }
  }
});
