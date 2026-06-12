import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

// ─── constants ──────────────────────────────────────────────
const CIRCLES    = ['体制内/公务员', '教师', '医护', '金融', '互联网/科技', '法律', '艺术传媒', '创业/个体', '国企央企', '其他'];
const EDUCATIONS = ['高中及以下', '大专', '本科', '硕士', '博士'];
const MARITALS   = ['未婚', '离异无孩', '离异带孩', '丧偶'];
const INCOMES    = ['5万以下', '5-10万', '10-20万', '20-50万', '50万以上'];
const BODY_TYPES = ['偏瘦', '匀称', '微胖', '健壮', '丰满'];
const HOUSINGS   = ['自有住房', '有房有贷', '租房', '与家人同住', '不便透露'];
const CARS       = ['有车', '无车', '不便透露'];
const DISTRICTS  = [
  // 中心城区
  '渝中区','江北区','南岸区','九龙坡区','沙坪坝区','大渡口区','渝北区','巴南区','北碚区','两江新区','重庆高新区',
  // 主城新区
  '万州区','涪陵区','长寿区','江津区','合川区','永川区','南川区','綦江区','大足区','璧山区','铜梁区','潼南区','荣昌区',
  // 渝东北/渝东南
  '开州区','梁平区','武隆区','城口县','丰都县','垫江县','忠县','云阳县','奉节县','巫山县','巫溪县',
  '石柱县','秀山县','酉阳县','彭水县',
  '外地',
];
const ZODIACS    = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const CREDENTIALS = ['工作证/工牌', '编制/在职证明', '教师资格证', '医护执业证', '学历学位证(学信网)', '留服认证(海归)', '律师执业证', '营业执照', '社保参保证明', '离婚证(二婚)'];
const EVENT_TYPES = ['体制内专场', '教师专场', '医护专场', '高知硕博专场', '海归专场', 'IT/金融专场', '创业者专场', '白领综合场', '二婚/熟龄专场', '兴趣破冰场'];
const SOURCES     = ['朋友介绍', '微信群', '公众号', '抖音', '小红书', '参加过活动', '其他'];
const SHICHENS    = ['子时(23-1点)','丑时(1-3点)','寅时(3-5点)','卯时(5-7点)','辰时(7-9点)','巳时(9-11点)','午时(11-13点)','未时(13-15点)','申时(15-17点)','酉时(17-19点)','戌时(19-21点)','亥时(21-23点)','不清楚'];
const WORK_TYPES  = ['公务员/事业编', '国企/央企', '民企', '外企', '自由职业', '创业', '其他'];
const MBTIS       = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP','不清楚'];
const INTENTIONS  = ['一年内结婚', '两年内结婚', '先认真恋爱', '慢慢了解'];
const FAMILY_PLANS = ['希望要孩子', '不要孩子', '顺其自然', '还没想好'];
const DATE_STYLES = ['吃饭聊天', '看电影/展览', '户外徒步', '运动健身', '咖啡店坐坐', '一起做饭'];
const PERSONALITY_TAGS = ['开朗外向','安静内敛','幽默风趣','温柔体贴','理性冷静','感性浪漫','慢热','直爽','顾家','上进','佛系','细心'];
const SPORT_TAGS  = ['健身','跑步','爬山','游泳','羽毛球','篮球','瑜伽','骑行','飞盘','不太运动'];
const LIFESTYLE_TAGS = ['不吸烟','偶尔小酌','不喝酒','爱下厨','早睡早起','夜猫子','养宠物','爱干净','喜欢旅行','宅家舒适'];
const VALUE_TAGS  = ['家庭第一','事业心强','财务自由','简单生活','终身学习','孝顺父母','AA制可以','仪式感重要'];
const QA_QUESTIONS = ['什么瞬间会让你心动？', '你理想中的相处模式是？', '你的周末一般怎么过？'];

const zodiacOf = y => ZODIACS[(y - 4) % 12];

const STEPS = ['基本信息', '职业与条件', '性格与生活', '介绍自己', '择偶要求', '承诺与联系'];

