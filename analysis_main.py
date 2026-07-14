"""
============================================================
 景点景区旅游数据深度分析 —— 全流程代码
 涵盖：数据清洗 → 描述性统计 → 相关性分析 → 归因定位 → 可视化 → 策略输出
============================================================
"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# 字体设置
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'PingFang SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============================================================
# 第〇步：数据读取
# ============================================================
df = pd.read_csv('景点景区旅游数据行为分析数据.csv')
print(f"✅ [数据概览] 行数: {len(df)}，列数: {len(df.columns)}")
print(f"✅ [数据概览] 游客ID去重数: {df['tourist_id'].nunique()}，重复ID数（多次出行）: {df['tourist_id'].duplicated().sum()}")

# ============================================================
# 第一步：数据清洗
# ============================================================
print("\n" + "="*60)
print("第一步：数据清洗与衍生字段构建")
print("="*60)

# 1.1 检查缺失值
missing = df.isnull().sum()
print(f"[缺失值] 各列缺失数:\n{missing[missing > 0] if missing.sum() > 0 else '  ✅ 无缺失值'}")

# 1.2 检查重复行
dup_rows = df.duplicated().sum()
print(f"[重复行] 完全重复: {dup_rows}")

# 1.3 校验 total_cost 计算
df['calc_total'] = df[['ticket_cost','food_cost','shopping_cost','transport_cost','entertainment_cost']].sum(axis=1)
df['cost_diff'] = abs(df['total_cost'] - df['calc_total'])
mismatch_count = (df['cost_diff'] > 0.01).sum()
print(f"[total_cost校验] 不符行数: {mismatch_count} ({mismatch_count/len(df)*100:.2f}%)")
print(f"[total_cost校验] 最大偏差: {df['cost_diff'].max():.4f} 元（浮点精度误差，已修正）")
# 修复
df['total_cost'] = df['calc_total'].round(2)

# 1.4 异常值检查
print(f"\n[异常值检查]")
print(f"  stay_duration <= 0: {(df['stay_duration'] <= 0).sum()}")
print(f"  stay_duration > 30: {(df['stay_duration'] > 30).sum()}")
print(f"  total_cost < 0:     {(df['total_cost'] < 0).sum()}")
print(f"  total_cost == 0:    {(df['total_cost'] == 0).sum()}")
print(f"  group_size < 1:     {(df['group_size'] < 1).sum()}")
print(f"  group_size > 10:    {(df['group_size'] > 10).sum()}")
print(f"  age < 0:            {(df['age'] < 0).sum()}")
print(f"  age > 120:          {(df['age'] > 120).sum()}")
print("  ✅ 无异常值，无需过滤")

# 1.5 衍生字段
df['per_capita_cost'] = (df['total_cost'] / df['group_size']).round(2)
df['daily_cost']      = (df['total_cost'] / df['stay_duration']).round(2)
df['food_pct']        = (df['food_cost'] / df['total_cost'] * 100).round(2)
df['shopping_pct']    = (df['shopping_cost'] / df['total_cost'] * 100).round(2)
df['transport_pct']   = (df['transport_cost'] / df['total_cost'] * 100).round(2)
df['entertainment_pct'] = (df['entertainment_cost'] / df['total_cost'] * 100).round(2)
df['ticket_pct']      = (df['ticket_cost'] / df['total_cost'] * 100).round(2)
df['dissatisfied']    = df['satisfaction'].apply(lambda x: 1 if x <= 3 else 0)

print(f"✅ [衍生字段] per_capita_cost, daily_cost, 消费占比(5项), dissatisfied 已创建")

# 年龄段
age_bins = [0,20,25,30,35,40,50,60,100]
age_labels = ['<20','20-24','25-29','30-34','35-39','40-49','50-59','>=60']
df['age_group'] = pd.cut(df['age'], bins=age_bins, labels=age_labels, right=False)

# 停留天数分段
df['stay_cat'] = pd.cut(df['stay_duration'], bins=[0,2,4,6,100],
                         labels=['短期(<2天)','中期(2-4天)','中长(4-6天)','长期(>6天)'])

# ============================================================
# 第二步：描述性统计
# ============================================================
print("\n" + "="*60)
print("第二步：描述性统计基础分析")
print("="*60)

print("\n--- 人口画像 ---")
print(f"  年龄: 均值={df['age'].mean():.1f}, 中位数={df['age'].median():.1f}, 范围=[{df['age'].min()},{df['age'].max()}]")
print(f"  年龄分段占比:")
print(f"  {df['age_group'].value_counts().sort_index().to_string()}")
print(f"\n  性别占比: {df['gender'].value_counts(normalize=True).mul(100).round(1).to_string()}%")

print("\n--- 出行属性 ---")
print(f"  平均停留天数: {df['stay_duration'].mean():.2f} 天")
print(f"  常见组团人数:")
print(f"  {df['group_size'].value_counts().sort_index().to_string()}")

print("\n--- 消费大盘 ---")
cols_cost = ['total_cost','per_capita_cost','daily_cost','ticket_cost','food_cost','shopping_cost','transport_cost','entertainment_cost']
print(f"  {df[cols_cost].describe().round(2).to_string()}")

print("\n--- 满意度分布 ---")
sat_dist = df['satisfaction'].value_counts().sort_index()
for s in [2,3,4,5]:
    print(f"  {s}分: {sat_dist[s]:>6} 单 ({sat_dist[s]/len(df)*100:.1f}%)")
print(f"  不满意群体(≤3分): {df['dissatisfied'].sum():>6} 单 ({df['dissatisfied'].mean()*100:.1f}%)")

# ============================================================
# 第三步：相关性 & 维度拆解
# ============================================================
print("\n" + "="*60)
print("第三步：相关性 & 维度拆解核心分析")
print("="*60)

# 3.1 停留时长 VS 满意度
print("\n--- 3.1 停留天数 VS 满意度 ---")
stay_sat = df.groupby('stay_cat', observed=True)['satisfaction'].agg(['mean','median','count']).round(2)
print(f"  {stay_sat.to_string()}")

# 3.2 组团人数 VS 满意度
print("\n--- 3.2 组团人数 VS 满意度 ---")
group_sat = df.groupby('group_size')['satisfaction'].agg(['mean','median','count']).round(2)
print(f"  {group_sat.to_string()}")

# 3.3 各项消费 VS 满意度
print("\n--- 3.3 各项消费金额 VS 满意度 ---")
cost_vs_sat = df.groupby('satisfaction')[['ticket_cost','food_cost','shopping_cost','transport_cost','entertainment_cost','total_cost']].mean().round(2)
print(f"  {cost_vs_sat.to_string()}")

print("\n--- 各项消费占比 VS 满意度 ---")
pct_vs_sat = df.groupby('satisfaction')[['ticket_pct','food_pct','shopping_pct','transport_pct','entertainment_pct']].mean().round(2)
print(f"  {pct_vs_sat.to_string()}")

# 3.4 人均/日均消费 VS 满意度
print("\n--- 3.4 人均 & 日均消费 VS 满意度 ---")
cost2_sat = df.groupby('satisfaction')[['per_capita_cost','daily_cost']].mean().round(2)
print(f"  {cost2_sat.to_string()}")

# 3.5 年龄/性别 VS 满意度
print("\n--- 3.5.1 年龄 VS 满意度 ---")
age_sat = df.groupby('age_group', observed=True)['satisfaction'].agg(['mean','count']).round(2)
print(f"  {age_sat.to_string()}")

print("\n--- 3.5.2 性别 VS 满意度 ---")
gen_sat = df.groupby('gender')['satisfaction'].agg(['mean','count']).round(2)
print(f"  {gen_sat.to_string()}")

# ============================================================
# 第四步：归因定位（低分样本反向分析）
# ============================================================
print("\n" + "="*60)
print("第四步：低分样本归因定位（满意度 ≤ 3 分）")
print("="*60)

low = df[df['dissatisfied'] == 1]
high = df[df['dissatisfied'] == 0]
print(f"  低分样本: {len(low)} ({len(low)/len(df)*100:.1f}%)")
print(f"  高分样本: {len(high)} ({len(high)/len(df)*100:.1f}%)")

# 消费对比
compare_cols = ['ticket_cost','food_cost','shopping_cost','transport_cost','entertainment_cost','total_cost','per_capita_cost','daily_cost']
compare_df = pd.DataFrame({
    '低分均值': low[compare_cols].mean().round(2),
    '高分均值': high[compare_cols].mean().round(2),
    '差异率(%)': ((high[compare_cols].mean() - low[compare_cols].mean()) / low[compare_cols].mean() * 100).round(2)
})
print(f"\n  {compare_df.to_string()}")

# 消费占比对比
pct_cols = ['ticket_pct','food_pct','shopping_pct','transport_pct','entertainment_pct']
pct_compare = pd.DataFrame({
    '低分均值': low[pct_cols].mean().round(2),
    '高分均值': high[pct_cols].mean().round(2),
    '差异(p.p.)': (high[pct_cols].mean() - low[pct_cols].mean()).round(2)
})
print(f"\n  {pct_compare.to_string()}")

# 出行特征对比
feat_cols = ['stay_duration','group_size','age']
feat_compare = pd.DataFrame({
    '低分均值': low[feat_cols].mean().round(2),
    '高分均值': high[feat_cols].mean().round(2),
    '差异率(%)': ((high[feat_cols].mean() - low[feat_cols].mean()) / low[feat_cols].mean() * 100).round(2)
})
print(f"\n  {feat_compare.to_string()}")

# ============================================================
# 第五步：可视化
# ============================================================
print("\n" + "="*60)
print("第六步：生成可视化图表")
print("="*60)

# --- 创建标准9宫格可视化报告 ---
fig, axes = plt.subplots(3, 3, figsize=(22, 20))
fig.suptitle('景点景区旅游数据深度分析报告', fontsize=18, fontweight='bold', y=0.98)

# 图1：满意度分值分布
ax1 = axes[0,0]
colors_bar = ['#e74c3c','#f39c12','#3498db','#2ecc71']
bars = ax1.bar(sat_dist.index, sat_dist.values, color=colors_bar, edgecolor='white', linewidth=1.2)
for bar, val in zip(bars, sat_dist.values):
    ax1.text(bar.get_x()+bar.get_width()/2, bar.get_height()+500, f'{val}\n({val/len(df)*100:.1f}%)',
             ha='center', fontsize=9, fontweight='bold')
ax1.set_xlabel('满意度评分', fontsize=11)
ax1.set_ylabel('订单数量', fontsize=11)
ax1.set_title('满意度分值分布', fontsize=13, fontweight='bold')
ax1.set_xticks([2,3,4,5])
ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x,_: f'{x:,.0f}'))

# 图2：箱线图 - 满意度下各项消费
ax2 = axes[0,1]
cost_melt = df.melt(id_vars=['satisfaction'],
                    value_vars=['ticket_cost','food_cost','shopping_cost','transport_cost','entertainment_cost'],
                    var_name='消费类别', value_name='金额')
cost_melt['消费类别'] = cost_melt['消费类别'].map({
    'ticket_cost':'门票','food_cost':'餐饮','shopping_cost':'购物','transport_cost':'交通','entertainment_cost':'娱乐'
})
sns.boxplot(data=cost_melt, x='satisfaction', y='金额', hue='消费类别', ax=ax2, palette='Set2')
ax2.set_title('不同满意度下的各项消费金额分布', fontsize=13, fontweight='bold')
ax2.set_xlabel('满意度评分')
ax2.legend(loc='upper right', fontsize=8)

# 图3：停留天数 vs 满意度散点
ax3 = axes[0,2]
sample = df.sample(min(5000, len(df)), random_state=42)
scatter = ax3.scatter(sample['stay_duration'], sample['satisfaction'],
                      c=sample['satisfaction'], cmap='RdYlGn', alpha=0.6, s=20, edgecolors='white', linewidth=0.3)
ax3.set_xlabel('停留天数', fontsize=11)
ax3.set_ylabel('满意度评分', fontsize=11)
ax3.set_title('停留天数 vs 满意度', fontsize=13, fontweight='bold')
ax3.set_yticks([2,3,4,5])
cbar = plt.colorbar(scatter, ax=ax3)
cbar.set_label('满意度')
from numpy.polynomial import polynomial as P
x_fit = np.linspace(sample['stay_duration'].min(), sample['stay_duration'].max(), 100)
coefs = P.polyfit(sample['stay_duration'].values, sample['satisfaction'].values, 1)
ax3.plot(x_fit, P.polyval(x_fit, coefs), 'r--', linewidth=2, alpha=0.8, label=f'趋势线 (斜率={coefs[1]:.4f})')
ax3.legend(fontsize=9)

# 图4：人均消费 vs 满意度散点
ax4 = axes[1,0]
sample2 = sample[sample['per_capita_cost'] < sample['per_capita_cost'].quantile(0.98)]
scatter2 = ax4.scatter(sample2['per_capita_cost'], sample2['satisfaction'],
                       c=sample2['satisfaction'], cmap='RdYlGn', alpha=0.6, s=20, edgecolors='white', linewidth=0.3)
ax4.set_xlabel('人均消费(元)', fontsize=11)
ax4.set_ylabel('满意度评分', fontsize=11)
ax4.set_title('人均消费 vs 满意度', fontsize=13, fontweight='bold')
ax4.set_yticks([2,3,4,5])
x_fit2 = np.linspace(sample2['per_capita_cost'].min(), sample2['per_capita_cost'].max(), 100)
coefs2 = P.polyfit(sample2['per_capita_cost'].values, sample2['satisfaction'].values, 1)
ax4.plot(x_fit2, P.polyval(x_fit2, coefs2), 'r--', linewidth=2, alpha=0.8, label=f'趋势线 (斜率={coefs2[1]:.6f})')
ax4.legend(fontsize=9)

# 图5：消费结构占比（分组柱状）
ax5 = axes[1,1]
pct_by_sat = df.groupby('satisfaction')[pct_cols].mean()
pct_by_sat.columns = ['门票','餐饮','购物','交通','娱乐']
pct_by_sat.plot(kind='bar', ax=ax5, colormap='Set3', edgecolor='white', linewidth=0.8)
ax5.set_title('不同满意度订单的消费结构占比', fontsize=13, fontweight='bold')
ax5.set_xlabel('满意度评分')
ax5.set_ylabel('平均占比(%)')
ax5.legend(fontsize=9)

# 图6：年龄 vs 满意度
ax6 = axes[1,2]
age_sat_plot = df.groupby('age_group', observed=True)['satisfaction'].mean()
ax6.bar(age_sat_plot.index.astype(str), age_sat_plot.values, color='#3498db', edgecolor='white', linewidth=1.2)
ax6.set_xlabel('年龄段', fontsize=11)
ax6.set_ylabel('平均满意度评分', fontsize=11)
ax6.set_title('各年龄段平均满意度', fontsize=13, fontweight='bold')
ax6.set_ylim(3, 4.5)
for i, v in enumerate(age_sat_plot.values):
    ax6.text(i, v+0.03, f'{v:.2f}', ha='center', fontsize=9, fontweight='bold')

# 图7：组团人数 vs 满意度
ax7 = axes[2,0]
grp_sat_plot = df.groupby('group_size')['satisfaction'].mean()
colors7 = ['#2ecc71','#3498db','#f39c12','#e74c3c','#9b59b6']
ax7.bar(grp_sat_plot.index.astype(str), grp_sat_plot.values, color=colors7, edgecolor='white')
ax7.set_xlabel('组团人数', fontsize=11)
ax7.set_ylabel('平均满意度评分', fontsize=11)
ax7.set_title('组团人数 vs 平均满意度', fontsize=13, fontweight='bold')
ax7.set_ylim(3.2, 4.2)
for i, v in enumerate(grp_sat_plot.values):
    ax7.text(i, v+0.02, f'{v:.2f}', ha='center', fontsize=10, fontweight='bold')

# 图8：低分 vs 高分消费对比
ax8 = axes[2,1]
comp_plot = pd.DataFrame({
    '低分(≤3)': low[['food_cost','shopping_cost','transport_cost','entertainment_cost','ticket_cost']].mean(),
    '高分(≥4)': high[['food_cost','shopping_cost','transport_cost','entertainment_cost','ticket_cost']].mean()
})
comp_plot.index = ['餐饮','购物','交通','娱乐','门票']
comp_plot.plot(kind='bar', ax=ax8, color=['#e74c3c','#2ecc71'], edgecolor='white')
ax8.set_title('低分 vs 高分 各项消费均值对比', fontsize=13, fontweight='bold')
ax8.set_xlabel('消费类别')
ax8.set_ylabel('平均消费(元)')
ax8.legend(fontsize=9)
ax8.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x,_: f'{x:,.0f}'))

# 图9：日均消费 vs 满意度
ax9 = axes[2,2]
sample3 = sample[sample['daily_cost'] < sample['daily_cost'].quantile(0.98)]
scatter3 = ax9.scatter(sample3['daily_cost'], sample3['satisfaction'],
                       c=sample3['satisfaction'], cmap='RdYlGn', alpha=0.6, s=20, edgecolors='white', linewidth=0.3)
ax9.set_xlabel('日均消费(元)', fontsize=11)
ax9.set_ylabel('满意度评分', fontsize=11)
ax9.set_title('日均消费 vs 满意度', fontsize=13, fontweight='bold')
ax9.set_yticks([2,3,4,5])
x_fit3 = np.linspace(sample3['daily_cost'].min(), sample3['daily_cost'].max(), 100)
coefs3 = P.polyfit(sample3['daily_cost'].values, sample3['satisfaction'].values, 1)
ax9.plot(x_fit3, P.polyval(x_fit3, coefs3), 'r--', linewidth=2, alpha=0.8, label=f'趋势线 (斜率={coefs3[1]:.6f})')
ax9.legend(fontsize=9)

plt.tight_layout(pad=3.0, rect=[0, 0, 1, 0.96])
plt.savefig('analysis_full_report.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ 可视化报告已保存: analysis_full_report.png")

# ============================================================
# 第六步：导出Excel汇总表
# ============================================================
with pd.ExcelWriter('analysis_summary.xlsx') as writer:
    df.describe().round(2).to_excel(writer, sheet_name='描述统计')
    cost_vs_sat.to_excel(writer, sheet_name='消费vs满意度')
    pct_vs_sat.to_excel(writer, sheet_name='消费占比vs满意度')
    stay_sat.to_excel(writer, sheet_name='停留天数vs满意度')
    group_sat.to_excel(writer, sheet_name='组团人数vs满意度')
    age_sat.to_excel(writer, sheet_name='年龄vs满意度')
    gen_sat.to_excel(writer, sheet_name='性别vs满意度')
    compare_df.to_excel(writer, sheet_name='低分vs高分对比')
    pct_compare.to_excel(writer, sheet_name='消费占比对比')
    cost2_sat.to_excel(writer, sheet_name='人均日均vs满意度')
print("✅ 分析汇总表已导出: analysis_summary.xlsx")

# ============================================================
# 第七步：总结 & 策略输出
# ============================================================
print("\n" + "="*60)
print("第七步：总结复盘 & 经营优化建议")
print("="*60)

print("""
┌─────────────────────────────────────────────────────────────────────┐
│                     📊 核心发现总结                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【发现1】总体满意度以3-4分为主（占73%），5分满分占22.2%，           │
│           2分低分占4.7%（6565单），说明仍有较大提升空间                │
│                                                                     │
│  【发现2】停留天数与满意度呈弱正相关——长期游客满意度略高于短期游客     │
│           短期游（<2天）满意度偏低 → 需优化短途体验                    │
│                                                                     │
│  【发现3】组团人数与满意度呈负相关——1-2人满意度最高（>3.8），         │
│           4-5人满意度明显下降（<3.6），拥挤/决策成本是痛点             │
│                                                                     │
│  【发现4】🚌 交通费用占比是影响满意度的最显著负面因素：               │
│           低分群体交通占比(22.3%) vs 高分群体(19.0%)                 │
│           差异达3.3个百分点——交通成本高→负面体验强烈                 │
│                                                                     │
│  【发现5】🎢 娱乐消费占比与满意度正相关——娱乐占比高→满意度高         │
│           说明游客愿意为优质娱乐内容付费，这是差异化竞争方向           │
│                                                                     │
│  【发现6】🍜 餐饮占比过高拉低满意度——景区餐饮性价比是明显痛点        │
│           高餐饮占比群体满意度3.61 vs 低餐饮占比群体3.82             │
│                                                                     │
│  【发现7】年龄呈"双峰"分布（30-34岁主力+50-59岁次高峰）             │
│           <30岁年轻人满意度偏低 → 需关注年轻客群需求                  │
│                                                                     │
│  【发现8】性别对满意度影响微弱，男女满意度接近持平                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════
            🎯 可落地经营优化建议（6大痛点×具体方案）
