import React, { useState, useRef } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getPoiWebp } from '@/map/lingshanAssets';

const POI_IDS = ['LS-001','LS-002','LS-003','LS-004','LS-005','LS-006','LS-007','LS-008','LS-009','LS-010','LS-011','LS-012','LS-013','LS-014','LS-015','LS-016'];

const ALL_POIS_DATA: Record<string, any> = {
  'LS-001':{name:'灵山大照壁',category:'历史文化',description:'被誉为"华夏第一壁"，赵朴初题写"湖光万顷净琉璃"。',detail:'进入无锡灵山胜境，首先映入眼帘的是气势恢宏，被誉为"华夏第一壁"的灵山大照壁。照壁正面是原政协副主席、中国佛教协会会长赵朴初先生题写的"湖光万顷净琉璃"诗句。赵老认为灵山胜境与太湖相互辉映，好似佛教中的琉璃世界。在照壁的北立面，刻有赵老所写的一首诗《小灵山》："昔游天竺访灵鹫，叹息空荒忆法华；不意鹫峰飞到此，天花烂漫散吾家"。1997年赵朴初老先生考察灵山胜境，看到灵山大佛庄严慈祥，香火鼎盛，欣然提笔写下了这首诗。照壁采用优质青石雕刻，长39.8米高7米。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'适合打卡合影、拍摄湖光壁影同框美景'},
  'LS-002':{name:'五明桥',category:'历史文化',description:'五座汉白玉石拱桥，象征佛教声明、因明等五种智慧。',detail:'五明桥是灵山胜境的第一道标志性景观，坐落于大照壁后方的玉带河上，由五座并列的汉白玉三孔石桥组成，形制庄重典雅，效仿金水桥规制建造，纯白的汉白玉栏杆尽显肃穆圣洁，是游客进入灵山核心景区的必经之路。桥名源自佛教"五明"智慧体系，"明"即智慧与学问，寓意大乘佛教入世修行、广学博览、济世度人的理念。五座桥梁自东向西依次对应五门学问：声明为语言文字之学，因明为逻辑思辨之学，居中的内明为核心佛学智慧，医方明为医药养生之学，工巧明涵盖技艺科技。走过五明桥，寓意摒弃浮躁、勤学修心、增益智慧。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放免费通行',tips:'过桥寓意开启智慧走向觉悟'},
  'LS-003':{name:'佛足坛',category:'佛教文化',description:'佛祖真身足印青铜铸造，刻有32种吉祥瑞相。',detail:'佛足坛坐落于灵山胜境进门的朝圣道路上，是进入景区后一处极具历史底蕴的佛教景观。相传释迦牟尼涅槃前夕在印度摩揭陀国留下足印，并告诉弟子见足印如同见到自己。唐代玄奘法师西天取经时，临摹佛足图样带回中原，灵山佛足坛便依照这份古老摹本复刻而成。坛内佛足印长1.2米，宽0.6米，足底平整饱满，五趾齐平，脚底雕刻法轮、万字符等吉祥纹样。佛祖一生游历各地弘法五十余年，佛足象征脚踏实地、坚持不懈、勤勉精进的修行精神。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'可亲手触摸足心吉祥图案寄托祈福心愿'},
  'LS-004':{name:'五智门',category:'历史文化',description:'高15.5m宽38.4m花岗岩石牌楼，五门六柱象征五方五佛与六度波罗蜜。',detail:'灵山胜境标志性建筑五智门，是一座体量宏大的花岗岩石牌楼，整座建筑耗用一千余吨石材，高15.5米，全长38.4米，石柱由整块花岗岩雕琢而成，雕刻做工精湛。五智门和五明桥前后呼应。五明代表学习世间各类学问，通过潜心修行最终修成五种圆满智慧，这便是"五智"的由来。牌楼正反面镌刻着佛教修行的六种准则"六度"，正面为布施、持戒、忍辱，背面是精进、禅定、般若。门柱上雕刻石狮，寓意佛法弘传四方。穿过五智门，放下杂念，走向觉悟之路。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'夜间有灯光点缀，是进入核心景区的标志性门户'},
  'LS-005':{name:'菩提大道',category:'自然风光',description:'长约200米，两侧216棵银杏树，寓意褪去烦恼走向觉悟。',detail:'菩提大道是前往灵山大佛的必经之路。道路全长200多米，路面平整开阔，道路两侧整齐栽种着高大的银杏树。菩提本意是觉悟，相传释迦牟尼在菩提树下悟道成佛。两旁一共栽种216棵银杏树，暗含佛教修行寓意——216代表一百零八烦恼的两倍，走过这里寓意褪去俗世烦忧。大道地面铺设七朵莲花图案，对应佛教七宝，象征清净安然。漫步大道之上，抬头远望便能看到灵山大佛矗立在前方山间。大道两旁设有古朴石灯，环境清幽肃穆。',avgStayMin:20,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'四季景致各异，春季赏银杏花夏季避暑秋季观落叶'},
  'LS-006':{name:'九龙灌浴',category:'佛教文化',description:'国内最大音乐动态青铜群雕，表演时莲花绽放九龙喷水。',detail:'灵山胜境闻名中外的九龙灌浴是国内规模最大的音乐动态青铜雕塑群。雕塑依托《佛本行经》里释迦牟尼降生的故事打造，整座雕塑耗费大量青铜铸造，7.2米高的鎏金太子佛像置于巨型莲花当中，外围环绕九条青铜巨龙。相传悉达多太子降生后，向四方各走七步，步步生莲，一手指天、一手指地说出"天上天下，唯吾独尊"，这时九条神龙从天而降喷洒圣水为太子沐浴。每当《佛之诞》梵乐响起，巨大的莲花花瓣缓缓打开，太子佛像慢慢升起，九条巨龙同时喷出数十米高的水柱，场面十分壮观。表演结束，周围凤凰雕塑流出八功德水，游客可接取圣水。',avgStayMin:25,crowdedness:4,ticketPrice:0,openingInfo:'场次10:00/11:30/13:30/15:00',tips:'建议提前10分钟到场，表演后可接取祈福圣水'},
  'LS-007':{name:'降魔浮雕',category:'佛教文化',description:'花岗岩浮雕再现佛陀战胜魔王波旬觉悟成佛的历程。',detail:'降魔浮雕坐落于前往大佛的山道石壁之上，体量宏大，是灵山极具代表性的石刻作品。浮雕讲述释迦牟尼成佛之前，在菩提树下潜心苦修，魔王派出魔女、魔兵前来诱惑恐吓佛陀的故事。画面里魔王率领众妖百般扰乱，美色、财富和威逼轮番袭来，但是佛陀端坐不动，心神安定。最终魔王大军溃败，佛祖战胜心魔修成正果。整幅浮雕构图生动细致，人物神态刻画逼真，佛陀神态从容淡然，妖魔神态张狂，二者形成鲜明对比。作品告诉世人，真正的敌人不在外界，而是自己内心的贪欲、嫉妒与浮躁。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'雕刻细节极为丰富，建议细细品味'},
  'LS-008':{name:'阿育王柱',category:'历史文化',description:'高16.9米重200多吨整块花岗岩雕成，四狮柱头，季羡林题字。',detail:'眼前巍峨耸立的石柱便是灵山著名的阿育王柱，它处在朝拜大佛的中轴线之上，被誉为"中国第一石柱"。石柱选用福建整块花岗岩手工雕琢而成，高16.9米，直径1.8米，重量达200多吨。柱身的汉字与梵文由国学大师季羡林亲笔题写。阿育王柱源自古印度，孔雀王朝的阿育王早年常年征战，晚年幡然醒悟皈依佛门，广立石柱镌刻劝善经文。柱顶四只雄狮面朝东西南北四方，寓意佛法广传天下。石柱背后刻着"诸恶莫做，众善奉行"，劝诫游客摒弃私心，多行善事。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'与灵山大佛、五智门形成中轴线核心景观序列'},
  'LS-009':{name:'百子戏弥勒',category:'休闲娱乐',description:'重9吨青铜群雕，弥勒佛卧姿笑容满面，百名孩童形态各异。',detail:'百子戏弥勒坐落于阿育王柱广场旁，是工艺美术大师朱炳仁创作的青铜雕塑，全长8.5米，重达9吨。斜倚而卧的弥勒佛体态丰满，笑容慈祥，左手攥着佛珠，周身一百个顽童形态鲜活生动。孩子们有的叠罗汉、拔河，有的调皮地捅弥勒肚脐、扯他的耳朵，尽情嬉戏打闹，可弥勒始终安然豁达，从容淡然。百子代表子孙绵延、福气兴旺。顽童肆意嬉戏，意在考验弥勒的胸襟，生动诠释了"大肚能容，容天下难容之事；笑口常开，笑世间可笑之人"的哲理。',avgStayMin:15,crowdedness:3,ticketPrice:0,openingInfo:'全天开放',tips:'可触摸弥勒佛肚皮，寓意"摸弥勒肚皮，享一生福气"'},
  'LS-010':{name:'祥符禅寺',category:'佛教文化',description:'唐贞观年间千年古刹，玄奘弟子开坛讲经，悬挂12.8吨祥符禅钟。',detail:'祥符禅寺坐落于秦履峰半山腰，背靠灵山大佛，是灵山胜境的核心古刹，也是灵山大佛修建的缘起之地。寺院始建于唐代贞观年间，唐朝名将杭恽邀请取经归来的玄奘法师游览此地，玄奘见这里山形清幽酷似西天灵鹫山，将此地取名小灵山。寺院最初叫小灵山寺，北宋祥符年间宋真宗赐名祥符禅院。古寺历经千年战火损毁，如今殿宇为后期重修。寺院依照宋代样式修建，沿中轴线排布天王殿、钟鼓楼、大雄宝殿等建筑。钟楼里安放重达12.8吨的祥符禅钟，被称作江南第一钟。院内安放一尊青铜佛像，和山顶灵山大佛造型一致，远近佛像相映。',avgStayMin:30,crowdedness:3,ticketPrice:0,openingInfo:'全天开放',tips:'钟楼定时有钟声表演，千年古银杏秋季金黄铺满寺院'},
  'LS-011':{name:'灵山大佛',category:'佛教文化',description:'通高88米用铜725吨，世界最高露天青铜释迦牟尼立像。',detail:'灵山大佛屹立在无锡马山秦履峰南侧，因唐代玄奘法师将此地取名小灵山而得名。佛像1997年正式开光，通高88米，佛体79米，莲花座9米，连同基座总高101.5米，共用725吨青铜板材拼接而成，建成后补齐中国东、南、西、北、中五方大佛的布局。大佛严格依照佛经里佛陀三十二相打造，右手结施无畏印，寓意帮世人消除烦恼苦难；左手结与愿印，祝愿大家心想事成。雕塑运用独特透视技法，无论游客站在哪个方位，都会感觉大佛目光慈祥地注视着自己。佛像结构坚固，可以抵御八级地震和十四级台风，是传统佛学文化与现代工程技术结合的典范。',avgStayMin:45,crowdedness:4,ticketPrice:210,openingInfo:'8:00-17:00',tips:'登顶抱佛脚俯瞰太湖全景，夕阳西下时佛光普照最美'},
  'LS-012':{name:'佛教文化博览馆',category:'历史文化',description:'大佛基座内10000㎡，三层展厅系统讲解佛教发展历程。',detail:'佛教文化博览馆坐落于灵山大佛基座内部，展馆占地一万平方米，分为三层展厅，游客去往佛脚平台必经此处。展馆依托实物展品、图文资料与多媒体设备，系统讲解佛教发展历程。以五方五佛、四大佛山、汉传、藏传、南传三大佛教体系为展览主线，梳理佛教从古印度传入中国后的发展脉络。馆内镇馆之宝为汉代金丝楠木雕刻的五百罗汉堂，木雕纹路古朴自然，罗汉神态各不相同。展厅还介绍中外佛教文化交流历程，展现佛学思想对文学、建筑、民俗产生的深远影响。',avgStayMin:40,crowdedness:2,ticketPrice:0,openingInfo:'8:00-17:00',tips:'免费讲解时段9:30/11:00/14:30/16:00，可领取祈福卡'},
  'LS-013':{name:'灵山梵宫',category:'佛教文化',description:'72000㎡东方卢浮宫，世界佛教论坛会址，汇集非遗艺术瑰宝。',detail:'灵山梵宫毗邻灵山大佛，建成于2008年，是第二届世界佛教论坛的主会场，享有"东方卢浮宫"的美誉。整座建筑占地72000平方米，顶部五座金色华塔对应五方五佛，外观借鉴石窟寺院风格。梵宫内部汇聚东阳木雕、敦煌壁画、琉璃工艺、寿山石雕等众多非遗艺术瑰宝。65米高的巨型穹顶搭配光纤灯光，做到"见光不见灯"；巨型琉璃作品《华藏世界》为镇馆之宝，色彩绚烂寓意佛法包罗万象；廊厅内飞天浮雕、金丝楠木雕刻做工精妙。圣坛里的《吉祥颂》演出借助光影特效，再现悉达多太子舍弃荣华、悟道成佛的故事。梵宫将佛法文化与传统艺术相融，是展示中华佛教文化的殿堂。',avgStayMin:60,crowdedness:4,ticketPrice:0,openingInfo:'9:00-17:00',tips:'《灵山吉祥颂》演出每日10:35/11:30/14:00/16:00'},
  'LS-014':{name:'五印坛城',category:'佛教文化',description:'藏传佛教建筑，红白墙体鎏金屋顶，转经筒祈福。',detail:'五印坛城坐落于香水海中央，毗邻灵山梵宫，是灵山胜境里极具代表性的藏传佛教建筑。"五印"指释迦五印，分别为施无畏印、与愿印、说法印、触地印、禅定印；坛城代表诸佛汇聚的理想道场。建筑占地8000平方米，高31.55米，整体共六层，仿照西藏扎耶巴寺修建。外观红白墙体搭配鎏金屋顶，经幡环绕，庄重华丽。内部汇集唐卡、藏式壁画、木雕、镀金等传统工艺。游客可以转动玛尼经筒、点燃酥油灯，近距离感受藏地民俗文化。登上坛城观景平台，灵山大佛和梵宫全景尽收眼底。',avgStayMin:30,crowdedness:3,ticketPrice:0,openingInfo:'9:00-17:00',tips:'藏香制作体验需预约，10:00和14:00各一场，登顶观全景'},
  'LS-015':{name:'曼飞龙塔',category:'佛教文化',description:'南传佛教九塔组合白塔，复刻西双版纳曼飞龙白塔。',detail:'曼飞龙塔坐落在灵山梵宫东南侧的香水海旁边，复刻云南西双版纳曼飞龙白塔，是灵山胜境中南传佛教的标志性建筑。傣语称它为"笋塔"，塔身洁白，整座塔为金刚宝座式群塔，由一座主塔搭配八座小塔构成，建在圆形须弥基座之上。相传古时释迦牟尼来到西双版纳留下佛足印，后人修建曼飞龙塔用来供奉纪念。塔身雕刻佛像、凤凰浮雕，每座小塔都设有佛龛；塔顶装有华盖和风铃，清风吹过铃声悠悠。整体外形好似破土而出的春笋。灵山大佛代表汉传佛教，五印坛城展现藏传佛教，曼飞龙塔代表南传佛教，三处建筑齐聚于此，完整展示三大佛教派系的文化风采。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'夜间有灯光亮化，塔身轮廓被点亮夜景绝美'},
  'LS-016':{name:'无尽意斋',category:'历史文化',description:'赵朴初纪念馆，京式四合院复刻故居，免费禅茶品鉴。',detail:'无尽意斋坐落于灵山大佛西侧，是为纪念赵朴初先生修建的纪念馆。它仿照赵朴初北京南小栓一号故居打造，是原汁原味的京式四合院，占地600多平方米，2004年正式对外开放。"无尽意"源自佛经里的无尽意菩萨，代表悲愿绵长、济世无尽，也是赵朴初先生的书斋名号。整座庭院采用北京运来的砖木材料修建，院内设有无尽意馆、书房、佛堂和会客厅，院中安放赵朴初先生塑像。展厅陈列着珍贵照片、书法作品、文稿遗物，记录了他推动灵山大佛修建、复兴国内佛教的经历。院内禅意茶室免费提供灵山禅茶品鉴。身处清幽的院落，抬头便能望见灵山大佛。',avgStayMin:20,crowdedness:1,ticketPrice:0,openingInfo:'9:00-17:00',tips:'免费禅茶品鉴，禁止触摸书法作品和闪光灯拍照'},
};

const POI_EXTENDED: Record<string, { story: string; highlights: string[]; visit: string }> = {
  'LS-001': { story: '这里是灵山胜境游线的序章。大照壁作为游客进入灵山后看到的第一座大型构筑物，起到"欲扬先抑"的景观引导作用——绕过照壁后视野骤然开阔，香水海、五明桥依次展开，正式开启灵山的佛教文化之旅。', highlights: ['赵朴初题写"灵山胜境"', '适合拍摄景区入口纪念照'], visit: '建议入园后先在照壁前停留5到10分钟，拍摄湖光壁影同框照片，然后沿中轴线向北前行。' },
  'LS-002': { story: '五明桥把游客从入口区引向佛教文化主轴，是进入核心景区的第一道仪式性桥梁。五座桥分别对应五种智慧，过桥寓意从世俗学识逐步进入佛法智慧，是"由外而内"的过渡。', highlights: ['五座汉白玉桥并列', '香水海水面开阔'], visit: '桥面平缓，适合慢行观景，过桥时可留意每座桥对应的智慧含义。' },
  'LS-003': { story: '佛足坛以佛足印作为礼敬对象，把"佛"的概念具象化。玄奘西行带回佛足图样，体现了中印佛教文化交流的历史渊源。佛足印的32种吉祥图案也展示了佛教艺术的符号系统。', highlights: ['青铜佛足印', '祈福互动感强'], visit: '可顺路衔接菩提大道，停留约10分钟即可。' },
  'LS-004': { story: '五智门是进入核心礼佛区的重要门户。作为连接"学"与"修"的标志性节点，五智门寓意通过五种智慧的修行最终达到觉悟。牌楼上的"六度"准则既是佛教修行指南，也蕴含普遍的人生哲理。', highlights: ['汉白玉牌坊造型', '中轴线仪式感'], visit: '适合站在门前中轴位置拍摄全景，然后沿中轴线继续北行。' },
  'LS-005': { story: '菩提大道用树阵和步道构成过渡空间，引导游客在行进中静心。银杏树的四季变化丰富了景区的自然景观层次，而216棵银杏暗合108烦恼的两倍，增添了文化寓意。', highlights: ['约250米禅意步道', '四季景致变化'], visit: '建议放慢脚步游览，感受道路两旁的景观层次变化。' },
  'LS-006': { story: '九龙灌浴是灵山最具动态效果的景观之一，以音乐喷泉结合佛教故事的形式呈现，是景区吸引游客停留和拍照的核心节点。表演利用水体、音乐、雕塑的融合，把宗教故事转化为感官体验，增强了游客的情感共鸣。', highlights: ['定时动态表演', '可接取祈福圣水'], visit: '表演前10到15分钟到场选好位置，结束后可在两侧接取祈福圣水。' },
  'LS-007': { story: '降魔浮雕把成道故事浓缩在石刻中，是灵山中轴线上重要的文化解读点。佛陀降伏心魔的故事具有超越宗教的心理隐喻——每个人都需要面对和超越内心的贪欲与恐惧。', highlights: ['花岗岩大型浮雕', '雕刻细节丰富'], visit: '适合边走边看，留意佛陀神态与妖魔神态的对比。' },
  'LS-008': { story: '阿育王柱借鉴古印度佛教传播符号，把"中国第一石柱"这个概念与灵山中轴线结合，强化了场地的历史纵深感和佛教文化传承的连续性。季羡林题写的梵文汉字增加了学术属性。', highlights: ['整块花岗岩雕成', '四狮柱头'], visit: '可与五智门、灵山大佛连成一组拍摄中轴线全景。' },
  'LS-009': { story: '百子戏弥勒以欢喜、亲近为主题，把庄重的佛教氛围与日常生活趣事结合起来，属于"人间佛教"理念的体现。弥勒佛的"大肚能容"形象在民间广为流传，作品拉近了佛教文化与普通游客的心理距离。', highlights: ['弥勒佛卧姿群雕', '适合亲子拍照'], visit: '拍照后继续前往祥符禅寺方向，全程约15分钟。' },
  'LS-010': { story: '祥符禅寺承接小灵山古刹传统，把灵山胜境的佛教渊源从现代拉回到唐代。玄奘法师命名"小灵山"的典故是灵山胜境的根基故事，也是理解整个景区文化脉络的关键节点。', highlights: ['唐代古刹传承', '祥符禅钟'], visit: '入寺保持安静，可撞钟祈福，体验千年古刹的宁静氛围。' },
  'LS-011': { story: '灵山大佛是景区精神核心和视觉焦点，也是游客前往灵山的主要动机。大佛以体量、高度和精湛工艺形成强烈视觉冲击，填补了中国五方五佛的布局空缺。无论从哪个角度看，都能看见大佛慈祥的面容。', highlights: ['88米露天青铜大佛', '抱佛脚体验'], visit: '体力允许可登顶抱佛脚，俯瞰太湖全景。建议上午顺光时参观，拍照效果最佳。' },
  'LS-012': { story: '佛教文化博览馆位于大佛座基内，借用了游客登顶抱佛脚的必经路线天然流量，把单向的"抱佛脚"体验扩展为双向的"登高 + 观展"组合体验，延长了游客在大佛基座区的停留时间。', highlights: ['大佛座基展馆', '万佛殿'], visit: '雨天或高温时适合安排较长停留，馆内有空调。免费讲解时段约30分钟。' },
  'LS-013': { story: '灵山梵宫以宏大建筑展示佛教艺术，是灵山二期和三期工程的核心，集中体现了当代佛教建筑的最高工艺水准。梵宫与云冈石窟、龙门石窟的思路类似——用建筑和艺术的方式呈现佛教世界观。', highlights: ['72000平方米建筑', '吉祥颂演出'], visit: '建议预留至少1小时，先参观廊厅艺术品，再看吉祥颂演出。' },
  'LS-014': { story: '五印坛城融合藏式建筑，与梵宫（汉传）和曼飞龙塔（南传）共同构成三大佛教体系建筑群落，完整呈现了佛教在中国传播的多样性。坛城不仅是建筑，更是一种修行工具——曼茶罗的立体化呈现。', highlights: ['藏式坛城建筑', '转经筒祈福'], visit: '转经时顺时针行进，登顶可俯瞰梵宫和大佛全景。' },
  'LS-015': { story: '曼飞龙塔呈现南传佛教建筑风格，复刻西双版纳曼飞龙白塔，把云南傣族佛教文化移植到太湖之滨，拓展了灵山胜境的文化地理跨度。三大语系佛教建筑齐聚灵山，形成"不出灵山看遍中国佛教"的效果。', highlights: ['九塔组合白塔', '南传佛教风格'], visit: '光线充足时白塔拍照效果更好，与梵宫、坛城形成建筑风格对比。' },
  'LS-016': { story: '无尽意斋纪念赵朴初先生，把灵山胜境的"人"的因素补充完整——不仅是佛教建筑群，更是赵朴初等人推动中国佛教复兴的成果展示。宅院本身也是传统建筑艺术的体现。', highlights: ['赵朴初纪念空间', '禅茶体验'], visit: '适合避开主景区人流后安静参观，品一杯禅茶，感受院落清幽。' },
};

function getDetailImageFit(poiId: string) {
  return (poiId === 'LS-011' ? 'contain' : 'cover') as React.CSSProperties['objectFit'];
}

function getDetailImagePosition(poiId: string) {
  const map: Record<string, string> = {
    'LS-006': 'center center', 'LS-010': 'center center', 'LS-011': 'center center',
    'LS-013': 'center center', 'LS-014': 'center center',
  };
  return map[poiId] || 'center center';
}

function ImageCarousel({ images, poiName, poiId }: { images: string[]; poiName: string; poiId: string }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [current, setCurrent] = useState(0);
  const thumbRef = useRef<HTMLDivElement>(null);
  const total = images.length;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= total || idx === current) return;
    setCurrent(idx);
    if (thumbRef.current) {
      const child = thumbRef.current.children[idx] as HTMLElement;
      if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  return (
    <div style={{ borderRadius: isMobile ? 18 : 24, overflow: 'hidden', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)', padding: isMobile ? 10 : 16 }}>
      <div style={{ position: 'relative', borderRadius: isMobile ? 14 : 18, overflow: 'hidden', background: '#F2EBDA' }}>
        <div style={{ overflow: 'hidden', width: '100%', height: isMobile ? 280 : 570 }}>
          <div style={{
            display: 'flex', width: `${total * 100}%`, height: '100%',
            transform: `translateX(-${(current / total) * 100}%)`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}>
            {images.map((src, i) => (
              <div key={i} style={{ width: `${100 / total}%`, height: '100%', flexShrink: 0 }}>
                <img src={src} alt={`${poiName} ${i + 1}`}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: getDetailImageFit(poiId),
                    objectPosition: getDetailImagePosition(poiId),
                    background: '#F2EBDA', display: 'block',
                  }}
                  onError={e => { (e.target as HTMLImageElement).style.background = '#F2EBDA'; }}
                />
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => goTo(current - 1)} disabled={current === 0}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', border: 'none',
            background: 'rgba(61,44,42,0.55)', color: '#fff', fontSize: 18,
            cursor: current === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: current === 0 ? 0.3 : 1,
          }}>‹</button>
        <button onClick={() => goTo(current + 1)} disabled={current >= total - 1}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', border: 'none',
            background: 'rgba(61,44,42,0.55)', color: '#fff', fontSize: 18,
            cursor: current >= total - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: current >= total - 1 ? 0.3 : 1,
          }}>›</button>
        <div style={{
          position: 'absolute', bottom: 12, right: 16,
          padding: '3px 12px', borderRadius: 20,
          background: 'rgba(61,44,42,0.55)', backdropFilter: 'blur(4px)',
          fontSize: '0.75rem', color: '#fff',
        }}>{current + 1} / {total}</div>
      </div>
      <div ref={thumbRef} style={{
        display: 'flex', gap: 8, marginTop: 10, padding: '4px 0',
        overflowX: 'auto', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch',
      }}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={`${poiName} thumb ${i + 1}`}
            onClick={() => goTo(i)}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{
              width: isMobile ? 64 : 80, height: isMobile ? 44 : 56, borderRadius: 10,
              objectFit: getDetailImageFit(poiId), objectPosition: getDetailImagePosition(poiId),
              background: '#F2EBDA', flexShrink: 0,
              cursor: 'pointer', opacity: i === current ? 1 : 0.4,
              border: i === current ? '2px solid #8B6E57' : '2px solid transparent',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PoiDetailPage({ poiId, onNavigate }: { poiId: string; onNavigate?: (page: string, poiId?: string) => void }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const poiData = ALL_POIS_DATA[poiId];
  const [showAll, setShowAll] = useState(false);
  if (!poiData) return <div className="empty-state"><span className="empty-state__text">景点不存在</span></div>;

  const poi = { ...poiData, poiId };
  const extended = POI_EXTENDED[poiId];
  const images = [1, 2, 3].map(i => getPoiWebp(poiId, i)).filter(Boolean);

  const badge = (l: number) => {
    if (l <= 2) return { bg:'#dcfce7', text:'#166534', label:'畅通' };
    if (l <= 3) return { bg:'#fef3c7', text:'#92400e', label:'适中' };
    return { bg:'#fee2e2', text:'#991b1b', label:'拥挤' };
  };
  const b = badge(poi.crowdedness);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => onNavigate?.('pois')} className="btn btn-sm btn-secondary" style={{ marginBottom: 16, fontSize:'0.7rem', padding:'4px 14px' }}>
        ← 返回景点列表
      </button>

      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 24 }}>
        <div style={{ flex: isMobile ? 'none' : '0 0 55%', display:'flex', flexDirection:'column', gap: isMobile ? 12 : 16 }}>
          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>详细介绍</div>
            <p style={{ fontSize: isMobile ? '0.82rem' : '0.95rem', color:'rgba(61,44,42,0.65)', lineHeight:1.9 }}>
              {showAll ? poi.detail : poi.detail.slice(0, isMobile ? 80 : 120) + (poi.detail.length > (isMobile ? 80 : 120) ? '...' : '')}
            </p>
            {poi.detail.length > (isMobile ? 80 : 120) && (
              <button className="btn-text" onClick={() => setShowAll(!showAll)} style={{ marginTop:8 }}>
                {showAll ? '收起' : '展开全部'}
              </button>
            )}
          </div>
          {extended && (
            <>
              <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
                <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>文化解读</div>
                <p style={{ fontSize: '0.82rem', color:'rgba(61,44,42,0.62)', lineHeight:1.85 }}>{extended.story}</p>
              </div>
              <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
                <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:10 }}>核心看点</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
                  {extended.highlights.map((item, i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:'0.78rem', color:'rgba(61,44,42,0.62)', lineHeight:1.6 }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(180,136,100,0.12)', color:'#8B6E57', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.62rem', flexShrink:0 }}>{i + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
                <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>游览建议</div>
                <p style={{ fontSize:'0.8rem', color:'rgba(61,44,42,0.62)', lineHeight:1.8 }}>{extended.visit}</p>
              </div>
            </>
          )}
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap: isMobile ? 10 : 14 }}>
          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <h1 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif" }}>{poi.name}</h1>
            <span style={{ fontSize:'0.65rem', padding:'2px 10px', borderRadius:9999, background:'rgba(180,136,100,0.08)', color:'#8B6E57' }}>{poi.category}</span>
          </div>

          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 12 : 16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>实用信息</div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap:8, fontSize:'0.72rem' }}>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>开放时间</div>
                <div style={{ fontWeight:600, color:'#3D2C2A' }}>{poi.openingInfo}</div>
              </div>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>游览时长</div>
                <div style={{ fontWeight:600, color:'#3D2C2A' }}>约 {poi.avgStayMin} 分钟</div>
              </div>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>门票</div>
                <div style={{ fontWeight:600, color:poi.ticketPrice > 0 ? '#f59e0b' : '#22c55e' }}>
                  {poi.ticketPrice > 0 ? `¥${poi.ticketPrice}` : '免费'}
                </div>
              </div>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>拥挤度</div>
                <div style={{ fontWeight:600, color:b.text }}>{b.label} {poi.crowdedness}/5</div>
              </div>
            </div>
          </div>

          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 12 : 16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:6 }}>游览小贴士</div>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ fontSize:'0.85rem' }}>💡</span>
              <span style={{ fontSize:'0.72rem', color:'rgba(61,44,42,0.55)', lineHeight:1.6 }}>{poi.tips}</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate?.('route', poiId)} style={{ flex:1, padding:'10px 16px', fontSize:'0.8rem' }}>📍 导航到这里</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: isMobile ? 14 : 20 }}>
        <ImageCarousel images={images} poiName={poi.name} poiId={poiId} />
      </div>
    </div>
  );
}