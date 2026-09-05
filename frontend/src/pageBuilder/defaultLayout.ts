import type { BuilderDocument, BuilderNode, NodeType } from './schema';

const n = (partial: {
  id: string;
  type: NodeType;
  props?: Record<string, any>;
  style?: Record<string, any>;
  children?: BuilderNode[];
}): BuilderNode => ({
  id: partial.id,
  type: partial.type,
  props: partial.props ?? {},
  style: partial.style ?? {},
  children: partial.children ?? [],
});

export const DEFAULT_DOCUMENT: BuilderDocument = (() => {
  const page = n({
    id: 'page',
    type: 'page',
    props: {},
    style: {},
    children: [
      n({
        id: 'hero',
        type: 'section',
        props: { label: 'Hero' },
        style: {},
        children: [
          n({
            id: 'hero_bg_image',
            type: 'image',
            props: { label: 'Hero Background', src: '', alt: 'Hero Background', fit: 'cover' },
            style: { width: '100%', height: '100%' },
          }),
          n({
            id: 'hero_title',
            type: 'text',
            props: {
              label: 'Hero Title',
              text: 'الهيئة الوطنية للعدول بالمغرب',
              variant: 'h1',
              align: 'right',
              bold: true,
            },
            style: {},
          }),
          n({
            id: 'hero_sub',
            type: 'text',
            props: {
              label: 'Hero Subtitle',
              text: 'منصة التوثيق العدلي الإلكتروني',
              variant: 'p',
              align: 'right',
              bold: false,
            },
            style: {},
          }),
          n({
            id: 'hero_btn_primary',
            type: 'button',
            props: { label: 'Primary Button', text: 'ابدأ الآن - مجاناً', href: '/register' },
            style: {},
          }),
          n({
            id: 'hero_btn_secondary',
            type: 'button',
            props: { label: 'Secondary Button', text: 'اكتشف المميزات', href: '#features' },
            style: {},
          }),
        ],
      }),
      n({
        id: 'features',
        type: 'section',
        props: { label: 'Features' },
        style: {},
        children: [
          n({
            id: 'features_heading',
            type: 'text',
            props: { label: 'Features Heading', text: 'منصة متكاملة للإدارة العدلية', variant: 'h2', align: 'center', bold: true },
            style: {},
          }),
          n({
            id: 'features_subtitle',
            type: 'text',
            props: {
              label: 'Features Subtitle',
              text: 'اكتشف كيف يمكن لنظامنا الرقمي تحسين كفاءة عملك وتوفير الوقت',
              variant: 'p',
              align: 'center',
              bold: false,
            },
            style: {},
          }),
          n({
            id: 'card1',
            type: 'card',
            props: { label: 'Card 1', icon: '⚖️' },
            style: {},
            children: [
              n({
                id: 'card1_title',
                type: 'text',
                props: { label: 'Card 1 Title', text: 'خدمات العدول', variant: 'h3', align: 'right', bold: true },
                style: {},
              }),
              n({
                id: 'card1_body',
                type: 'text',
                props: { label: 'Card 1 Body', text: 'تسهيل عملية التوثيق والتعاقد', variant: 'p', align: 'right', bold: false },
                style: {},
              }),
            ],
          }),
          n({
            id: 'card2',
            type: 'card',
            props: { label: 'Card 2', icon: '💻' },
            style: {},
            children: [
              n({
                id: 'card2_title',
                type: 'text',
                props: { label: 'Card 2 Title', text: 'الفضاء الرقمي', variant: 'h3', align: 'right', bold: true },
                style: {},
              }),
              n({
                id: 'card2_body',
                type: 'text',
                props: { label: 'Card 2 Body', text: 'خدمات إلكترونية متكاملة', variant: 'p', align: 'right', bold: false },
                style: {},
              }),
            ],
          }),
          n({
            id: 'card3',
            type: 'card',
            props: { label: 'Card 3', icon: '🤝' },
            style: {},
            children: [
              n({
                id: 'card3_title',
                type: 'text',
                props: { label: 'Card 3 Title', text: 'المساعدة القضائية', variant: 'h3', align: 'right', bold: true },
                style: {},
              }),
              n({
                id: 'card3_body',
                type: 'text',
                props: { label: 'Card 3 Body', text: 'دعم وإرشاد قانوني', variant: 'p', align: 'right', bold: false },
                style: {},
              }),
            ],
          }),
        ],
      }),
      n({
        id: 'ai',
        type: 'section',
        props: { label: 'AI' },
        style: {},
        children: [
          n({
            id: 'ai_badge',
            type: 'text',
            props: { label: 'AI Badge', text: 'مدعوم بالذكاء الاصطناعي', variant: 'span', align: 'center', bold: true },
            style: {},
          }),
          n({
            id: 'ai_title',
            type: 'text',
            props: { label: 'AI Title', text: 'العدل المساعد الذكي', variant: 'h2', align: 'center', bold: true },
            style: {},
          }),
          n({
            id: 'ai_subtitle',
            type: 'text',
            props: {
              label: 'AI Subtitle',
              text: 'تقنية متقدمة لمساعدتك في مراجعة العقود واكتشاف الأخطاء القانونية بسرعة.',
              variant: 'p',
              align: 'center',
              bold: false,
            },
            style: {},
          }),
          n({
            id: 'ai_card1',
            type: 'card',
            props: { label: 'AI Card 1', icon: '🧠' },
            style: {},
            children: [
              n({
                id: 'ai_card1_title',
                type: 'text',
                props: { label: 'AI Card 1 Title', text: 'مراجعة تلقائية', variant: 'h3', align: 'right', bold: true },
                style: {},
              }),
              n({
                id: 'ai_card1_body',
                type: 'text',
                props: {
                  label: 'AI Card 1 Body',
                  text: 'فحص فوري لجميع بنود العقد واكتشاف أي تناقضات أو نقاط ضعف',
                  variant: 'p',
                  align: 'right',
                  bold: false,
                },
                style: {},
              }),
            ],
          }),
          n({
            id: 'ai_card2',
            type: 'card',
            props: { label: 'AI Card 2', icon: '🔒' },
            style: {},
            children: [
              n({
                id: 'ai_card2_title',
                type: 'text',
                props: { label: 'AI Card 2 Title', text: 'توصيات ذكية', variant: 'h3', align: 'right', bold: true },
                style: {},
              }),
              n({
                id: 'ai_card2_body',
                type: 'text',
                props: {
                  label: 'AI Card 2 Body',
                  text: 'اقتراحات تلقائية لتحسين صياغة العقود وفق أفضل الممارسات القانونية',
                  variant: 'p',
                  align: 'right',
                  bold: false,
                },
                style: {},
              }),
            ],
          }),
          n({
            id: 'ai_card3',
            type: 'card',
            props: { label: 'AI Card 3', icon: '⚡' },
            style: {},
            children: [
              n({
                id: 'ai_card3_title',
                type: 'text',
                props: { label: 'AI Card 3 Title', text: 'إجابات فورية', variant: 'h3', align: 'right', bold: true },
                style: {},
              }),
              n({
                id: 'ai_card3_body',
                type: 'text',
                props: {
                  label: 'AI Card 3 Body',
                  text: 'احصل على إجابات قانونية دقيقة لأي استفسار في ثوانٍ معدودة',
                  variant: 'p',
                  align: 'right',
                  bold: false,
                },
                style: {},
              }),
            ],
          }),
        ],
      }),
      n({
        id: 'roles',
        type: 'section',
        props: { label: 'Roles' },
        style: {},
        children: [
          n({
            id: 'roles_title',
            type: 'text',
            props: { label: 'Roles Title', text: 'للجميع في المنظومة العدلية', variant: 'h2', align: 'center', bold: true },
            style: {},
          }),
          n({
            id: 'roles_subtitle',
            type: 'text',
            props: {
              label: 'Roles Subtitle',
              text: 'نظام شامل يخدم جميع الأطراف في العملية العدلية بكفاءة واحترافية',
              variant: 'p',
              align: 'center',
              bold: false,
            },
            style: {},
          }),
          n({
            id: 'role1',
            type: 'card',
            props: { label: 'Role 1', icon: '🏛️', badge: 'نظام داخلي سري', theme: 'light' },
            style: {},
            children: [
              n({
                id: 'role1_title',
                type: 'text',
                props: { label: 'Role 1 Title', text: 'السلطة الحكومية', variant: 'h3', align: 'center', bold: true },
                style: {},
              }),
              n({
                id: 'role1_body',
                type: 'text',
                props: { label: 'Role 1 Body', text: 'الإشراف والمراقبة الشاملة', variant: 'p', align: 'center', bold: false },
                style: {},
              }),
            ],
          }),
          n({
            id: 'role2',
            type: 'card',
            props: { label: 'Role 2', icon: '📜', badge: 'نظام داخلي سري', theme: 'light' },
            style: {},
            children: [
              n({
                id: 'role2_title',
                type: 'text',
                props: { label: 'Role 2 Title', text: 'الهيئة الوطنية للعدول', variant: 'h3', align: 'center', bold: true },
                style: {},
              }),
              n({
                id: 'role2_body',
                type: 'text',
                props: { label: 'Role 2 Body', text: 'إدارة شؤون العدول', variant: 'p', align: 'center', bold: false },
                style: {},
              }),
            ],
          }),
          n({
            id: 'role3',
            type: 'card',
            props: { label: 'Role 3', icon: '⚖️', badge: 'نظام داخلي سري', theme: 'light' },
            style: {},
            children: [
              n({
                id: 'role3_title',
                type: 'text',
                props: { label: 'Role 3 Title', text: 'القاضي المكلف', variant: 'h3', align: 'center', bold: true },
                style: {},
              }),
              n({
                id: 'role3_body',
                type: 'text',
                props: { label: 'Role 3 Body', text: 'إصدار الأذونات', variant: 'p', align: 'center', bold: false },
                style: {},
              }),
            ],
          }),
          n({
            id: 'role4',
            type: 'card',
            props: { label: 'Role 4', icon: '✍️', badge: '✅ التسجيل متاح', theme: 'gold' },
            style: {},
            children: [
              n({
                id: 'role4_title',
                type: 'text',
                props: { label: 'Role 4 Title', text: 'العدل', variant: 'h3', align: 'center', bold: true },
                style: {},
              }),
              n({
                id: 'role4_body',
                type: 'text',
                props: { label: 'Role 4 Body', text: 'إدارة العقود والوثائق', variant: 'p', align: 'center', bold: false },
                style: {},
              }),
            ],
          }),
          n({
            id: 'roles_note_title',
            type: 'text',
            props: { label: 'Roles Note Title', text: 'ملاحظة مهمة', variant: 'h3', align: 'center', bold: true },
            style: {},
          }),
          n({
            id: 'roles_note_text',
            type: 'text',
            props: {
              label: 'Roles Note Text',
              text: 'التسجيل العام متاح فقط للعدول. الأدوار الأخرى تستخدم نظام تسجيل داخلي خاص بصلاحيات عليا.',
              variant: 'p',
              align: 'center',
              bold: false,
            },
            style: {},
          }),
        ],
      }),
    ],
  });

  return { version: 2, root: page };
})();