const BLANK = {
  nickname:'', real_name:'', gender:'女',
  birth_year:'', birth_date:'', birth_time:'', district:'', hometown:'',
  occupation:'', circle:'', education:'', marital:'未婚',
  height:'', body_type:'', income:'', housing:'', car:'',
  self_intro:'', one_liner:'', interests:'',
  pref_age_min:'', pref_age_max:'', pref_height_min:'', pref_height_max:'',
  pref_education:'', pref_income:'', pref_circle:'', pref_district:'', pref_marital:'',
  accept_long_distance:'', accept_children:'', preferences:'',
  contact:'', phone:'', single_promise:false, display_consent:false,
  id_last4:'', credentials:'', agree_disclaimer:false, portrait_consent:false,
  source_channel:'', interested_events:'',
  birth_place:'', work_type:'', school:'', mbti:'', intention:'',
  relationship_value:'', lifestyle_desc:'', family_plan:'', preferred_date:'',
  dealbreakers:'', personality_tags:'', sport_tags:'', lifestyle_tags:'',
  value_tags:'', qa_answers:'', same_city_only:'',
};

// ─── small UI atoms ──────────────────────────────────────────
function Label({ children, required }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}{required && <span className="text-pink-500 ml-0.5">*</span>}</label>;
}
function Input(props) {
  return <input className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent bg-white" {...props} />;
}
function Select({ children, ...props }) {
  return (
    <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white appearance-none" {...props}>
      {children}
    </select>
  );
}
function Textarea(props) {
  return <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none bg-white" rows={4} {...props} />;
}
function Field({ label, required, hint, children }) {
  return (
    <div className="mb-5">
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function GenderToggle({ value, onChange }) {
  return (
    <div className="flex gap-3">
      {['女','男'].map(g => (
        <button key={g} type="button" onClick={() => onChange(g)}
          className={`flex-1 py-3 rounded-xl text-base font-semibold border-2 transition-all ${
            value === g
              ? g === '女' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-400 bg-white'
          }`}>
          {g === '女' ? '♀ 女生' : '♂ 男生'}
        </button>
      ))}
    </div>
  );
}

// 单选 Chip，支持自定义输入（选中值不在选项里时也会显示）
function ChipGroup({ options, value, onChange, allowCustom = true }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const isCustomValue = value && !options.includes(value);

  function submitCustom() {
    const v = input.trim();
    if (v) onChange(v);
    setInput('');
    setEditing(false);
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt === value ? '' : opt)}
          className={`px-3.5 py-2 rounded-full text-sm border transition-all ${
            value === opt
              ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
              : 'border-gray-200 text-gray-600 bg-white'
          }`}>
          {opt}
        </button>
      ))}
      {isCustomValue && (
        <button type="button" onClick={() => onChange('')}
          className="px-3.5 py-2 rounded-full text-sm border border-pink-400 bg-pink-50 text-pink-700 font-medium">
          ✓ {value} ×
        </button>
      )}
      {allowCustom && !editing && (
        <button type="button" onClick={() => setEditing(true)}
          className="px-3.5 py-2 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 bg-white">
          ✏️ 自己填
        </button>
      )}
      {editing && (
        <span className="inline-flex gap-1.5 items-center">
          <input autoFocus className="px-3 py-2 border border-pink-300 rounded-full text-sm w-32 focus:outline-none focus:ring-2 focus:ring-pink-200"
            placeholder="输入后确认" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitCustom()} />
          <button type="button" onClick={submitCustom}
            className="px-3 py-2 rounded-full text-sm bg-pink-500 text-white">确认</button>
        </span>
      )}
    </div>
  );
}

