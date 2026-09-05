export const DEFAULT_INTERACTIVE_DOCUMENT_PAGES: string[] = [
  `
  <div class="rich-doc-page">
    <header class="flex items-center justify-between gap-4">
      <img src="{{morocco_logo}}" alt="شعار المملكة" style="width:70px;height:auto;" />
      <div style="text-align:center; line-height:1.6;">
        <div style="font-weight:bold;">المملكة المغربية</div>
        <div>وزارة العدل</div>
        <div>{{court_appeal}}</div>
        <div>{{court_first_instance}}</div>
        <div>{{court_family_section}}</div>
        <div style="margin-top:6px;">ملف الزواج رقم: <strong>{{file_number}}</strong> / {{file_year}}</div>
      </div>
      <img src="{{adoul_logo}}" alt="شعار العدول" style="width:70px;height:auto;" />
    </header>

    <section style="margin-top:18px; font-size:14px;">
      <div>حرر بمدينة <strong>{{court_city}}</strong> بتاريخ <strong>{{request_date_gregorian}}</strong> الموافق لـ <strong>{{request_date_hijri}}</strong></div>
    </section>

    <h2 style="text-align:center;margin-top:28px;font-size:22px;font-weight:bold;">ملف عقد الزواج</h2>

    <section style="margin-top:24px;">
      <h3 style="font-weight:bold;">معلومات الخاطب</h3>
      <p>الاسم الكامل: {{husband_name}}</p>
      <p>رقم البطاقة الوطنية: {{husband_cin}}</p>
      <p>تاريخ الازدياد: {{husband_birth_date}}</p>
      <p>مكان الازدياد: {{husband_birth_place}}</p>
      <p>الجنسية: {{husband_nationality}}</p>
      <p>الوضعية العائلية: {{husband_marital_status}}</p>
      <p>المهنة: {{husband_occupation}}</p>
      <p>محل السكنى أو الإقامة: {{husband_residence}}</p>
    </section>

    <section style="margin-top:24px;">
      <h3 style="font-weight:bold;">معلومات المخطوبة</h3>
      <p>الاسم الكامل: {{wife_name}}</p>
      <p>رقم البطاقة الوطنية: {{wife_cin}}</p>
      <p>تاريخ الازدياد: {{wife_birth_date}}</p>
      <p>مكان الازدياد: {{wife_birth_place}}</p>
      <p>الجنسية: {{wife_nationality}}</p>
      <p>الوضعية العائلية: {{wife_marital_status}}</p>
      <p>المهنة: {{wife_occupation}}</p>
      <p>محل السكنى أو الإقامة: {{wife_residence}}</p>
    </section>

    <section style="margin-top:24px;">
      <h3 style="font-weight:bold;">بيانات السجل العدلي</h3>
      <p>نوع السجل: {{registry_book_type}}</p>
      <p>رقم السجل: {{registry_number}} | العدد: {{registry_count}} | الصفحة: {{registry_page}} | الحرف: {{registry_letter}}</p>
      <p>تاريخ الإدراج: {{inclusion_date}} ({{inclusion_hijri}})</p>
      <p>رقم الإذن بتوثيق الزواج: {{marriage_authorization_no}}</p>
    </section>
  </div>
  `,
  `
  <div class="rich-doc-page">
    <header style="text-align:center; margin-bottom:18px;">
      <div style="font-weight:bold;">وثائق الخاطب والمخطوبة</div>
      <div>يمكن تعديل هذه القائمة وإعادة ترتيبها بحرية</div>
    </header>

    <section>
      <h3 style="font-weight:bold;">وثائق الخاطب</h3>
      <ul style="padding-right:20px; line-height:2;">
        <li>شهادة الازدياد عدد {{husband_birth_cert_num}}</li>
        <li>نسخة كاملة من رسم الولادة</li>
        <li>صورة مطابقة للأصل من البطاقة الوطنية رقم {{husband_cin}}</li>
        <li>شهادة السكنى أو رخصة الإقامة</li>
        <li>شهادة طبية تثبت سلامة الخاطب من الأمراض المعدية والخطيرة</li>
        <li>نسخة من السجل العدلي عند الاقتضاء</li>
      </ul>
    </section>

    <section style="margin-top:24px;">
      <h3 style="font-weight:bold;">وثائق المخطوبة</h3>
      <ul style="padding-right:20px; line-height:2;">
        <li>شهادة الازدياد عدد {{wife_birth_cert_num}}</li>
        <li>نسخة كاملة من رسم الولادة</li>
        <li>صورة مطابقة للأصل من البطاقة الوطنية رقم {{wife_cin}}</li>
        <li>شهادة السكنى أو رخصة الإقامة</li>
        <li>شهادة طبية تثبت سلامة المخطوبة من الأمراض المعدية والخطيرة</li>
        <li>نسخة من السجل العدلي عند الاقتضاء</li>
      </ul>
    </section>

    <section style="margin-top:24px;">
      <h3 style="font-weight:bold;">بيانات إضافية</h3>
      <p>اسم الوكيل في الزواج: {{contracted_by}}</p>
      <p>موعد الجلسة: {{meeting_day}} على الساعة {{meeting_time}}</p>
      <p>الشهود: {{witness1_name}} و {{witness2_name}}</p>
      <p>مقدار الصداق: {{dowry_amount}} درهم</p>
    </section>
  </div>
  `,
  `
  <div class="rich-doc-page">
    <header style="text-align:center; margin-bottom:18px;">
      <div style="font-weight:bold;">طلب الإذن بتوثيق عقد الزواج</div>
      <div>يمكن تعديل النص أدناه لإضافة المعطيات الضرورية</div>
    </header>

    <section>
      <p>
        إلى السيد رئيس قسم قضاء الأسرة بالمحكمة الابتدائية ب{{court_city}}،
        يشرفنا أن نتقدم لسيادتكم بملف عقد الزواج قصد منحه الإذن بالتوثيق وفقاً للمقتضيات القانونية.
      </p>
    </section>

    <section style="margin-top:20px;">
      <h3 style="font-weight:bold;">معلومات عن الخاطب</h3>
      <p>الاسم الشخصي والعائلي: {{husband_name}}</p>
      <p>تاريخ الازدياد ومكانه: {{husband_birth_date}} - {{husband_birth_place}}</p>
      <p>رقم البطاقة الوطنية: {{husband_cin}}</p>
      <p>المهنة: {{husband_occupation}}</p>
      <p>محل السكنى أو الإقامة: {{husband_residence}}</p>
    </section>

    <section style="margin-top:20px;">
      <h3 style="font-weight:bold;">معلومات عن المخطوبة</h3>
      <p>الاسم الشخصي والعائلي: {{wife_name}}</p>
      <p>تاريخ الازدياد ومكانه: {{wife_birth_date}} - {{wife_birth_place}}</p>
      <p>رقم البطاقة الوطنية: {{wife_cin}}</p>
      <p>المهنة: {{wife_occupation}}</p>
      <p>محل السكنى أو الإقامة: {{wife_residence}}</p>
    </section>

    <section style="margin-top:20px;">
      <h3 style="font-weight:bold;">معطيات حول الزواج المطلوب الإذن فيه</h3>
      <p>نوع الزواج: ....................................................</p>
      <p>مقدار الصداق وكيفية أدائه: {{dowry_amount}} درهم</p>
      <p>الشروط الخاصة المتفق عليها بين الطرفين: ....................................................</p>
    </section>
  </div>
  `,
  `
  <div class="rich-doc-page">
    <header class="flex items-center justify-between gap-4">
      <img src="{{morocco_logo}}" alt="شعار المملكة" style="width:70px;height:auto;" />
      <div style="text-align:center; line-height:1.6;">
        <div style="font-weight:bold;">الــــمــمــلــكة المــغــــربـــيــة</div>
        <div>وزارة العدل</div>
        <div>محكمة الاستئناف ب{{court_city}}</div>
        <div>المحكمة الابتدائية ب {{court_city}}</div>
        <div>قسم قضاء الاسرة</div>
      </div>
      <img src="{{adoul_logo}}" alt="شعار العدول" style="width:70px;height:auto;" />
    </header>

    <section style="margin-top:18px;font-size:14px;line-height:1.8;text-align:center;">
      <div>مــلف مســتــنــدات الزواج</div>
      <div>رقم: {{file_number}} / {{file_year}}</div>
      <div>رقم الإذن: {{marriage_authorization_no}}</div>
      <div style="font-weight:bold;margin-top:8px;">إذن بتوثيق عقد الزواج</div>
    </section>

    <section style="margin-top:24px; line-height:2;">
      <p>
        نحن الأستاذ/ة: <span style="font-weight:bold;">{{contracted_by}}</span>
        قاضي الاسرة المكلف بالزواج بقسم قضاء الاسرة بالمحكمة الابتدائية ب
        <span style="font-weight:bold;">{{court_city}}</span>.
      </p>
      <p>
        بناء على الطلب المسجل تحت عدد:
        <span style="font-weight:bold;">{{registry_number}}</span>
        بتاريخ:
        <span style="font-weight:bold;">{{inclusion_date}}</span>
        الذي تقدم به السيد:
        <span style="font-weight:bold;">{{husband_name}}</span>
        المزداد ب:
        <span style="font-weight:bold;">{{husband_birth_place}}</span>
        في:
        <span style="font-weight:bold;">{{husband_birth_date}}</span>
        حسب رسم ولادته رقم:
        <span style="font-weight:bold;">{{husband_birth_cert_num}}</span>
        بجماعة:
        <span style="font-weight:bold;">{{court_city}}</span>
        بطاقته الوطنية رقم:
        <span style="font-weight:bold;">{{husband_cin}}</span>
        مهنته:
        <span style="font-weight:bold;">{{husband_occupation}}</span>
        جنسيته:
        <span style="font-weight:bold;">{{husband_nationality}}</span>
        حالته العائلية:
        <span style="font-weight:bold;">{{husband_marital_status}}</span>
        الساكن ب:
        <span style="font-weight:bold;">{{husband_residence}}</span>.
      </p>
      <p>
        اسم الوكيل في الزواج: ..... بطاقته الوطنية رقم: ..... تاريخ الوكالة في الزواج: ..... المضمنة بدفتر باقي الوثائق رقم: .... عدد: .... أو الصادرة من: ...... والرامي إلى الإذن له بتوثيق عقد زواجه مع السيدة المذكورة أدناه على صداق قدره:
        <span style="font-weight:bold;">{{dowry_amount}}</span>
        درهم.
      </p>
      <p>
        مع السيدة:
        <span style="font-weight:bold;">{{wife_name}}</span>
        المزدادة ب:
        <span style="font-weight:bold;">{{wife_birth_place}}</span>
        في:
        <span style="font-weight:bold;">{{wife_birth_date}}</span>
        من والديها:
        <span style="font-weight:bold;">{{wife_father_name}}</span>
        حسب رسم ولادتها رقم:
        <span style="font-weight:bold;">{{wife_birth_cert_num}}</span>
        بجماعة:
        <span style="font-weight:bold;">{{court_city}}</span>
        بطاقتها الوطنية رقم:
        <span style="font-weight:bold;">{{wife_cin}}</span>
        مهنتها:
        <span style="font-weight:bold;">{{wife_occupation}}</span>
        جنسيتها:
        <span style="font-weight:bold;">{{wife_nationality}}</span>
        حالتها العائلية:
        <span style="font-weight:bold;">{{wife_marital_status}}</span>
        الساكنة ب:
        <span style="font-weight:bold;">{{wife_residence}}</span>.
      </p>
      <p>
        اسم الوكيل في الزواج: ..... بطاقته الوطنية رقم: ..... تاريخ الوكالة في الزواج: ..... المضمنة بدفتر باقي الوثائق رقم: .... عدد: .... أو الصادرة من: ...... والرامي إلى الإذن له بتوثيق عقد زواجه مع السيد المذكور أعلاه على صداق قدره: ..... درهم.
      </p>
      <p>
        اسم الولي:
        <span style="font-weight:bold;">{{wife_father_name}}</span>
        المولود بتاريخ:
        <span style="font-weight:bold;">{{wife_father_birth_date}}</span>
        بطاقته الوطنية رقم:
        <span style="font-weight:bold;">{{wife_father_cin}}</span>.
      </p>
    </section>

    <section style="margin-top:20px; line-height:2;">
      <p>وبناء على الإذن بالزواج عدد: <span style="font-weight:bold;">{{marriage_authorization_no}}</span> بتاريخ: <span style="font-weight:bold;">{{inclusion_date}}</span>.</p>
      <p>وبناء على الوثائق المدلى بها في الملف المشار إليه أعلاه.</p>
      <p>وطبقا للمادة 65 من مدونة الاسرة.</p>
    </section>

    <section style="margin-top:20px; line-height:2; text-align:center; font-weight:bold;">
      <p>لأجــــلــــــــــــــــــــــــــــــــــه،</p>
      <p>نأذن للعدلين المنتصبين للإشهاد بدائرة هذه المحكمة، بتوثيق عقد الزواج المذكور طبقا للقواعد المنصوص عليها في مدونة الأسرة.</p>
    </section>

    <section style="margin-top:24px; line-height:2;">
      <p>وحرر في: <span style="font-weight:bold;">{{court_city}}</span> بتاريخ: <span style="font-weight:bold;">{{request_date_gregorian}}</span></p>
      <p style="margin-top:20px; font-weight:bold; text-align:center;">توقيع القاضي المكلف بالتوثيق</p>
    </section>
  </div>
  `,
];