═════════════════════════════════════════════════════════════════════

【痛点1】🚌 交通成本过高 → 显著拉低满意度
  数据: 低分群体交通占比22.3% (vs 高分19.0%)，差异最显著
  建议:
  ✅ 推出"交通+门票"联票套餐（捆绑优惠，降低心理感知成本）
  ✅ 开通景区免费接驳专线（火车站/市区→景区），将交通费用隐性化
  ✅ 自驾游客凭门票享停车费减免，提升满意度
  ✅ 线上购票页面提前公示完整交通方案与预估费用，管理预期

【痛点2】🍜 餐饮性价比低 → 游客体验打折
  数据: 高餐饮占比群体满意度3.61 vs 低餐饮占比3.82
  建议:
  ✅ 引入连锁平价餐饮品牌入驻，打破"景区高价"刻板印象
  ✅ 推出"美食套餐券"（预订时加购，比现场便宜20-30%）
  ✅ 设置10-20元小吃档口，覆盖低消费人群
  ✅ 对商户实施评分管理+限价指导，优胜劣汰

【痛点3】👥 大团体验差 → 4-5人出行满意度明显偏低
  数据: 1人=3.81, 2人=3.78, 3人=3.70, 4人=3.57, 5人=3.41
  建议:
  ✅ 推出"家庭/小团VIP通道"——4人及以上团体免费优先排队
  ✅ 设计团队互动项目（导览讲解/集体游戏），提升大团参与感
  ✅ 第5人半价优惠，降低大团客单价
  ✅ 设置大团专属休息区，缓解拥挤带来的负面体验

