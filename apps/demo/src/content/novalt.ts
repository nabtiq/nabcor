import type { SiteContent } from '@nabcor/core';

/**
 * Novalt — a fictional technology company. This content file is the single
 * source of truth for the demo site: every section, both locales. It exercises
 * every section type in the nabcor schema so the theme contract is proven
 * end-to-end.
 */
export const content: SiteContent = {
  business: {
    name: { en: 'Novalt', ar: 'نوفالت' },
    tagline: {
      en: 'Software that compounds — product engineering for teams that ship.',
      ar: 'برمجيات تُراكم القيمة — هندسة منتجات للفرق التي تُطلق بثقة.',
    },
    logo: '/media/brand/logo.svg',
    email: 'hello@novalt.example',
    phone: '+44 20 7946 0999',
    whatsapp: '441234567890',
    address: { en: 'London · Remote-first', ar: 'لندن · عن بُعد أولاً' },
    social: {
      linkedin: 'https://www.linkedin.com/company/novalt',
      x: 'https://x.com/novalt',
      instagram: 'https://instagram.com/novalt',
    },
  },
  locales: ['ar', 'en'],
  defaultLocale: 'en',
  seo: {
    siteUrl: 'https://novalt.example',
    ogImage: '/media/hero/hero-primary.png',
    index: true,
  },
  sections: [
    {
      type: 'hero',
      id: 'hero',
      recipe: 'split-image-right',
      eyebrow: { en: 'Product engineering studio', ar: 'استوديو هندسة المنتجات' },
      headline: {
        en: 'Ship faster without shipping debt.',
        ar: 'أطلق أسرع دون أن تُراكم الديون التقنية.',
      },
      subheadline: {
        en: 'Novalt designs and builds resilient web platforms — from the first prototype to the systems that carry millions of requests.',
        ar: 'تُصمم نوفالت وتبني منصات ويب مرنة — من النموذج الأول إلى الأنظمة التي تتحمل ملايين الطلبات.',
      },
      cta: { label: { en: 'Start a project', ar: 'ابدأ مشروعاً' }, href: '#contact' },
      secondaryCta: { label: { en: 'Our work', ar: 'أعمالنا' }, href: '#portfolio' },
      media: { src: '/media/hero/hero-primary.png', alt: { en: 'Abstract violet product visual', ar: 'تصميم بنفسجي تجريدي للمنتج' } },
      agentSummary: {
        en: 'Novalt is a product engineering studio that builds resilient web platforms from prototype to scale.',
        ar: 'نوفالت استوديو لهندسة المنتجات يبني منصات ويب مرنة من النموذج حتى التوسّع.',
      },
    },
    {
      type: 'stats',
      id: 'stats',
      heading: { en: 'Measured, not claimed', ar: 'مُقاسة، لا مُدّعاة' },
      items: [
        { value: { en: '120+', ar: '+120' }, label: { en: 'Products shipped', ar: 'منتج تم إطلاقه' } },
        { value: { en: '99.98%', ar: '99.98%' }, label: { en: 'Median uptime', ar: 'متوسط زمن التشغيل' } },
        { value: { en: '11 yrs', ar: '11 سنة' }, label: { en: 'Average team tenure', ar: 'متوسط خبرة الفريق' } },
        { value: { en: '4 wks', ar: '4 أسابيع' }, label: { en: 'To first release', ar: 'حتى أول إصدار' } },
      ],
    },
    {
      type: 'services',
      id: 'services',
      recipe: 'grid-3up',
      heading: { en: 'What we do', ar: 'ماذا نُقدّم' },
      items: [
        {
          slug: 'product-engineering',
          title: { en: 'Product engineering', ar: 'هندسة المنتجات' },
          description: {
            en: 'Full-stack teams that own outcomes: discovery, build, and iteration against real usage.',
            ar: 'فرق متكاملة تملك النتائج: الاستكشاف، البناء، والتحسين وفق الاستخدام الحقيقي.',
          },
        },
        {
          slug: 'platform',
          title: { en: 'Platform & cloud', ar: 'المنصات والسحابة' },
          description: {
            en: 'Infrastructure that scales quietly — CI/CD, observability, and cost you can predict.',
            ar: 'بنية تحتية تتوسع بهدوء — نشر مستمر، مراقبة، وتكلفة يمكن التنبؤ بها.',
          },
        },
        {
          slug: 'design-systems',
          title: { en: 'Design systems', ar: 'أنظمة التصميم' },
          description: {
            en: 'Token-driven component libraries that keep every screen consistent as you grow.',
            ar: 'مكتبات مكوّنات مبنية على الرموز تُبقي كل شاشة متسقة مع نموّك.',
          },
        },
      ],
      agentSummary: {
        en: 'Services: product engineering, platform & cloud, and token-driven design systems.',
        ar: 'الخدمات: هندسة المنتجات، المنصات والسحابة، وأنظمة تصميم مبنية على الرموز.',
      },
    },
    {
      type: 'process',
      id: 'process',
      heading: { en: 'How we work', ar: 'كيف نعمل' },
      stages: [
        { step: '01', title: { en: 'Frame', ar: 'التأطير' }, body: { en: 'We map the problem, the users, and the constraints before writing a line.', ar: 'نُحدد المشكلة والمستخدمين والقيود قبل كتابة أي سطر.' } },
        { step: '02', title: { en: 'Prototype', ar: 'النموذج' }, body: { en: 'A working slice in weeks, not months — something real to react to.', ar: 'شريحة عاملة خلال أسابيع لا أشهر — شيء حقيقي نتفاعل معه.' } },
        { step: '03', title: { en: 'Build', ar: 'البناء' }, body: { en: 'Production engineering with tests, observability, and a deploy pipeline from day one.', ar: 'هندسة إنتاجية مع اختبارات ومراقبة وخط نشر منذ اليوم الأول.' } },
        { step: '04', title: { en: 'Compound', ar: 'المراكمة' }, body: { en: 'We measure, learn, and reinvest — each release makes the next one cheaper.', ar: 'نقيس ونتعلّم ونُعيد الاستثمار — كل إصدار يجعل التالي أرخص.' } },
      ],
    },
    {
      type: 'portfolio',
      id: 'portfolio',
      heading: { en: 'Selected work', ar: 'أعمال مختارة' },
      projects: [
        { client: { en: 'Meridian Health', ar: 'ميريديان هيلث' }, description: { en: 'Patient portal rebuilt for 2M members.', ar: 'بوابة مرضى أُعيد بناؤها لمليوني مستخدم.' } },
        { client: { en: 'Kite Logistics', ar: 'كايت لوجستيكس' }, description: { en: 'Real-time fleet dashboard and routing.', ar: 'لوحة أسطول لحظية وتخطيط مسارات.' } },
        { client: { en: 'Aria Fintech', ar: 'آريا فينتك' }, description: { en: 'Payments platform, PCI-scoped from day one.', ar: 'منصة مدفوعات ضمن نطاق PCI منذ البداية.' } },
      ],
    },
    {
      type: 'partners',
      id: 'partners',
      heading: { en: 'Trusted alongside', ar: 'موثوقون إلى جانب' },
      // No logos on purpose — mirrors real intake where partners arrive as text.
      partners: [
        { name: { en: 'Vercel', ar: 'فيرسل' } },
        { name: { en: 'Supabase', ar: 'سوبابيس' } },
        { name: { en: 'Stripe', ar: 'سترايب' } },
        { name: { en: 'Linear', ar: 'لينير' } },
      ],
    },
    {
      type: 'testimonial',
      id: 'testimonial',
      heading: { en: 'In their words', ar: 'بكلماتهم' },
      quotes: [
        {
          quote: { en: 'They shipped in six weeks what our last vendor promised in six months.', ar: 'أطلقوا في ستة أسابيع ما وعد به مورّدنا السابق في ستة أشهر.' },
          author: { en: 'Dana Osei', ar: 'دانة أوسي' },
          role: { en: 'VP Product, Meridian', ar: 'نائبة رئيس المنتج، ميريديان' },
        },
        {
          quote: { en: 'The design system paid for itself by the third feature.', ar: 'نظام التصميم غطّى تكلفته بحلول الميزة الثالثة.' },
          author: { en: 'Marco Ruiz', ar: 'ماركو رويز' },
          role: { en: 'CTO, Kite', ar: 'المدير التقني، كايت' },
        },
      ],
    },
    {
      type: 'faq',
      id: 'faq',
      heading: { en: 'Questions, answered', ar: 'أسئلة وإجابات' },
      items: [
        { q: { en: 'How do engagements start?', ar: 'كيف تبدأ التعاملات؟' }, a: { en: 'A short paid discovery to align on scope, then a fixed first milestone you can judge us by.', ar: 'استكشاف مدفوع قصير لمواءمة النطاق، ثم مرحلة أولى محددة تحكمون علينا بها.' } },
        { q: { en: 'Do you work with our team?', ar: 'هل تعملون مع فريقنا؟' }, a: { en: 'Yes — embedded or standalone. We leave you with code, docs, and a team that understands it.', ar: 'نعم — مدمجين أو مستقلين. نترك لكم الشيفرة والوثائق وفريقاً يفهمها.' } },
        { q: { en: 'What stacks do you use?', ar: 'ما التقنيات التي تستخدمونها؟' }, a: { en: 'TypeScript end to end, Next.js, Postgres, and cloud-native infrastructure by default.', ar: 'تايب سكريبت من الطرف للطرف، Next.js، بوستجرس، وبنية سحابية أصيلة افتراضياً.' } },
      ],
    },
    {
      type: 'contact',
      id: 'contact',
      heading: { en: 'Start a project', ar: 'ابدأ مشروعاً' },
      email: 'hello@novalt.example',
      phone: '+44 20 7946 0999',
      whatsapp: '441234567890',
      address: { en: 'London · Remote-first · GMT', ar: 'لندن · عن بُعد أولاً · بتوقيت غرينتش' },
    },
  ],
};

export default content;
