# -*- coding: utf-8 -*-
import pandas as pd, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
csv_path = os.path.join(BASE, 'assets', 'data', '景点景区旅游数据行为分析数据new.csv')
out_path = os.path.join(BASE, 'frontend_new', 'public', 'data', 'report_v2.json')
os.makedirs(os.path.dirname(out_path), exist_ok=True)

print('Loading CSV...')
df = pd.read_csv(csv_path)
print(f'Loaded {len(df):,} rows')

df['age_group'] = pd.cut(df['age'], bins=[0,18,30,45,60,150], labels=['0-18','19-30','31-45','46-60','60+'])
stay_bins = [0,2,4,6,8,10,100]
stay_labels = ['0-2h','2-4h','4-6h','6-8h','8-10h','10h+']
df['stay_group'] = pd.cut(df['stay_duration'], bins=stay_bins, labels=stay_labels)

result = {
    'overview': {
        'total_records': len(df),
        'unique_tourists': int(df['tourist_id'].nunique()),
        'avg_satisfaction': round(float(df['satisfaction'].mean()), 2),
        'avg_stay_hours': round(float(df['stay_duration'].mean()), 1),
        'avg_total_cost': round(float(df['total_cost'].mean()), 0),
        'avg_group_size': round(float(df['group_size'].mean()), 1),
        'male_pct': round(float((df['gender']=='男').mean()*100), 1),
        'female_pct': round(float((df['gender']=='女').mean()*100), 1),
        'avg_ticket': round(float(df['ticket_cost'].mean()), 0),
        'avg_food': round(float(df['food_cost'].mean()), 0),
        'avg_shopping': round(float(df['shopping_cost'].mean()), 0),
        'avg_transport': round(float(df['transport_cost'].mean()), 0),
        'avg_entertainment': round(float(df['entertainment_cost'].mean()), 0),
    },
    'satisfaction_dist': df['satisfaction'].value_counts().sort_index().apply(int).to_dict(),
    'age_dist': df['age_group'].value_counts().sort_index().apply(int).to_dict(),
    'gender_dist': df['gender'].value_counts().apply(int).to_dict(),
    'stay_dist': df['stay_group'].value_counts().sort_index().apply(int).to_dict(),
    'age_sat': df.groupby('age_group')['satisfaction'].mean().round(2).to_dict(),
    'age_cost': df.groupby('age_group')['total_cost'].mean().round(0).astype(int).to_dict(),
    'stay_sat': df.groupby('stay_group')['satisfaction'].mean().round(2).to_dict(),
    'group_sat': df.groupby('group_size')['satisfaction'].mean().round(2).to_dict(),
    'group_count': df.groupby('group_size').size().apply(int).to_dict(),
    'cost_tiers': ['0-100','100-300','300-500','500-1000','1000-2000','2000+'],
}

cost_bins = [0,100,300,500,1000,2000,99999]
cost_labels = ['0-100','100-300','300-500','500-1000','1000-2000','2000+']
df['cost_tier'] = pd.cut(df['total_cost'], bins=cost_bins, labels=cost_labels)
tier_sat = df.groupby('cost_tier')['satisfaction'].mean().round(2)
tier_cnt = df.groupby('cost_tier').size().apply(int)
result['cost_tier_sat'] = {str(k): float(v) for k,v in tier_sat.items()}
result['cost_tier_cnt'] = {str(k): v for k,v in tier_cnt.items()}

# 性别满意度
result['gender_sat'] = df.groupby('gender')['satisfaction'].mean().round(2).to_dict()

# 月度满意度趋势
df['month'] = pd.to_datetime(df['visit_date'], format='%Y/%m/%d').dt.to_period('M').astype(str)
monthly = df.groupby('month').agg(cnt=('satisfaction','count'), sat=('satisfaction','mean')).reset_index()
monthly = monthly.sort_values('month')
result['monthly_trend'] = [{'month': r['month'], 'count': int(r['cnt']), 'sat': round(float(r['sat']),2)} for _,r in monthly.iterrows()]

# 服务建议
total = len(df)
suggestions = []
low_cnt = int((df['satisfaction'] <= 2).sum())
if low_cnt > 0:
    suggestions.append(f'低满意度记录(评分≤2)共{low_cnt}条，占比{low_cnt/total*100:.1f}%，需重点关注')
for ag in ['19-30','31-45','46-60','60+']:
    sub = df[df['age_group']==ag]
    low = sub[sub['satisfaction']<=2]
    if len(low) > 0.05*len(sub):
        suggestions.append(f'{ag}岁游客低满意度占比{len(low)/len(sub)*100:.0f}%，建议优化该群体服务体验')
high_cost = df[df['total_cost']>df['total_cost'].quantile(0.9)]
hcs = high_cost['satisfaction'].mean()
if hcs < df['satisfaction'].mean():
    suggestions.append(f'高消费群体(前10%)满意度({hcs:.1f})低于平均({df["satisfaction"].mean():.1f})')
big_group = df[df['group_size']>=5]
bgs = big_group['satisfaction'].mean()
if bgs < df['satisfaction'].mean():
    suggestions.append(f'团队游客(5人+)满意度({bgs:.1f})低于均值')
result['suggestions'] = suggestions

# 热门话题（基于昵称词频简单提取）
hotwords = df['user_nickname'].str.extractall(r'([\u4e00-\u9fff]{2,4})')[0].value_counts().head(10).to_dict()
result['hotwords'] = [{'word': k, 'count': int(v)} for k,v in hotwords.items()]

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f'Done: {out_path}')
print(f'Total: {result["overview"]["total_records"]:,}, Avg sat: {result["overview"]["avg_satisfaction"]}, Avg cost: {result["overview"]["avg_total_cost"]}')
print(f'Suggestions: {len(suggestions)}')