// 多选 Chip（CSV 存储），支持添加自定义标签
function MultiChipGroup({ options, value, onChange, allowCustom = true }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const selected = value ? value.split(',').filter(Boolean) : [];
  const customSelected = selected.filter(s => !options.includes(s));

  function toggle(opt) {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt).join(','));
    else onChange([...selected, opt].join(','));
  }

  function addCustom() {
    const v = input.trim();
    if (v && !selected.includes(v)) onChange([...selected, v].join(','));
    setInput('');
    setEditing(false);
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3.5 py-2 rounded-full text-sm border transition-all ${
            selected.includes(opt)
              ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
              : 'border-gray-200 text-gray-600 bg-white'
          }`}>
          {selected.includes(opt) ? '✓ ' : ''}{opt}
        </button>
      ))}
      {customSelected.map(t => (
        <button key={t} type="button" onClick={() => toggle(t)}
          className="px-3.5 py-2 rounded-full text-sm border border-pink-400 bg-pink-50 text-pink-700 font-medium">
          ✓ {t} ×
        </button>
      ))}
      {allowCustom && !editing && (
        <button type="button" onClick={() => setEditing(true)}
          className="px-3.5 py-2 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 bg-white">
          ＋ 自定义
        </button>
      )}
      {editing && (
        <span className="inline-flex gap-1.5 items-center">
          <input autoFocus className="px-3 py-2 border border-pink-300 rounded-full text-sm w-32 focus:outline-none focus:ring-2 focus:ring-pink-200"
            placeholder="输入标签" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()} />
          <button type="button" onClick={addCustom}
            className="px-3 py-2 rounded-full text-sm bg-pink-500 text-white">添加</button>
        </span>
      )}
    </div>
  );
}

// ─── Steps ──────────────────────────────────────────────────
function Step1({ form, set }) {
  const year = new Date().getFullYear();
  return (
    <>
      <Field label="性别" required>
        <GenderToggle value={form.gender} onChange={v => set('gender', v)} />
      </Field>
      <Field label="昵称（对外展示用）" required hint="对外用昵称保护隐私，如：小桃、阿哲">
        <Input placeholder="起个好听的昵称吧～" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
      </Field>
      <Field label="真实姓名" hint="加密保存，仅工作人员审核用，绝不对外">
        <Input placeholder="选填" value={form.real_name} onChange={e => set('real_name', e.target.value)} />
      </Field>
      <Field label="出生日期" required hint={form.birth_date ? `属${zodiacOf(+form.birth_date.slice(0,4))} · ${year - +form.birth_date.slice(0,4)}岁` : '用于年龄展示与缘分匹配分析'}>
        <Input type="date" min={`${year-55}-01-01`} max={`${year-20}-12-31`}
          value={form.birth_date}
          onChange={e => { set('birth_date', e.target.value); set('birth_year', e.target.value ? e.target.value.slice(0,4) : ''); }} />
      </Field>
      <Field label="出生时间" hint="选填，用于八字缘分合盘。知道精确时间最准；只记得时辰也可以">
        <div className="flex gap-2">
          <Input type="time" className="flex-1" value={/^\d{1,2}:\d{2}$/.test(form.birth_time) ? form.birth_time : ''}
            onChange={e => set('birth_time', e.target.value)} placeholder="精确时间" />
          <Select value={/^\d/.test(form.birth_time) ? '' : form.birth_time}
            onChange={e => set('birth_time', e.target.value === '不清楚' ? '' : e.target.value)}>
            <option value="">或选时辰</option>
            {SHICHENS.filter(s => s !== '不清楚').map(s => <option key={s} value={s.slice(0,2)}>{s}</option>)}
          </Select>
        </div>
      </Field>
      <Field label="出生地" hint="选填，如：重庆市、四川成都。出生地经度影响真太阳时，让排盘更准">
        <Input placeholder="如：重庆市" value={form.birth_place} onChange={e => set('birth_place', e.target.value)} />
      </Field>
      <Field label="目前所在区域" required>
        <Select value={form.district} onChange={e => set('district', e.target.value)}>
          <option value="">请选择</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
      </Field>
      <Field label="籍贯" hint="如：重庆本地、四川成都">
        <Input placeholder="选填" value={form.hometown} onChange={e => set('hometown', e.target.value)} />
      </Field>
      <Field label="身高（cm）" required>
        <Input type="number" min={140} max={220} placeholder="如：165" value={form.height} onChange={e => set('height', e.target.value)} />
      </Field>
      <Field label="体型">
        <ChipGroup allowCustom={false} options={BODY_TYPES} value={form.body_type} onChange={v => set('body_type', v)} />
      </Field>
      <Field label="婚况" required>
        <ChipGroup allowCustom={false} options={MARITALS} value={form.marital} onChange={v => set('marital', v)} />
      </Field>
    </>
  );
}

function Step2({ form, set }) {
  return (
    <>
      <Field label="职业" required hint="只需职业类别，不需要单位全称，如：公务员、医生、教师">
        <Input placeholder="如：软件工程师、护士、教师" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
      </Field>
      <Field label="工作类型">
        <ChipGroup options={WORK_TYPES} value={form.work_type} onChange={v => set('work_type', v)} />
      </Field>
      <Field label="所属圈层">
        <ChipGroup options={CIRCLES} value={form.circle} onChange={v => set('circle', v)} />
      </Field>
      <Field label="最高学历" required>
        <ChipGroup allowCustom={false} options={EDUCATIONS} value={form.education} onChange={v => set('education', v)} />
      </Field>
      <Field label="毕业院校" hint="选填，高知专场需学信网核验">
        <Input placeholder="如：重庆大学" value={form.school} onChange={e => set('school', e.target.value)} />
      </Field>
      <Field label="年收入">
        <ChipGroup allowCustom={false} options={INCOMES} value={form.income} onChange={v => set('income', v)} />
      </Field>
      <Field label="住房情况">
        <ChipGroup options={HOUSINGS} value={form.housing} onChange={v => set('housing', v)} />
      </Field>
      <Field label="车辆情况">
        <ChipGroup options={CARS} value={form.car} onChange={v => set('car', v)} />
      </Field>
      <Field label="我可以提供的核验材料（可多选）"
        hint="证件仅现场核验真伪，核验后立即删除不留存，只记录「已核验」标记。材料越全，可参加的专场越多">
        <MultiChipGroup options={CREDENTIALS} value={form.credentials} onChange={v => set('credentials', v)} />
      </Field>
    </>
  );
}

function StepPersonality({ form, set }) {
  return (
    <>
      <p className="text-sm text-gray-400 mb-5">性格与生活习惯是匹配的重要参考 🌱</p>
      <Field label="MBTI 性格类型" hint="不清楚可以不选">
        <Select value={form.mbti} onChange={e => set('mbti', e.target.value === '不清楚' ? '' : e.target.value)}>
          <option value="">不清楚 / 不填</option>
          {MBTIS.filter(m => m !== '不清楚').map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </Field>
      <Field label="恋爱意向" hint="让红娘了解您的节奏">
        <ChipGroup allowCustom={false} options={INTENTIONS} value={form.intention} onChange={v => set('intention', v)} />
      </Field>
      <Field label="家庭计划">
        <ChipGroup allowCustom={false} options={FAMILY_PLANS} value={form.family_plan} onChange={v => set('family_plan', v)} />
      </Field>
      <Field label="个性标签（可多选）">
        <MultiChipGroup options={PERSONALITY_TAGS} value={form.personality_tags} onChange={v => set('personality_tags', v)} />
      </Field>
      <Field label="运动偏好（可多选）">
        <MultiChipGroup options={SPORT_TAGS} value={form.sport_tags} onChange={v => set('sport_tags', v)} />
      </Field>
      <Field label="生活方式（可多选）">
        <MultiChipGroup options={LIFESTYLE_TAGS} value={form.lifestyle_tags} onChange={v => set('lifestyle_tags', v)} />
      </Field>
      <Field label="价值观（可多选）">
        <MultiChipGroup options={VALUE_TAGS} value={form.value_tags} onChange={v => set('value_tags', v)} />
      </Field>
      <Field label="喜欢的约会方式">
        <ChipGroup options={DATE_STYLES} value={form.preferred_date} onChange={v => set('preferred_date', v)} />
      </Field>
    </>
  );
}

function Step3({ form, set }) {
  const qa = form.qa_answers ? JSON.parse(form.qa_answers) : ['', '', ''];
  function setQa(i, val) {
    const next = [...qa];
    next[i] = val;
    set('qa_answers', JSON.stringify(next));
  }
  return (
    <>
      <p className="text-sm text-gray-400 mb-5">让对方更了解你，填写越详细匹配越准确 ✨</p>
      <Field label="一句话介绍自己" hint="会展示在你的嘉宾卡片上，如：慢热但真诚，喜欢简单的小确幸～">
        <Input maxLength={50} placeholder="用一句话打动对方" value={form.one_liner} onChange={e => set('one_liner', e.target.value)} />
      </Field>
      <Field label="详细自我介绍">
        <Textarea placeholder="性格、生活状态、工作节奏、家庭情况、特别之处..." rows={5} value={form.self_intro} onChange={e => set('self_intro', e.target.value)} />
      </Field>
      <Field label="兴趣爱好" hint="如：烘焙 · 撸猫 · 周末爬山">
        <Input placeholder="如：健身、旅行、咖啡、摄影..." value={form.interests} onChange={e => set('interests', e.target.value)} />
      </Field>
      <Field label="我的关系观" hint="选填，如：彼此独立又互相支持">
        <Input placeholder="你怎么看待亲密关系？" value={form.relationship_value} onChange={e => set('relationship_value', e.target.value)} />
      </Field>

      <p className="text-sm font-semibold text-gray-700 mt-6 mb-3">💬 快问快答（选填，让资料更鲜活）</p>
      {QA_QUESTIONS.map((q, i) => (
        <Field key={i} label={q}>
          <Input placeholder="随意聊聊～" value={qa[i] || ''} onChange={e => setQa(i, e.target.value)} />
        </Field>
      ))}
    </>
  );
}

function Step4({ form, set }) {
  return (
    <>
      <p className="text-sm text-gray-400 mb-5">结构化条件用于智能匹配，填得越细推荐越精准</p>

      <Field label="期望对方年龄">
        <div className="flex gap-3 items-center">
          <Input type="number" min={18} max={60} placeholder="最小" value={form.pref_age_min} onChange={e => set('pref_age_min', e.target.value)} />
          <span className="text-gray-400 shrink-0">—</span>
          <Input type="number" min={18} max={60} placeholder="最大" value={form.pref_age_max} onChange={e => set('pref_age_max', e.target.value)} />
          <span className="text-gray-400 shrink-0">岁</span>
        </div>
      </Field>

      <Field label="期望对方身高（cm 以上）">
        <Input type="number" min={150} max={220} placeholder="如：170" value={form.pref_height_min} onChange={e => set('pref_height_min', e.target.value)} />
      </Field>

      <Field label="期望对方圈层">
        <ChipGroup options={CIRCLES} value={form.pref_circle} onChange={v => set('pref_circle', v)} />
      </Field>

      <Field label="期望对方学历（最低）">
        <ChipGroup allowCustom={false} options={EDUCATIONS} value={form.pref_education} onChange={v => set('pref_education', v)} />
      </Field>

      <Field label="期望对方收入（最低）">
        <ChipGroup allowCustom={false} options={INCOMES} value={form.pref_income} onChange={v => set('pref_income', v)} />
      </Field>

      <Field label="期望对方婚况">
        <ChipGroup allowCustom={false} options={['不限', ...MARITALS]} value={form.pref_marital} onChange={v => set('pref_marital', v)} />
      </Field>

      <Field label="是否接受异地">
        <ChipGroup allowCustom={false} options={['接受', '不接受', '看情况']} value={form.accept_long_distance} onChange={v => set('accept_long_distance', v)} />
      </Field>

      <Field label="是否接受对方带小孩">
        <ChipGroup allowCustom={false} options={['接受', '不接受', '看情况']} value={form.accept_children} onChange={v => set('accept_children', v)} />
      </Field>

      <Field label="是否同城优先">
        <ChipGroup allowCustom={false} options={['是，同城优先', '无所谓']} value={form.same_city_only} onChange={v => set('same_city_only', v)} />
      </Field>

      <Field label="绝对不能接受的事" hint="选填，红娘匹配时会避开，如：吸烟、妈宝、异地">
        <Input placeholder="您的底线是什么？" value={form.dealbreakers} onChange={e => set('dealbreakers', e.target.value)} />
      </Field>

      <Field label="择偶简述 / 其他要求" hint="如：希望对方稳重顾家、有共同生活节奏">
        <Textarea placeholder="说说你期望的另一半..." rows={3} value={form.preferences} onChange={e => set('preferences', e.target.value)} />
      </Field>

      <Field label="感兴趣的专场类型（可多选）" hint="有对应专场开放报名时优先通知您">
        <MultiChipGroup options={EVENT_TYPES} value={form.interested_events} onChange={v => set('interested_events', v)} />
      </Field>
    </>
  );
}

function Step5({ form, set }) {
  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        📱 联系方式仅供工作人员审核联系，一律不对外公开
      </div>
      <Field label="微信号" required>
        <Input placeholder="填写您的微信号" value={form.contact} onChange={e => set('contact', e.target.value)} />
      </Field>
      <Field label="手机号" hint="选填，方便工作人员快速联系您">
        <Input type="tel" maxLength={11} placeholder="选填" value={form.phone} onChange={e => set('phone', e.target.value)} />
      </Field>
      <Field label="身份证后四位" hint="用于《单身承诺书》签署存档，不收集完整证件号">
        <Input maxLength={4} placeholder="如：1234" value={form.id_last4}
          onChange={e => set('id_last4', e.target.value.replace(/[^0-9Xx]/g, ''))} />
      </Field>
      <Field label="您从哪里得知我们？">
        <ChipGroup options={SOURCES} value={form.source_channel} onChange={v => set('source_channel', v)} />
      </Field>

      {/* 承诺与授权（合规三件套） */}
      <p className="text-sm font-semibold text-gray-700 mt-6 mb-3">📋 承诺与授权</p>
      <div className="space-y-3">
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.single_promise ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'}`}>
          <input type="checkbox" checked={form.single_promise}
            onChange={e => set('single_promise', e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-pink-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">单身承诺书 <span className="text-pink-500">*</span></p>
            <p className="text-xs text-gray-500 mt-1">本人承诺目前为单身状态（未婚/离异/丧偶），不存在合法有效婚姻关系；所提供信息真实、准确、有效，无虚假、隐瞒或冒用他人身份；参加活动出于真实婚恋交友目的。如违反承诺，主办方有权取消资格、不退费用并列入黑名单，造成损失由本人承担全部法律责任。</p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.agree_disclaimer ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'}`}>
          <input type="checkbox" checked={form.agree_disclaimer}
            onChange={e => set('agree_disclaimer', e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-pink-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">活动参与免责协议 <span className="text-pink-500">*</span></p>
            <p className="text-xs text-gray-500 mt-1">本人自愿报名参加活动；知悉主办方仅提供组织与撮合服务，不对建立恋爱婚姻关系作保证；活动场所外或私下交往发生的纠纷由当事人自行承担；警惕以交友为名的诈骗，不向其他参与人转账借款。</p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.display_consent ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'}`}>
          <input type="checkbox" checked={form.display_consent}
            onChange={e => set('display_consent', e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-pink-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">同意脱敏展示（选勾）</p>
            <p className="text-xs text-gray-500 mt-1">同意主办方以脱敏方式（如「92年·渝中·教师」，不含真实姓名联系方式）展示我的基本资料，用于活动预热与匹配。可随时撤回。</p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.portrait_consent ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'}`}>
          <input type="checkbox" checked={form.portrait_consent}
            onChange={e => set('portrait_consent', e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-pink-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">肖像与案例授权（选勾）</p>
            <p className="text-xs text-gray-500 mt-1">同意主办方在征得我确认后，将活动照片、脱单成功案例（匿名化处理）用于公众号、短视频等宣传。未勾选则不使用。</p>
          </div>
        </label>
      </div>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        🔒 隐私保障：身份证、工作证明、学历证明等敏感证件仅用于现场核验真伪，核验后立即删除、不留存原件或影像，仅记录「审核通过」标记。您的信息严格保密，仅用于活动匹配。
      </p>
    </>
  );
}

// ─── Success screen ──────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-5xl">💝</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">已提交审核！</h2>
        <p className="text-gray-600 mb-2">您的资料已提交，工作人员核验后即入库</p>
        <p className="text-gray-500 text-sm mb-8">工作人员将在 1-3 个工作日内通过微信联系您</p>
        <div className="bg-white rounded-2xl p-5 text-left shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">温馨提示</p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>✅ 请保持微信畅通，留意好友申请</li>
            <li>✅ 审核通过后将邀请您参加活动</li>
            <li>✅ 活动名额有限，优质嘉宾优先安排</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  function validate() {
    if (step === 0) {
      if (!form.nickname.trim()) return '请填写昵称';
      if (!form.birth_date) return '请选择出生日期';
      if (!form.district) return '请选择所在区域';
      if (!form.height) return '请填写身高';
    }
    if (step === 1) {
      if (!form.occupation.trim()) return '请填写职业';
      if (!form.education) return '请选择学历';
    }
    if (step === 5) {
      if (!form.contact.trim()) return '请填写微信号';
      if (form.phone && !/^1\d{10}$/.test(form.phone)) return '手机号格式不正确';
      if (form.id_last4 && form.id_last4.length !== 4) return '身份证后四位需填写4位';
      if (!form.single_promise) return '请勾选《单身承诺书》后再提交';
      if (!form.agree_disclaimer) return '请阅读并同意《活动参与免责协议》';
    }
    return '';
  }

  function next() {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else submit();
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API}/public/submit`, form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <SuccessScreen />;

  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  // 性格/介绍/择偶步骤可跳过；基本信息、职业、承诺步骤含必填项
  const canSkip = step === 2 || step === 3 || step === 4;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {step > 0 && (
            <button onClick={() => { setStep(s => s - 1); setError(''); }}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg">
              ←
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">{STEPS[step]}</span>
              <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex gap-1 justify-center pb-3">
          {STEPS.map((s, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-pink-500' : i < step ? 'w-1.5 bg-pink-300' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="px-5 pt-6 pb-2">
        {step === 0 && (
          <div className="mb-4 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 leading-relaxed">
            🔒 本页面为<strong className="text-gray-700">内部邀请制报名通道</strong>，仅限受邀嘉宾填写，谢绝公开传播。
            所填资料仅用于活动审核与匹配，严格保密。
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">💕</span>
          <h1 className="text-xl font-bold text-gray-900">嘉宾报名</h1>
        </div>
        <p className="text-sm text-gray-400">
          {['填写您的基本信息', '职业背景与个人条件', '您的性格与生活方式', '让对方先了解您', '您期望的另一半是什么样的', '承诺声明与联系方式'][step]}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-4 pb-36 overflow-y-auto">
        {step === 0 && <Step1 form={form} set={set} />}
        {step === 1 && <Step2 form={form} set={set} />}
        {step === 2 && <StepPersonality form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} />}
        {step === 4 && <Step4 form={form} set={set} />}
        {step === 5 && <Step5 form={form} set={set} />}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 shadow-lg">
        {error && (
          <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}
        <button onClick={next} disabled={submitting}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-base rounded-2xl shadow-md active:scale-95 transition-transform disabled:opacity-60">
          {submitting ? '提交中...' : step === STEPS.length - 1 ? '提交审核 ✅' : '下一步 →'}
        </button>
        {canSkip && (
          <button onClick={() => { setError(''); setStep(s => s + 1); }}
            className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600">
            跳过，稍后填写
          </button>
        )}
      </div>
    </div>
  );
}