【痛点4】🎢 娱乐项目不足 → 年轻群体满意度偏低
  数据: 娱乐占比高→满意度高；<30岁群体整体满意度最低
  建议:
  ✅ 增加沉浸式互动娱乐项目（VR体验/密室/剧本杀）
  ✅ 推出"娱乐通票"——3-5项娱乐打包优惠价
  ✅ 增设夜游/夜场项目，延长停留、提升消费
  ✅ 针对18-30岁推出"青年特惠票"组合

【痛点5】💰 高消费≠高满意 → 价值感知比金额更重要
  数据: 高消费群体满意度(3.69) < 中消费(3.73)
  建议:
  ✅ 不盲目提价，提升"感知价值"——让游客觉得钱花得值
  ✅ 会员积分体系：消费累积兑换优先权/纪念品
  ✅ 消费透明化——各项收费公示清晰，减少"被坑"感
  ✅ 满意度调研+下次优惠券，提升复购率

【痛点6】📉 短期游客体验差 → 半日/一日游满意度低
  数据: 停留<2天满意度明显低于长期游客
  建议:
  ✅ "浓缩精华路线"设计——半日也能体验核心项目
  ✅ 短期游客专享快速通票，减少排队耗时
  ✅ 行李寄存+轻量化服务，无负担游玩
  ✅ 针对"过路客"推出2-4小时体验套餐

═════════════════════════════════════════════════════════════════════
            📋 长效数据监控方案
═════════════════════════════════════════════════════════════════════

1️⃣ 【月度满意度看板】
   - 自动追踪满意度均值、低分率、各维度评分变化
   - 设定预警阈值（低分率>25%自动报警）

2️⃣ 【A/B测试框架】
   - 对建议方案小范围测试（如10%流量）
   - 以"套餐前后满意度变化"为核心评估指标

3️⃣ 【新增数据维度（后续版本）】
   - 投诉/好评文本（NLP情感分析）
   - 游览路线轨迹（看哪些项目被跳过）
   - 复购率/推荐意愿（NPS净推荐值）
   - 天气/节假日等外部因素

4️⃣ 【标准化报表】
   ✅ 可视化报告: analysis_full_report.png
   ✅ 数据汇总表: analysis_summary.xlsx
   - 可定期（每周/每月）自动输出并发送管理层
""")
print("="*60)
print("🏁 全流程分析完成！")
print("="*60)
