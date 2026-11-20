export const guides = [
  {
    id: 'start', title: '安装与入门', kicker: '第一次使用',
    summary: '装好油猴和脚本，进入一条具体小节。只看视频、读文档，可以先不配 AI。',
    minutes: 4, keywords: ['安装', '油猴', 'Tampermonkey', '允许用户脚本', '面板', '更新', '开始自动'],
    sourceDocs: ['README.md', 'docs/INSTALL.md', 'docs/GUIDE.md', 'docs/UPDATES.md'],
    sections: [
      {id: 'tampermonkey', title: '先装油猴', html: `<p>在电脑浏览器安装 <a href="https://www.tampermonkey.net/">Tampermonkey（油猴）</a>。Chrome、Edge、Firefox 都可以按扩展商店的提示安装；本教程以电脑浏览器为主。</p><p>打开浏览器的扩展管理，找到油猴的详情页，确认<strong>允许用户脚本</strong>已开启。浏览器没有这个开关时，按油猴自己的提示检查权限。</p><figure><img src="../assets/tampermonkey-permissions.png" alt="油猴扩展详情页，框出允许用户脚本开关" loading="lazy"><figcaption>先检查扩展权限，再安装脚本。</figcaption></figure>`},
      {id: 'install', title: '安装学习助手', html: `<p>打开<a href="https://raw.githubusercontent.com/IrisBud/xuexitong-ai-assistant/main/dist/xuexitong-ai-assistant.user.js">脚本安装地址</a>，等油猴弹出确认页，再点“安装”或“更新”。如果只是打开了代码页面，没有出现油猴确认页，用下面的备用方法。</p><details><summary>安装按钮打不开：用 ZIP 覆盖安装</summary><ol><li>从<a href="https://github.com/IrisBud/xuexitong-ai-assistant/releases/latest">最新正式版</a>下载源码 ZIP 并解压。</li><li>用记事本打开 <code>dist/xuexitong-ai-assistant.user.js</code>，按 Ctrl+A、Ctrl+C 复制全部内容。</li><li>首次安装：油猴图标 → 添加新脚本 → 全选替换默认代码 → Ctrl+S 保存。已有脚本：进入原脚本编辑页，替换全部代码后保存。</li></ol><p>源码 ZIP 不是油猴备份包，不要用“导入备份”安装。更新时保留原脚本，避免丢掉设置。</p></details><p>只启用一份控制同一课程的脚本。以前装过 BG、FACE、PREVIEW 等测试脚本的，先把它们停掉。</p>`},
      {id: 'where', title: '进入一条具体小节', html: `<ol><li>打开学习通，进入自己的课程。</li><li>点击“章节”，再点击“1.1”“1.2”这样的小节名称。</li><li>正文出现视频、文档或测验后，查看右下角的“学习助手”。安装前就打开的页面，需要刷新。</li></ol><p>课程首页和章节目录没有学习面板。大章旁的箭头只负责展开目录，要点击里面的小节名称。</p><figure><img src="../assets/chapter-directory.png" alt="章节目录中可点击的具体小节名称" loading="lazy"><figcaption>先点具体小节，进入正文。</figcaption></figure><figure><img src="../assets/chapter-study.png" alt="具体小节学习页及右下角学习助手的位置" loading="lazy"><figcaption>学习页的面板位置示例，图片中的版本仅作入口示意。</figcaption></figure>`},
      {id: 'no-ai', title: '只看视频、读文档', html: `<p>在面板选择<strong>不接入 AI</strong>，然后点<strong>开始自动</strong>。不用填 Key，也不会发送模型请求。</p><p>这个模式处理音视频和已识别的阅读任务。遇到需要答题的内容，会按当前处理规则记录和接续；需要最后查看待复核项。</p><p>运行时让课程标签保持在前台，电脑不要休眠。具体规则见<a href="./media.html">音视频和阅读</a>。</p>`},
      {id: 'with-ai', title: '需要 AI 辅助答题', html: `<ol><li>打开面板的“接口”区，选择接入 AI。</li><li>添加服务商、地址、模型和自己的 API Key，选择文字或图片用途，保存。</li><li>点“测试 AI”，确认对应用途通过，再点“开始自动”。</li></ol><p>文字题和图片题可以分别配置。不会填接口时，从<a href="./ai.html">接入 AI</a>开始；已经在电脑上用 Codex 或 WorkBuddy 的，可看对应本地连接教程。</p><p>测试也会调用模型，可能产生费用。通过连接测试不代表每道题都能答对。</p>`},
      {id: 'update', title: '以后怎么更新', html: `<p>从旧仓库装过脚本的用户，请用上面的新安装地址覆盖原脚本，保留原脚本及设置。</p><p>点学习助手右上角的更新图标，或在油猴管理面板里对本脚本执行“检查更新”。最终仍要在油猴确认页点“更新”，再刷新学习页核对版本。</p><p>中转页可能需要等待一分钟左右，网络慢时更久；出现确认页前不要急着关闭。数分钟仍没有反应，再按上面的 ZIP 方法覆盖原脚本。</p><p>检查更新失败不会调用 AI，也不代表课程已经停止。完整更新说明保留在<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/UPDATES.md">仓库文档</a>。</p>`}
    ]
  },
  {
    id: 'media', title: '音视频与资料阅读', kicker: '课程学习',
    summary: '看懂倍速、90% 选项和阅读计时。播完以后，还要等平台确认任务点。',
    minutes: 5, keywords: ['视频', '音频', 'PDF', 'Word', '专题', '倍速', '90%', '任务点', '夜间', '前台', '静音'],
    sourceDocs: ['README.md', 'docs/GUIDE.md', 'docs/FEATURES.md', 'src/rate-notice.js', 'src/workflow.js', 'src/homework-runtime.js', 'src/course-hub.js'],
    sections: [
      {id: 'foreground', title: '课程页保持前台', html: `<p>选中正在学习的课程标签，让浏览器窗口可见，不要最小化，也不要让电脑锁屏或休眠。切换标签后，浏览器可能降低检查弹题、结果和导航的频率；视频画面还在动，也不代表这些检查都正常执行。</p><p>作者多次实测，后台无法稳定运行。脚本没有保证后台持续运行的方案。想边做别的事边观察课程，可以参考<a href="./appearance.html#window">独立窗口摆放</a>。</p>`},
      {id: 'playback', title: '音视频按顺序处理', html: `<p>同页多段音视频会依次处理，播放后核对各自的任务点。音视频不需要配置 AI；视频中途弹出的题目需要 AI 才能自动作答。</p><p>静音和倍速在“学习”区设置。音频按完整播放处理，视频可以选择播放至 90% 或 100%，默认是 100%。</p><figure><img src="../assets/panel-study.png" alt="学习区的倍速、静音、视频进度和夜间选项" loading="lazy"><figcaption>面板布局示意，课程和回执为模拟。</figcaption></figure>`},
      {id: 'speed', title: '倍速能改变什么', html: `<p>可选 1×、1.1×、1.2×、1.25×、1.5×、1.75×、2×、4×、8×、16×。选择非 1× 时会先显示友情提示，确认后才采用所选速度。</p><p>部分课程会核对实际累计观看时间。视频更快播完，任务点仍可能没有完成，之后还要等待或重播。不要用进度条代替平台的学习记录。</p><aside><p><strong>播放器本身开放倍速、课程也允许使用的视频：可以</strong>按课程要求正常选择倍速。</p></aside><p>播放器原本限制倍速时，建议保持 1×。强制倍速只能尝试改变播放器速度，不能保证缩短平台认可的学习时间。</p>`},
      {id: 'completion', title: '90% 也要等任务点', html: `<p>选择视频 90% 后，脚本会多留一点进度余量，并核对对应的平台任务点；未确认完成时继续播放。这个选项不适用于音频。</p><p>视频自然结束但任务点还未完成时，脚本会按有界恢复规则等待或尝试重播；仍无法确认的内容会留下待复核记录。<strong>跳过不等于完成</strong>，脚本不会把黄色任务点改成绿色。</p><p>一节里有多个任务时，要分别核对。一个视频变绿，不代表本节的文档、测验或其他视频也完成了。</p>`},
      {id: 'reading', title: '普通文档和专题阅读', html: `<p>PDF、Word 预览采用文档流程：默认停留 30 秒，并滚动到可识别的阅读器底部。跨域、未加载或陌生阅读器可能无法完成，需要查看面板提示。</p><p>“去阅读”打开的专题采用另一套计时：逐项进入目录，每项累计前台、有焦点的 90 秒。切走后不累计有效停留，读完再回到原课程处理剩余内容。</p><p>滚到底、计时结束和目录颜色变化都不能代替平台任务点确认。专题打开的新标签也需要启用同一份脚本。</p>`},
      {id: 'rest', title: '夜间休息和定时休息', html: `<p>正式 1.7.7 默认启用北京时间 23:00—次日 07:00 的夜间休息，可在“学习”区取消。普通章节自动运行进入夜休时，面板可能显示“07:00 后自动继续”；夜间点击开始，也会显示预约提示。请以面板当前提示确认是否有预约。</p><p>手动停止和预览会清除自动接续意图。讨论任务进入夜休后不自动恢复；独立作业遇到夜休会停止，之后需要显式开始，不能自动续填或续交。出现验证码时也要人工处理后再开始。</p><p>“页面与学习设置”里的<strong>定时休息</strong>是另一项功能，默认关闭；开启后每轮暂停，休息结束需要手动继续。它不等于上面的夜间预约。</p>`}
    ]
  },
  {
    id: 'answers', title: '测验、作业与讨论', kicker: 'AI 辅助',
    summary: '先分清预览、填写、保存和提交。含简答题的测验与独立作业，各有自己的设置。',
    minutes: 6, keywords: ['答题', '单选', '多选', '判断', '填空', '简答', '作业', '讨论', '预览', '暂存', '待批阅', '复查'],
    sourceDocs: ['README.md', 'docs/HOMEWORK.md', 'docs/GUIDE.md', 'src/homework-runtime.js', 'src/core.cjs'],
    sections: [
      {id: 'preview', title: '先看答案，不动页面填写', html: `<p>点<strong>预览 AI 答案</strong>，答案和解析会出现在“记录”区。预览不填写、不保存、不提交；预览期间自动运行会停止。想取消等待，点“停止”或关闭预览。</p><p>预览也可能调用模型并产生费用。它适合先检查答案，再决定如何处理，不能当成已完成测验。</p><figure><img src="../assets/panel-records.png" alt="记录区中的答案预览和待复核记录" loading="lazy"><figcaption>记录区示意，不包含真实成绩证明。</figcaption></figure>`},
      {id: 'chapter', title: '章节测验', html: `<p>当前支持已适配的单选、多选、判断、填空和简答结构。英文题按题目要求的语言回答，中文解析另放；翻译题按目标语言作答。</p><p>有图片、图表、公式图片或读不清的特殊字体时，需要可用的图片接口。文字题通常只发送文字。没有图片接口时，不能把文字模型当成已经看过题图。</p><p>章节自动提交中，选择题若被模型标为低置信度或无法读清，脚本可能随机选择并标注“随机”；填空和简答不会据此随机编造文本。需要先核对时，请使用答案预览。</p><p>同章课前、课后等多份测验会分别处理。一份出现成绩，不代表整章完成；页面结构不支持或缺少有效答案时，需要查看记录并人工核对。</p>`},
      {id: 'essay-policy', title: '整份测验里有简答题', html: `<p>在“学习”区选择简答题策略：<strong>直接提交、暂时保存、直接跳过</strong>。首次使用默认暂时保存，已经保存过的明确选择会保留。</p><p>这个选择作用于整份含简答题的测验，包括其中的客观题。暂存只在核对本次保存成功提示后记为保存，不表示已提交或得分。</p><p>暂存成功的测验可在“暂时保存的测验”列表返回原章节和具体测验；返回不会自行续填或提交。直接跳过不会调用 AI 或填写该份测验。</p>`},
      {id: 'homework', title: '独立作业要手动打开', html: `<ol><li>从课程“作业”入口打开一份作业，并保持前台。</li><li>在面板顶部选择“作业”。</li><li>检查主观题开关和结束后的处理方式，再点“作答当前作业”。</li></ol><p>默认只处理客观题，保留主观题原有内容；作答后不额外点保存或提交。需要 AI 回答计算、简答、论述等已适配主观题时，单独开启，并明确选择暂存或直接提交。</p><figure><img src="../assets/panel-homework.png" alt="作业模式中主观题处理及收尾方式设置" loading="lazy"><figcaption>作业面板示意，填写和平台回执未作真实成绩验收。</figcaption></figure><p>“复查 AI 作答”重新调用接口，逐题与当前填写比较，只列差异，不替换原答。比较一致不保证正确。脚本只处理当前作业，不自动进入下一份。</p>`},
      {id: 'discussion', title: '讨论跟着所在章节处理', html: `<p>讨论属于章节任务，没有单独的讨论模式入口。在“学习”区设置简短、详细或自定义长度；老师明确要求的字数优先，没有明确要求时，简短和详细模式按题意组织，最多 800 字。</p><p>脚本读取老师原帖及对应图片，不把同学回复、头像当成题目。原帖图片需要图片接口。已有人工草稿或真实附件会保护。</p><p>发表后会回课程核对任务点。发表结果不明、或刷新后仍未确认完成时，不反复发表同一条，保留待复核。停止、预览、夜休和验证码会取消讨论操作。</p>`},
      {id: 'results', title: '提交后看平台结果', html: `<p>待批阅表示老师还没给出最终结果。脚本保留已提交内容，不擅自刷新、改答案或重交，再处理可以接续的内容。</p><p>平台给了可匹配的正确答案、并允许重做时，脚本可以按反馈重新处理；没有参考答案时，会按历史得分复核，避免重复提交同一组失败答案。次数仍由平台决定。</p><p>选词拖拽、连线、排序、作图、部分共享文章子题和正式考试交卷，不在通用支持范围内。遇到不支持的页面，请先停止并<a href="./troubleshooting.html#feedback">提供脱敏反馈</a>，不需要为了采集问题重复提交。</p><p><strong>任务点完成、提交成功和满分是不同结果。</strong>最后请在平台检查实际成绩。</p>`}
    ]
  },
  {
    id: 'courses', title: '课程与队列管理', kicker: '课程与队列',
    summary: '一门课从 1.1 接到 1.2，不需要先建队列。队列用来安排多门课程的顺序。',
    minutes: 4, keywords: ['课程', '队列', '勾选', '个人空间', '下一节', '章节', '搜索', '补做', '过期', '账号不匹配'],
    sourceDocs: ['README.md', 'docs/FEATURES.md', 'docs/PANEL_LAYOUT.md', 'src/course-hub.js', 'src/workflow.js'],
    sections: [
      {id: 'one-course', title: '只学当前这门课', html: `<p>打开一条具体小节，点<strong>开始自动</strong>。脚本按当前页面的任务和原生导航接续，不要求先设置多课程队列。</p><p>课程首页、目录页和具体小节是三个位置。学习面板在具体小节里；目录旁的黑体大章通常只是分组，不是可以开始学习的小节。</p><p>如果已完成当前任务，却出现“平台未切换到下一节，请手动导航”，说明导航没有被确认，不能仅凭这句话认定是队列账号出错。处理方法见<a href="./troubleshooting.html#next-chapter">不切下一节</a>。</p>`},
      {id: 'queue', title: '安排多门课程', html: `<ol><li>回到学习通<strong>个人空间</strong>，打开平台的“课程”栏目。</li><li>找到脚本自己的<strong>学习助手 · 课程队列</strong>浮窗。</li><li>在这个浮窗的课程列表里勾选，用“上移”“下移”调整顺序。</li><li>点<strong>开始所选课程</strong>，在当前标签继续。</li></ol><p>要勾选的是助手浮窗里的课程。直接点击平台原生课程名称，通常会打开课程，不会自动把它加入队列。</p><aside><p>正式版 1.7.7 在部分个人空间布局上可能读不到课程列表。如果浮窗里没有复选框，或点“继续队列”却提示过期/账号不匹配，请不要反复点击。先确认自己是否建过队列，再按下面的说明反馈。</p></aside>`},
      {id: 'scope', title: '队列为什么会暂停', html: `<p>队列绑定创建时的浏览器标签和当前账号，保存的有效期为 12 小时。更换账号、课程身份无法匹配、入口变化、过期、人工验证等情况会暂停，防止进入错误课程。</p><p>正式 1.7.7 的“队列已过期或当前账号不匹配”提示比较笼统；没有已创建队列时也可能出现这句话，不能把它当成账号真的换了的证据。</p><p>进入下一门课前，脚本需要看到目录各小节明确的完成标记。未知、未加载或无法匹配的状态不会被当作课程已完成。主动跳过的课程仍需复核。</p>`},
      {id: 'find', title: '在本课找章节', html: `<p>进入学习面板的“课程”区，展开“待刷列表与章节目录”。可搜索名称、筛选未完成或待核对项，再通过平台原有章节入口定位。</p><figure><img src="../assets/panel-course.png" alt="课程区的章节搜索和待刷目录" loading="lazy"><figcaption>课程区布局示意。平台目录状态不等于实际成绩。</figcaption></figure><p>手动点目录切章后，请核对当前页面，再点开始。开始、暂停、跳过是不同动作；“跳过当前章节”会留下待复核记录，不会修改平台任务点。</p>`},
      {id: 'review', title: '回头补做和反馈', html: `<p>“记录”区保存最近跳过的内容，也有集中补做入口。补做前会重新核对当前账号、课程和目录；提交结果不明或归属不符的记录不会直接重新提交。</p><p>暂存测验有独立列表。打开它只负责回到原位置，仍需要自己检查是否保存、是否提交。</p><p>队列有问题时，反馈脚本版本、个人空间课程列表是否正常显示、助手浮窗是否有复选框，以及报错前点了哪个按钮。截图先遮掉姓名、学号、完整课程地址和连接码，具体见<a href="./troubleshooting.html#feedback">反馈方法</a>。</p>`}
    ]
  },
  {
    id: 'ai', title: 'AI 接口配置', kicker: '模型与接口',
    summary: '服务商、地址、模型和 Key 要对应。文字题与图片题可以分别选接口。',
    minutes: 5, keywords: ['AI', 'API', 'Key', 'Base URL', '服务商', '模型', '图片', '文字', '接口', '401', '403', '404', '429', 'JSON'],
    sourceDocs: ['README.md', 'docs/PROVIDERS.md', 'docs/CUSTOM_API.md', 'docs/MODELS.md', 'src/theme.js', 'src/ai.js'],
    sections: [
      {id: 'choose', title: '先选连接方式', html: `<p>有服务商 API Key 的，使用本页的接口配置。已经登录本机 Codex CLI 的，读<a href="./codex.html">本地 Codex</a>；想使用 WorkBuddy 对应账号的 CodeBuddy CLI，读<a href="./workbuddy.html">WorkBuddy 连接</a>。</p><p>内置服务商包括 DeepSeek、Kimi、智谱、通义千问、豆包、小米 MiMo、硅基流动、OpenAI、Claude、Gemini。也可以填写自定义兼容接口。</p><p>模型权限、区域和价格会变化。具体地址、协议和模型目录见<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/PROVIDERS.md">服务商配置</a>和<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/MODELS.md">模型目录</a>，自己的控制台信息仍需核对。</p>`},
      {id: 'fields', title: '在接口区填这几项', html: `<ol><li>服务商：选实际提供 API 的平台。</li><li>Base URL：填平台给的基础地址。使用兼容接口时，不要再把 <code>/chat/completions</code> 粘到末尾；脚本会按协议补全路径。部分平台使用 <code>/api/v3</code> 等地址，不必一律改成 <code>/v1</code>。</li><li>协议：按平台支持的格式选择，OpenAI 兼容、Claude Messages、Gemini 等不能随意互换。</li><li>模型：从下拉框选，或选择“没有我要的模型，手动填写”，复制控制台的完整模型 ID。</li><li>API Key：使用该平台、该区域和套餐对应的 Key。</li><li>用途：先选文字题并保存，需要看图时再配置图片用途。</li></ol><figure><img src="../assets/panel-ai.png" alt="接口区中服务商、地址、模型和用途的填写位置" loading="lazy"><figcaption>接口区布局示意。图中配置不代表任何账号的实际权限。</figcaption></figure>`},
      {id: 'roles', title: '文字和图片分别选', html: `<p>普通文字题走文字用途。题目真正含图片、图表、公式图片或无法还原的字体时，才进入图片流程。页面按钮上的装饰图标不会把文字题变成图片题。</p><p>一个接口可以同时负责两种用途，也可以给文字和图片各选一个。保存后，在“已保存接口”里用“用于文字”“用于图片”切换；每种用途当前只对应一个接口。</p><p>没有可用图片接口时，图片题无法可靠处理，可能留下待复核项；同页缺题时不会把不完整测验直接当成已完成。遇到图片准备失败，不要让文字模型猜图。</p>`},
      {id: 'test', title: '保存后测试', html: `<p>保存设置后，点<strong>测试 AI</strong>。脚本分别报告当前文字和图片用途的结果。图片用随机数字图单独测试，文字通过不代表图片也通过。</p><p>测试会实际调用模型，可能消耗 API 额度或账号积分。服务启动、请求返回成功、测试答案正确和实际题目答对，也是不同的检查。</p><p>不确定时先沿用模型默认推理设置，JSON 模式先不勾。确认接口能用以后，再按该模型的支持范围调整。目录中有型号，不代表你的账号一定有权限。</p>`},
      {id: 'errors', title: '按错误码排查', html: `<table><thead><tr><th>提示</th><th>先检查</th></tr></thead><tbody><tr><td>401 / 403</td><td>Key 是否属于当前平台，账号是否有模型权限，区域或套餐是否匹配。</td></tr><tr><td>404</td><td>基础地址、模型 ID、区域或接入点。不要把文档网页地址当 API 地址。</td></tr><tr><td>400</td><td>协议和模型参数。可先关闭 JSON、推理参数，再手动测试。</td></tr><tr><td>429</td><td>控制台余额、额度与限流。按平台提示等待后再手动尝试。</td></tr><tr><td>返回网页或非 JSON</td><td>地址是否填成服务商首页，协议是否对应，模型是否按所需格式返回。</td></tr></tbody></table><p>反馈错误码和脱敏提示即可，不需要把 Key 发给维护者。第三方兼容接口和 Ollama 等配置见<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/CUSTOM_API.md">独立操作说明</a>。</p>`},
      {id: 'saved', title: '保存、切换和费用', html: `<p>最多保存 30 组接口。保存后 Key 输入框会清空，列表只显示遮挡后的 Key 和最近成功调用时间。配置保存在当前浏览器的油猴存储，不自动同步到其他浏览器。</p><p>更换地址、服务商或协议时，需要重新填写 Key，并会停止当前自动任务。确认新配置和用途、测试通过后再开始。</p><p>预览、复查、重做中的额外求答都可能增加用量。“停止”只能取消本地等待，不能保证服务商撤销已处理的请求。数据如何发送，见<a href="./privacy.html">数据和使用范围</a>。</p>`}
    ]
  },
  {
    id: 'troubleshooting', title: '常见问题与故障排查', kicker: '问题排查',
    summary: '先看卡在哪一步，再收集必要信息。别用反复刷新、重复提交来碰运气。',
    minutes: 5, keywords: ['报错', '故障', '卡住', '不支持题型', '读取成绩', '验证码', '反馈', 'Issue', '下一节', '面板不显示'],
    sourceDocs: ['README.md', 'docs/GUIDE.md', 'docs/INSTALL.md', 'docs/HOMEWORK.md', 'docs/SECURITY.md', 'src/manual-verification.js', 'src/workflow.js'],
    sections: [
      {id: 'panel', title: '没有学习助手面板', html: `<ol><li>确认进的是具体小节正文，或已打开的独立作业，不是课程首页和目录。</li><li>在油猴里确认脚本已启用，浏览器允许用户脚本。</li><li>只保留一份控制这门课的脚本，然后刷新当前页面。</li><li>核对已安装版本。仅在电脑里下载了文件，还不算安装到油猴。</li></ol><p>完整入口步骤见<a href="./start.html#where">进入一条具体小节</a>。</p>`},
      {id: 'next-chapter', title: '不切下一节', html: `<p>先保持课程标签在前台，查看当前视频是否有弹题、是否还显示“继续学习”，以及本节是否还有文档、测验等任务。视频结束和当前任务点变绿，不一定代表本节全部内容都处理完。</p><p>面板明确提示“平台未切换到下一节，请手动导航”时，先点<strong>停止</strong>，核对页面原生“下一节”和目录是否可用。自己打开下一条小节后，再点开始。不要把这种导航失败直接解释成 API 断连。</p><p>本课切节不需要多课程队列。队列显示为空、过期或账号不符时，按<a href="./courses.html">课程与队列</a>区分处理。正式 1.7.7 的部分页面兼容问题仍需对应真实结构确认。</p>`},
      {id: 'questions', title: '提示题型不支持', html: `<p>先记录题目显示的题型和完整提示，点停止。选项是方框或圆圈，只能帮助判断外观，不能单独证明脚本为什么识别失败。</p><p>可提供第一道失败题的脱敏截图或维护者指定的只读采集结果。题干、选项、编辑区、保存按钮和子页面关系，可能需要一起确认；不要只截错误提示。</p><p>不需要为了复现而重新提交、重做、休眠或切换到陌生题目。已经填过或提交过的内容先保留。</p>`},
      {id: 'result', title: '一直显示读取成绩', html: `<p>先看平台是否正在判题、待批阅，或者当前仍停留在原答题页。脚本状态文字不是成绩本身。</p><p>不要连续点提交或重做。结果不明时先停止，保留页面和已填写内容。反馈时说明平台有没有成功提示、成绩是否可见、是否曾手动刷新，以及脚本停在哪一句。</p><p>如果开发者工具显示 <code>Paused in debugger</code>，浏览器脚本可能被调试暂停。把这个状态单独说明，不要把它当成已经确认的题型或成绩读取根因。</p>`},
      {id: 'verification', title: '出现验证码或人工验证', html: `<p>脚本识别到已适配的人工验证表单后，会暂停播放、导航、预览和模型请求。验证码需要自己完成；脚本不识别或填写。</p><p>验证消失或刷新页面后，仍可能保持人工暂停。先确认验证完成，再手动点击开始；不要为了恢复运行反复触发验证码。</p><p>正式考试、监考和平台禁止继续的情况，交回平台原有流程处理。</p>`},
      {id: 'feedback', title: '反馈时给这些信息', html: `<ol><li>脚本版本、浏览器、油猴或其他脚本管理器版本。</li><li>预期做什么、实际停在哪一步；例如播放、读题、填写、保存、提交、等结果或切章。</li><li>面板完整提示，以及对应位置的一张脱敏截图。已有截图够用时，不必再重截。</li><li>涉及 AI 时给服务商、模型名和错误码；涉及页面结构时，再按维护者提供的只读采集方法补材料。</li></ol><p>可以从“记录”区手动导出脱敏诊断，再自行决定是否上传。它不包含题目原文，也不会自动发给维护者。</p><p>GitHub Issue 是公开的。发送前遮掉姓名、学号、Cookie、Key、本地连接码和带私人参数的完整课程地址。不要导出整份油猴存储给别人。</p><p><a href="https://github.com/IrisBud/xuexitong-ai-assistant/issues/new/choose">前往 GitHub 提交问题</a></p>`}
    ]
  },
  {
    id: 'codex', title: 'Codex 本地连接', kicker: '本地连接',
    summary: '先启动电脑上的连接服务，再把 18763 地址和连接码填进面板。使用期间保留服务窗口。',
    minutes: 6, keywords: ['Codex', 'CLI', '本地', '18763', 'bridge-token', '连接码', 'Node.js', 'ENOENT', 'PowerShell'],
    sourceDocs: ['docs/INSTALL.md', 'src/theme.js', 'src/ai.js', 'package.json'],
    sections: [
      {id: 'requirements', title: '先确认命令行版可用', html: `<p>需要 Node.js 20.11 或更高版本，以及已经登录的 Codex CLI。只装好或登录桌面版 Codex，不代表命令行版已可用。</p><pre><code>node --version
npm --version
codex --version
codex login status</code></pre><p>前三条应显示版本，最后一条应显示登录状态。缺少环境时，先按<a href="https://nodejs.org/zh-cn/download">Node.js 官方下载</a>和<a href="https://learn.chatgpt.com/docs/codex/cli">Codex CLI 官方说明</a>完成安装登录。</p>`},
      {id: 'folder', title: '解压完整源码，进对文件夹', html: `<ol><li>下载并解压<a href="https://github.com/IrisBud/xuexitong-ai-assistant/releases/latest">最新正式版源码 ZIP</a>。</li><li>打开解压后的项目文件夹，能看见 <code>package.json</code>。</li><li>Windows 文件管理器地址栏输入 <code>powershell</code> 并回车，在这个文件夹打开终端。</li></ol><pre><code>Test-Path .\package.json</code></pre><p>看到 <code>True</code> 再继续。显示 <code>False</code> 或报 <code>ENOENT</code>，说明终端位置不对；回到已解压、含该文件的文件夹重开。不要直接在 ZIP 内运行。</p>`},
      {id: 'start-service', title: '启动并选模型', html: `<pre><code>npm run start:codex</code></pre><p>依次用方向键和回车选择模型、推理强度。首次需要读取本机 CLI 模型目录，稍等即可；不确定时选择模型默认强度。</p><p>正常启动后，会看到本地地址 <code>http://127.0.0.1:18763</code> 和连接码文件位置。窗口停在这里等待浏览器连接是正常的，保持打开，不用继续输入命令。这个服务按教程启动不需要先执行 <code>npm install</code>。</p><p>模型列表可见不等于账号权限已验证。模型和强度以服务启动菜单为准，浏览器里其他 API 的模型下拉框、桌面聊天窗口的选项不会直接替本服务切换。</p>`},
      {id: 'panel', title: '填入面板并测试', html: `<ol><li>打开 <code>src/local/bridge-token.txt</code>，复制完整连接码。</li><li>学习助手“接口 → 添加 / 编辑接口”，选择本地 Codex。</li><li>地址填写 <code>http://127.0.0.1:18763</code>，Key 填连接码，先分配文字用途并保存。</li><li>点“测试 AI”。要处理图片，再分配图片用途并测试。</li></ol><p>只启动服务不等于模型验证成功。正式 1.7.7 的测试会实际检查文字答案及已选图片用途，可能消耗模型用量；图片失败不推翻已经通过的文字结果。</p><p>连接码只用于这份本地服务，不要填写平台登录密码，也不要发给别人。</p>`},
      {id: 'next-time', title: '下次启动和常见报错', html: `<p>在原来含 <code>package.json</code> 的文件夹重新运行 <code>npm run start:codex</code>，确认菜单即可。地址和连接码没变时，面板保存的配置可以继续用。</p><table><thead><tr><th>现象</th><th>处理</th></tr></thead><tbody><tr><td>连接不上本机</td><td>先看服务窗口是否还开着，再核对端口。服务窗口可以最小化，课程浏览器仍需前台。</td></tr><tr><td>401 / 连接码无效</td><td>从当前服务文件夹的 bridge-token.txt 重新复制完整连接码。</td></tr><tr><td>npm.ps1 被系统策略阻止</td><td>用 <code>npm.cmd run start:codex</code>，不需要为此修改系统执行策略。</td></tr><tr><td>想换模型</td><td>服务窗口 Ctrl+C 停止，再运行启动命令，在菜单里重选。</td></tr></tbody></table><p>关闭服务窗口或按 Ctrl+C 会停止服务。停止浏览器里的任务，只会取消本次等待，不等于撤销已发生的模型用量。</p>`}
    ]
  },
  {
    id: 'workbuddy', title: 'WorkBuddy / CodeBuddy 连接', kicker: '本地连接',
    summary: '使用官方 CodeBuddy CLI，登录与 WorkBuddy 相同的站点和账号。积分能否使用，要查自己的用量明细。',
    minutes: 6, keywords: ['WorkBuddy', 'CodeBuddy', '积分', '18764', '官方CLI', 'codebuddy-token', '账号', '登录'],
    sourceDocs: ['docs/WORKBUDDY.md', 'README.md', 'package.json', 'src/codebuddy-runner.mjs'],
    sections: [
      {id: 'requirements', title: '准备完整源码和 Node.js', html: `<p>此连接从正式版 1.7.7 提供。只安装油猴脚本还不够：先下载并解压<a href="https://github.com/IrisBud/xuexitong-ai-assistant/releases/latest">完整源码 ZIP</a>，进入含 <code>package.json</code> 的文件夹，再打开终端。</p><p>需要 Node.js 20.11 或更高版本。Windows、macOS、Linux 都按各自终端运行；下面命令在项目目录执行。</p><pre><code>node --version
npm --version</code></pre>`},
      {id: 'install-cli', title: '安装官方 CLI', html: `<pre><code>npm install --prefix ./src/local/codebuddy --cache ./src/local/npm-cache --no-audit --no-fund @tencent-ai/codebuddy-code@2.177.1</code></pre><p>这条命令把 CLI 和缓存放在项目私有目录。首次安装的依赖较大，失败时保留终端错误，不要从别人处导入登录文件或账号凭据。</p><p>已经安装官方 CLI 的用户，也可以沿用自己的安装。程序找不到时，再按<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/WORKBUDDY.md">完整连接说明</a>设置实际入口。</p>`},
      {id: 'login', title: '登录本人账号', html: `<pre><code>npm run login:codebuddy</code></pre><p>按官方菜单选择与 WorkBuddy <strong>相同站点、相同账号</strong>，在官方页面完成登录。国内站、国际站、企业账号要分别核对，不能只因为账号名称相同就假定可以跨站使用积分。</p><p>首次创建的登录配置在 <code>src/local/codebuddy-config</code>，不要分享。自定义配置目录时，登录与服务启动要使用同一个目录，否则可能出现“已经登录但仍要求认证”。</p>`},
      {id: 'service', title: '启动 18764 本地服务', html: `<pre><code>npm run start:codebuddy</code></pre><p>保持服务窗口开启。默认地址为 <code>http://127.0.0.1:18764</code>，模型交由 CLI 选择。若需指定模型，使用自己账号已确认可用的完整 ID，具体环境变量见完整连接说明。</p><p>不要把 WorkBuddy 积分数量、模型显示名称或其他平台的 ID 当成本平台模型 ID。面板不会覆盖本服务启动时选定的模型。</p><p>Codex 服务使用 18763；两种服务的端口和连接码不同，不要混填。</p>`},
      {id: 'panel', title: '保存到学习助手', html: `<ol><li>面板“接口 → 添加 / 编辑接口”，选择<strong>本地 CodeBuddy / WorkBuddy</strong>。</li><li>Base URL 填 <code>http://127.0.0.1:18764</code>。</li><li>打开 <code>src/local/codebuddy-token.txt</code>，将完整连接码填入“API Key / 本地连接码”。</li><li>先选择文字用途，保存并点“测试 AI”。需要图片，再配置图片用途并单独测试。</li></ol><p>不要填 WorkBuddy 密码、Cookie、其他 API Key，或 Codex 的连接码。服务能连接后，还要通过实际模型测试；文字和图片分别报告结果。</p>`},
      {id: 'credits', title: '自己核对积分和模型权限', html: `<p>测试和答题可能消耗账号积分。先在官方“套餐与用量”记下时间，只做一次文字测试，再看对应的模型调用明细，核对账号、站点、模型、扣减类型和时间。</p><p>模型限免、入账延迟和奖励使用范围都会影响账面变化。不能只看积分总数下降，就认定某类奖励积分已经可用于此连接。</p><p>已有一个国内站账号完成过合成文字、数字图片测试，并核对到 CLI 基础积分消耗；奖励积分未完成实际扣减验收。这些结果不代表其他账号权限，也不证明真实课程填写、提交或得分。</p><p><a href="https://www.codebuddy.cn/docs/cli/quickstart">官方安装与登录</a> · <a href="https://www.codebuddy.cn/docs/workbuddy/Usage">官方用量查询</a> · <a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/WORKBUDDY.md">完整连接与排错</a></p>`}
    ]
  },
  {
    id: 'appearance', title: '面板、外观与窗口设置', kicker: '用得顺手',
    summary: '找到五个工作区，调整主题和静音。窗口摆放方便观察，不保证后台稳定运行。',
    minutes: 4, keywords: ['面板', '主题', '山行', '潮汐', '14套', '静音', '窗口', '动效', '折叠', '拖动', '窄屏'],
    sourceDocs: ['docs/PANEL_LAYOUT.md', 'docs/THEMES.md', 'docs/TAB_MUTE.md', 'docs/WINDOW_LAYOUT.md', 'docs/PANEL_MOTION.md', 'src/rate-notice.js'],
    sections: [
      {id: 'workspaces', title: '五个工作区', html: `<table><thead><tr><th>入口</th><th>找什么</th></tr></thead><tbody><tr><td>学习</td><td>倍速、静音、夜间设置，章节或作业策略；最下方是“页面与学习设置”。</td></tr><tr><td>课程</td><td>章节搜索、未完成筛选、目录定位和课程队列。</td></tr><tr><td>接口</td><td>运行模式，文字和图片配置，已保存接口。</td></tr><tr><td>记录</td><td>答案预览、待复核项、集中补做、暂存测验返回、诊断导出。</td></tr><tr><td>更多</td><td>主题、版本检查、更新说明和反馈。</td></tr></tbody></table><p>切换工作区只改变显示，不会开始学习或提交。开始、停止和状态保留在上方，右上角图标可检查更新。</p><figure><img src="../assets/panel-overview.png" alt="学习助手五个工作区与上方固定操作区" loading="lazy"><figcaption>面板分区示意，课程与接口为模拟。</figcaption></figure>`},
      {id: 'themes', title: '主题怎么换', html: `<p>在“更多”里选择外观。山行、潮汐、默认、奶龙、奶蛙，加上九个 AI 角色主题，共 14 套。山行和潮汐不需要连接 AI，素材已内置。</p><p>文字接口测试通过后，会切到可识别的对应 AI 主题；图片接口不决定主主题。之后仍可手动切回喜欢的主题。主题出现只说明对应连接验证状态，不表示题目已经答对。</p><figure><img src="../assets/themes-preview.png" alt="山行、潮汐或现有主题面板预览" loading="lazy"><figcaption>现有主题展示，具体图片与版本以仓库记录为准。</figcaption></figure><p>角色原设计来源及许可说明保留在<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/THEMES.md">主题图鉴</a>，不代表服务商官方形象或合作关系。</p>`},
      {id: 'mute', title: '标签页静音和播放器静音', html: `<p>勾选“静音播放”时，脚本优先尝试让当前浏览器标签页静音。油猴和浏览器支持并确认成功后，才解除播放器本身的静音；不支持、失败或超时时，保留播放器静音。</p><p>取消勾选只撤销本次脚本设置的标签页静音；原本由你手动设定的静音会保留。不会调整其他标签页或系统总音量。</p><p>修改静音不会启动媒体，也不会恢复已停止的任务。有声自动播放仍可能被浏览器限制；必要时自己点击平台播放按钮。</p>`},
      {id: 'window', title: '把课程放在独立窗口', html: `<p>可以把课程标签拖成独立窗口，保持课程处于选中状态，再把助手面板移到方便观察的位置。这样少切标签，也容易看到需要人工处理的提示。</p><figure><img src="../assets/window-layout.png" alt="课程独立窗口和助手面板的摆放示例" loading="lazy"><figcaption>窗口摆放参考，不是后台稳定运行证明。</figcaption></figure><p>不要最小化课程窗口，也不要让电脑休眠。专题阅读打开新标签时，需让阅读标签获得前台焦点才累计有效停留。完整四步图见<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/WINDOW_LAYOUT.md">窗口摆放说明</a>。</p>`},
      {id: 'motion', title: '收起、窄屏和减少动效', html: `<p>面板可以拖动和收起。页面宽度不超过 600 CSS 像素时，五区入口会自动改为横排；没有单独的手动宽窄按钮。预览网页的屏宽切换不会改变已安装脚本。</p><p>动效可在外观设置关闭，也会遵循系统的“减少动态效果”。动效反馈只是界面状态，不代表保存、提交或学习任务完成。</p><p>“页面与学习设置”里的隐藏选项默认关闭，取消勾选可恢复被隐藏元素。隐藏课程卡片不等于删除课程，也不修改任务点。</p>`}
    ]
  },
  {
    id: 'privacy', title: '数据、费用与使用范围', kicker: '使用前了解',
    summary: '题目发送给自己配置的模型，Key 存在油猴里。任务点、提交提示和实际成绩要分别核对。',
    minutes: 4, keywords: ['隐私', '数据', 'Key', '费用', '安全', '权限', '成绩', '验证', '许可', 'Cookie', '账号'],
    sourceDocs: ['docs/SECURITY.md', 'docs/VALIDATION.md', 'NOTICE.md', 'README.md', 'src/course-hub.js', 'src/ai.js'],
    sections: [
      {id: 'data', title: '题目发到哪里', html: `<p>启用 AI 后，题干、选项、必要的答案反馈会发送到你保存的模型接口。需要看图时还会发送准备好的题目截图。第三方中转或自建网关也能接触该接口使用的 Key 和请求内容，填写前先核对地址。</p><p>项目没有作者运营的 AI 中转服务器，也没有自动收集题库或上传整份课程目录的功能。课程队列会读取本机当前账号标识用于范围核对；这与把登录信息发送给模型是不同的数据用途。</p><p>不接入 AI 模式不发送模型请求。安装更新、平台页面资源和字体字典等普通联网仍可能发生，不能把“不调用模型”理解成完全离线。</p>`},
      {id: 'local', title: '哪些内容保存在本机', html: `<p>接口与 Key、文字/图片用途、外观和学习设置、部分作答状态、待复核和专题进度，保存在浏览器的脚本存储中。接口配置不自动跨浏览器同步。</p><p>油猴存储不是加密保险箱。不要把整份存储、浏览器数据目录、本地 CLI 登录目录或连接码文件发给别人。公开截图也要先检查输入框、地址栏和终端。</p><p>删除配置或清除本地 Key，不会撤销服务商控制台的 Key。真正失效需要到该平台删除或重新生成。</p>`},
      {id: 'cost', title: '哪些操作可能计费', html: `<p>连接测试、图片测试、答案预览、自动答题、复查和重做中的额外求答，都可能产生模型用量。API 按提供方账单计费，本地 CLI 也可能使用账号额度或积分。</p><p>“停止”会取消本地等待和后续页面操作，已经被服务商接收或处理的请求是否退费，由提供方决定。脚本不会代购额度或替用户开通付费订阅。</p><p>只在面板检查公开版本更新，不调用模型。WorkBuddy 积分的使用范围另见<a href="./workbuddy.html#credits">账号明细核对</a>。</p>`},
      {id: 'control', title: '保留人工核对', html: `<p>脚本辅助处理已适配的页面，不保证答案正确、所有页面兼容或无人值守完成课程。验证码、正式考试监考、平台禁止前进和未知结果，都可能需要自己接手。</p><p>预览不填写、不保存、不提交。提交结果不明时，不应反复重交；待批阅保留已提交内容。章节任务点变绿、保存成功、提交成功和实际得分，要在平台分别查看。</p><p>运行时只启用一份控制同一课程的脚本，并按课程允许的方式使用。前台运行条件见<a href="./media.html#foreground">音视频和阅读</a>。</p>`},
      {id: 'evidence', title: '测试通过能说明什么', html: `<p>项目同时保存真实页面结构、隔离浏览器模拟、部分实际操作与账号测试记录。它们验证的事情不同：读取结构不等于写入成功，模拟提交不等于平台收到，任务点完成也不等于满分。</p><p>正式 1.7.7 的本地自动检查包括 149 项单元与 45 组模拟浏览器回归。模拟课程、模型和平台回执不能作为某位用户真实成绩的证明；账号和模型权限也未逐家实调验证。</p><p>具体版本、对应安装字节和尚未验证范围，见<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/VALIDATION.md">验证说明</a>及对应发布记录。</p>`},
      {id: 'sharing', title: '反馈、素材和许可', html: `<p>脱敏诊断由用户手动导出，不自动上传。是否发到公开 Issue 由你决定；先检查是否含私人题目或账号信息。需要反馈时按<a href="./troubleshooting.html#feedback">问题排查中的信息清单</a>准备。</p><p>字体解析依赖、jQuery 和 html2canvas 有各自许可证。角色原设计作者为 B 站 UP 主 <a href="https://space.bilibili.com/4168597">ZipZipPipe</a>，项目不代表模型服务商官方形象或合作。</p><p>代码来源、第三方素材和未确认的再分发许可范围，见<a href="https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/NOTICE.md">来源与许可</a>；不要从“仓库公开”推断所有内容都可任意再分发。</p>`}
    ]
  }
];
