# 岭南寻物 · 粤语园林图纸

一个纯前端的粤语词汇小游戏。在一张岭南园林图纸上按纸条找词、撕下来、听粤语发音；撕到一半会被"扯进图纸"，以第一人称走进 3D 园林，把剩下的词找齐。

- **第一幕**：`garden-map.html`，2D 图纸，点击撕纸找词。
- **第二幕**：`garden.html`，3D 园林（Three.js），第一人称寻物。也可以单独打开，找齐全部 12 个词。

## 运行

静态网页，无构建步骤。直接打开 `garden-map.html` 即可（本地双击也能玩），或用任意静态服务器：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000/garden-map.html
```

## 操作

- 第一幕：点击图纸上纸条写着的东西；提示 / 再嚟一铺 / 读音开关在右侧纸条。
- 第二幕：`WASD` 行走、`Shift` 快行、鼠标转视角、`E` 拾起 / 定睛、`Q` 提示、`R` 再嚟一铺、`V` 读音开关。

## 数据与素材

- 词条与真人粤语发音：[DimSum AI 粤语语料库](https://search.aidimsum.com/docs)（现代粤语词典）。
- 材质：[Poly Haven](https://polyhaven.com)（CC0）。
- 字体：Ma Shan Zheng、Zhi Mang Xing（Google Fonts，OFL）；粤语补字用霞鹜文楷 TC（OFL，截取后内嵌）。
- 3D：[Three.js](https://threejs.org) r149（MIT）。
