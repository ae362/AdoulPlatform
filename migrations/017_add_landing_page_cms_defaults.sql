-- Add additional CMS defaults for the landing page editor (About / AI / Roles / Nav)
-- Safe to run multiple times.

INSERT INTO cms_content (key, value, type, section, description) VALUES
  -- About section
  ('about_right_icon', '🚀', 'text', 'about', 'Icon/emoji in the about highlight card'),
  ('about_right_title', 'التحول الرقمي الكامل', 'text', 'about', 'Title in the about highlight card'),
  ('about_right_text', 'لا مزيد من الأوراق والملفات المتناثرة. كل شيء منظم ومرتب في منصة واحدة سهلة الاستخدام', 'text', 'about', 'Body text in the about highlight card'),
  ('about_title_line1', 'ودّع الأوراق التقليدية', 'text', 'about', 'About section title (line 1)'),
  ('about_title_line2', 'مرحباً بالمستقبل', 'text', 'about', 'About section title (line 2)'),
  ('about_subtitle', 'نظام متكامل يحول مكتبك العدلي إلى بيئة رقمية 100% بدون أي تعقيدات', 'text', 'about', 'About section subtitle'),
  ('about_bullets', '[{\"title\":\"توفير 70% من الوقت\",\"description\":\"إنجاز المعاملات في دقائق بدلًا من ساعات\"},{\"title\":\"دقة 99.9%\",\"description\":\"مع تقليل الأخطاء البشرية إلى الحد الأدنى\"},{\"title\":\"أمان متقدم\",\"description\":\"تشفير عالي المستوى وحماية للمعطيات\"}]', 'json', 'about', 'JSON list of about bullet points'),

  -- AI section
  ('ai_badge', 'مدعوم بالذكاء الاصطناعي', 'text', 'ai', 'AI section badge'),
  ('ai_title', 'العدل المساعد الذكي', 'text', 'ai', 'AI section title'),
  ('ai_subtitle', 'تقنية متقدمة لمساعدتك في مراجعة العقود واكتشاف الأخطاء القانونية بسرعة.', 'text', 'ai', 'AI section subtitle'),
  ('ai_cards', '[{\"title\":\"مراجعة تلقائية\",\"description\":\"تحليل نصوص الرسم واكتشاف النواقص والملاحظات\",\"icon\":\"🧠\"},{\"title\":\"توصيات محترفة\",\"description\":\"اقتراحات صياغية ومهنية وفق نماذج معتمدة\",\"icon\":\"🔒\"},{\"title\":\"إجابات فورية\",\"description\":\"مساعد ذكي يجيب عن استفساراتك بسرعة\",\"icon\":\"⚡\"}]', 'json', 'ai', 'JSON list of AI feature cards'),

  -- Roles section
  ('roles_title', 'للجميع في المنظومة العدلية', 'text', 'roles', 'Roles section title'),
  ('roles_subtitle', 'نظام شامل يخدم جميع الأطراف في العملية العدلية بكفاءة واحترافية', 'text', 'roles', 'Roles section subtitle'),
  ('roles_note_title', 'ملاحظة مهمة', 'text', 'roles', 'Roles section note title'),
  ('roles_note_text', 'التسجيل العام متاح فقط للعدول. الأدوار الأخرى تستخدم نظام تسجيل داخلي خاص بصلاحيات عليا.', 'text', 'roles', 'Roles section note text'),
  ('role_cards', '[{\"title\":\"السلطة الحكومية\",\"description\":\"الإشراف والمراقبة الشاملة\",\"icon\":\"🏛️\",\"badge\":\"نظام داخلي سري\",\"theme\":\"light\"},{\"title\":\"الهيئة الوطنية للعدول\",\"description\":\"إدارة شؤون العدول\",\"icon\":\"📜\",\"badge\":\"نظام داخلي سري\",\"theme\":\"light\"},{\"title\":\"القاضي المكلف\",\"description\":\"إصدار الأذونات\",\"icon\":\"⚖️\",\"badge\":\"نظام داخلي سري\",\"theme\":\"light\"},{\"title\":\"العدل\",\"description\":\"إدارة العقود والوثائق\",\"icon\":\"✍️\",\"badge\":\"✅ التسجيل متاح\",\"theme\":\"gold\"}]', 'json', 'roles', 'JSON list of role cards'),

  -- Nav items (optional: used by the nav editor)
  ('nav_items', '[{\"id\":\"admin\",\"label\":\"الهيئة الوطنية للعدول\",\"items\":[{\"label\":\"هيكلة المجلس الوطني\",\"href\":\"#structure\"},{\"label\":\"التواصل مع المجلس الوطني\",\"href\":\"#contact-national\"},{\"label\":\"المجالس الجهوية\",\"href\":\"#regional-councils\"}]},{\"id\":\"services\",\"label\":\"الخدمات الإلكترونية للعدول\",\"highlighted\":true,\"items\":[{\"label\":\"الخدمات الإلكترونية\",\"href\":\"#certificates\",\"hasAuth\":true},{\"label\":\"الإيداع الإلكتروني\",\"href\":\"#e-deposit\"}]},{\"id\":\"knowledge\",\"label\":\"المكتبة المهنية\",\"items\":[{\"label\":\"الأنشطة والبرامج\",\"href\":\"#activities\"},{\"label\":\"المكتبة الرقمية\",\"href\":\"#media-library\"},{\"label\":\"الأرشيف الرقمي\",\"href\":\"#digital-archive\"},{\"label\":\"الاجتماعات والتكوين\",\"href\":\"#meetings\"}]},{\"id\":\"news\",\"label\":\"الأخبار والتعاميم\",\"items\":[{\"label\":\"تنبيه ذكي\",\"href\":\"#smart-reminder\"},{\"label\":\"مستجدات قانونية\",\"href\":\"#legal-news\"},{\"label\":\"تغييرات تشريعية\",\"href\":\"#legislative-changes\"}]},{\"id\":\"directory\",\"label\":\"دليل العدول\",\"path\":\"/directory\",\"items\":[]}]', 'json', 'nav', 'JSON list for the top navigation (groups + links)')
ON CONFLICT (key) DO NOTHING;

