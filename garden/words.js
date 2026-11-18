/* 岭南寻物 · 词条（两幕共用）
   快照取自 DimSum AI 粤语语料库（现代粤语词典 · yywj2，均带真人粤语发音）：
   GET https://backend.aidimsum.com/v2/corpus_item?data=<词>
   第一幕启动时会再实时查一次，网络唔通就用呢份。 */
window.GARDEN_WORDS = {
  '瓦公仔': { jp: 'ngaa5 gung1 zai2', mean: '老式房屋的屋脊上安放的陶制小人、小兽。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/03965%E7%93%A6%E5%85%AC%E4%BB%94.wav' },
  '大葵扇': { jp: 'daai6 kwai4 sin3', mean: '媒人：佢系我哋嘅～［他是我们的媒人］。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/02116%E5%A4%A7%E8%91%B5%E6%89%87.wav' },
  '一只屐': { jp: 'jat1 zek3 kek6', mean: '垂头丧气：因乜事～噉［干嘛垂头丧气的样子］？', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/04378%E4%B8%80%E5%8F%AA%E5%B1%90.wav' },
  '饮早茶': { jp: 'jam2 zou2 caa4', mean: '喝早茶。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/04398%E9%A5%AE%E6%97%A9%E8%8C%B6.wav' },
  '油纸遮': { jp: 'jau4 zi2 ze1', mean: '油纸伞。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/04431%E6%B2%B9%E7%BA%B8%E9%81%AE.wav' },
  '太师椅': { jp: 'taai3 si1 ji2', mean: '旧式木椅，有靠背和扶手。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/03860%E5%A4%AA%E5%B8%88%E6%A4%85.wav' },
  '担凳仔': { jp: 'daam1 dang3 zai2', mean: '搬小凳子：～，听古仔［搬小板凳，听故事］。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/02175%E6%8B%85%E5%87%B3%E4%BB%94.wav' },
  '树仔头': { jp: 'syu6 zai2 tau4', mean: '制作盆景的小树根。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/03757%E6%A0%91%E4%BB%94%E5%A4%B4.wav' },
  '龙牙蕉': { jp: 'lung4 ngaa4 ziu1', mean: '芭蕉的一种，皮薄，肉丰满，味香甜。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/03072%E9%BE%99%E7%89%99%E8%95%89.wav' },
  '花阶砖': { jp: 'faa1 gaai1 zyun1', mean: '用来铺地面的花瓷砖。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/02644%E8%8A%B1%E9%98%B6%E7%A0%96.wav' },
  '瓦檐口': { jp: 'ngaa5 jim4 hau2', mean: '屋檐下。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/03966%E7%93%A6%E6%AA%90%E5%8F%A3.wav' },
  '琉璃瓦': { jp: 'lau4 lei4 ngaa5', mean: '表面用琉璃烧制的瓦片。', audio: 'https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/yywj/03053%E7%90%89%E7%92%83%E7%93%A6.wav' },
};
// 大件：头几样撕得郁；撕咗三样之后再撕佢哋，就会撕唔落、被扯入图纸
window.GARDEN_BIG = ['花阶砖', '瓦檐口', '琉璃瓦'];
// 入咗园之后嘅文字线索
window.GARDEN_HINT3D = {
  '瓦公仔': '企喺主厅前面，抬头望屋脊顶',
  '大葵扇': '大榕树树头，挨住树干嘅南边',
  '一只屐': '锦鲤池东边伸出水面嘅石埠头',
  '饮早茶': '大榕树下张石凳，有蒸笼冒烟',
  '油纸遮': '池边方亭门口，摊开咗晒紧',
  '太师椅': '主厅廊下，两扇满洲窗中间',
  '担凳仔': '大榕树下，石凳旁边',
  '树仔头': '主厅阶前花阶砖西边，石座顶',
  '龙牙蕉': '方亭后面嗰丛芭蕉，有串蕉吊住',
  '花阶砖': '行上主厅前嘅花砖地，低头睇',
  '瓦檐口': '行入主厅廊下，抬头望屋檐',
  '琉璃瓦': '望住主厅屋檐嗰排绿色瓦当',
};
