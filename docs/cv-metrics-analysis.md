# Swimming Pool Management System CV Metrik Analizi

Bu doküman, projeyi CV, portfolyo ve teknik mülakatlarda anlatırken kullanılabilecek repository kanıtlarını bir araya getirir. Türkçe değerlendirmeler, İngilizce CV bullet önerileri ve sayıların dayandığı kaynaklar içerir.

En güçlü dayanaklar **5 kullanıcı rolü**, **11 uygulama tablosu**, **6 işlemde PostgreSQL transaction kullanımı** ve **5 adımlı kayıt akışıdır**. Kaynakta **165 test bildirimi** bulunur; yeni izole çalıştırmada **165 testin tamamı geçmiştir**. Backend birleşik line coverage **%21,83**, frontend line coverage **%31,43** olarak ölçülmüştür. Lighthouse, bundle, accessibility ve yerel API yük sonuçları da artık [ölçüm raporunda](local-measurements.md) mevcuttur. Kullanıcı artışı, hızlanma veya zaman tasarrufu gibi ölçülmüş ürün etkileri bulunmamıştır.

## İnceleme kapsamı ve güncellik

| Bilgi | Değer |
|---|---|
| Analiz tarihi | 30 Eylül 2026 |
| İlk statik analiz commit’i | `a03f094fccb646c0558aa2d4503e28b6b771adc7` |
| Yeni ölçümlerin kaynak commit’i | `98c6c7e7cd5d7fee764b0ccf9b6475241180d2e6` |
| Test ortamı | macOS / Darwin arm64, Node.js v26.5.0 |
| Çalıştırılan test grupları | Backend unit, PostgreSQL integration, frontend unit/component ve Playwright smoke |
| Kaynak kapsamı | Backend, frontend, testler, SQL, README, docs, deployment ve mevcut yerel raporlar |

Bu doküman belirtilen tarihteki kaynak incelemesinin anlık görüntüsüdür. Sonraki kod değişiklikleri sayımları ve satır referanslarını geçersiz kılabilir. İlk rapordan sonra test ve benchmark altyapısı kurularak yeni ölçümler üretildi. Bu güncelleme yeni çalıştırma sonuçlarını içerir. Render yapılandırmasındaki Node 20 ile yerel test ortamı aynı değildir.

**Scope**, uygulanan mühendislik kapsamını; **Impact**, ölçülmüş sonuç veya iyileşmeyi ifade eder. Kapsam sayıları üretim kullanımını, kullanıcı memnuniyetini veya performans başarısını kanıtlamaz. Repository, bireysel katkı sahipliğini tek başına belirlemez; aşağıdaki “Built” ve “Implemented” fiilleri yalnızca kişinin kendi katkıları için kullanılmalıdır.

Kalıcı kanıt dosyaları:

- [Kaynak sayım envanteri](cv-metrics-evidence/inventory.json): HTTP method/path listesi, test bildirimleri, frontend route ve JSX dosya envanteri.
- [Validation kural envanteri](cv-metrics-evidence/validation-rules.json): Alan, kural ve kaynak satırı.
- [İlk backend unit test sonucu](cv-metrics-evidence/backend-unit-results.json): İlk analizin tarihsel kanıtı.
- [Yeni ölçüm özeti](cv-metrics-evidence/local-measurements/summary.json): Bütün test grupları, coverage, bundle, Lighthouse, accessibility ve load sonuçları.
- [Yöntem ve ayrıntılı ölçüm raporu](local-measurements.md): Ortam, kapsam, sınırlamalar ve tekrar çalıştırma talimatları.

## A En güçlü measurable results

| Metric | Değer | Ne ifade ediyor | Repository kanıtı | Impact veya Scope | CV değeri ve neden |
|---|---|---|---|---|---|
| Kullanıcı rolleri | 5 | Üye, yönetici, doktor, personel ve antrenör için farklı işlev ve erişim kontrolleri | [Rol enum](../backend/sql/schema_postgres.sql#L97), [auth middleware](../backend/middleware/auth.js#L6) | Scope | Yüksek; yetkilendirme ve ürün kapsamını somutlaştırır. |
| İlişkisel veri modeli | 11 uygulama tablosu | Üyelik, sağlık değerlendirmesi, rezervasyon, ödeme ve giriş doğrulamasını kapsar | [SQL şeması](../backend/sql/schema_postgres.sql#L120) | Scope | Yüksek; tablo sayısı işlevlerle birlikte veri modelleme katkısını anlatır. |
| Transaction kullanılan işlemler | 6 | Birden fazla veritabanı işlemini aynı transaction içinde yürütür | [Transaction helper](../backend/config/database.js#L35), aşağıdaki çağrı listesi | Scope | Yüksek; endpoint sayısından daha somut bir mühendislik ayrıntısıdır. |
| Kayıt akışı | 5 adım ve 7 sağlık sorusu | Kişisel bilgiler, sağlık değerlendirmesi, acil durum kişisi ve onaylar | [Adımlar](../frontend/src/components/MultiStepForm/MultiStepForm.js#L67), [sağlık soruları](../backend/validations.js#L237) | Scope | Yüksek; özellikle frontend katkısını anlaşılır biçimde sayısallaştırır. |
| Test envanteri | 86 dosyada 165 test bildirimi | Backend unit, frontend, integration ve tarayıcı testlerinin kaynak kapsamı | [Sayım envanteri](cv-metrics-evidence/inventory.json) | Scope | Orta; test pratiğini gösterir, assertion kalitesi nedeniyle tek başına kalite garantisi değildir. |
| Yerel doğrulama | 4 test grubunda 165/165 test geçti | Unit, integration, frontend ve browser smoke çalıştırması | [Yeni sonuçlar](cv-metrics-evidence/local-measurements/summary.json) | Yerel ölçüm; ürün impact'i değil | High; tekrarlanabilir doğrulama, ancak test kalitesi sınırları devam eder. |

### Roller ve veri modeli

Beş rolün kaynak adları `user`, `admin`, `doctor`, `staff`, `coach` şeklindedir. `user` ürün açısından üyeye karşılık gelir.

On bir uygulama tablosu: `Pools`, `feedback`, `health_info`, `health_reports`, `packages`, `payment_methods`, `payments`, `qr_code_verifications`, `reservations`, `sessions`, `users`.

[schema_postgres.sql](../backend/sql/schema_postgres.sql) ve [schema_from_neon.sql](../backend/sql/schema_from_neon.sql) aynı 11 tablo adını tanımlar; toplam 22 değildir. `connect-pg-simple`, ayrıca çalışma sırasında `user_sessions` tablosunu oluşturacak şekilde yapılandırılmıştır. Bu, uygulama tablolarından ayrı bir oturum deposudur; mevcut veritabanında oluşturulduğu doğrulanmamıştır. [Oturum deposu](../backend/index.js#L96)

### Transaction kullanılan işlemler

| İşlem | Çağrı noktası |
|---|---|
| Paket oluşturma | [member.js satır 211](../backend/routes/member.js#L211) |
| Rezervasyon oluşturma ve paket hakkını azaltma | [member.js satır 430](../backend/routes/member.js#L430) |
| Rezervasyon iptali ve paket hakkını iade etme | [member.js satır 643](../backend/routes/member.js#L643) |
| Ödeme sonrası paket ve ödeme kaydı oluşturma | [payment.js satır 132](../backend/routes/payment.js#L132) |
| Varsayılan ödeme yöntemini değiştirme | [payment.js satır 270](../backend/routes/payment.js#L270) |
| Personelin QR doğrulaması | [staff.js satır 56](../backend/routes/staff.js#L56) |

Transaction kullanımı, eşzamanlılık sorunlarının tamamen çözüldüğü anlamına gelmez. Özellikle rezervasyon akışında ilgili okumalara satır kilidi uygulanmıyor ve eşzamanlılık testi kanıtı bulunmuyor.

### Test sayımı ve çalıştırma sonucu

| Test grubu | Dosya | Bildirim | Analiz tarihindeki çalıştırma |
|---|---:|---:|---|
| Backend unit | 15 | 52 | 52 geçti |
| Frontend unit ve component | 50 | 71 | 71 geçti |
| Integration | 9 | 29 | 29 geçti; izole PostgreSQL |
| Playwright E2E | 12 | 13 | 13 geçti; Chrome, production frontend build |
| Toplam | 86 | 165 | 165 geçti; başarısız veya atlanan test yok |

Sayım JavaScript AST'sindeki `it(...)` ve `test(...)` bildirimlerinden yapıldı. Atlanmış, yalnızca seçilmiş veya parametrik test bildirimi bulunmadı. İlk incelemede README ve test dokümanı backend unit sayısını 51, toplamı 164 olarak veriyordu. Yeni ölçümlerle bu belgeler de 52 ve 165 olarak güncellendi. [Güncel test dokümanı](testing.md#L5)

İlk backend doğrulamasında aşağıdaki komut kullanılmıştı. Yeni bütünleşik ölçüm çalışması için [measurement runner](../tests/measurements/run.mjs) kullanıldı; uygulama ve test kaynakları değiştirilmeden geçici kopya, sentetik veriler ve izole PostgreSQL hazırlandı. Gerçek dış servis kimlik bilgileri aktarılmadı.

```sh
env -i PATH="$PATH" NODE_ENV=test CI=true node node_modules/jest/bin/jest.js --runInBand --silent --json --outputFile=/tmp/swim-cv-unit-results.json
```

Testlerin önemli bir kısmı mock kullanır. Frontend [setupTests.js](../frontend/src/setupTests.js) dosyasında `fetch` ve `axios` mock'ları bulunur. Başarılı test sonucu, gerçek dış servis veya veritabanı entegrasyonunun başarıyla çalıştığı anlamına gelmez.

Assertion kalitesinin sınırları:

- [Ödeme unit testi](../backend/tests/unit/payment/payment.test.js#L33), “type is missing” başlıklı senaryoda gerçekte `401` bekler; ödeme mantığına ulaşmaz.
- [Admin havuz testi](../backend/tests/unit/admin/pools.test.js#L19), kabul edilen yanıtlar arasında `500` içerir.
- [Reminders testi](../backend/tests/unit/reminders/reminders.test.js#L25), uygulama yüklenemezse başarılı assertion ile dönebilir.
- [E2E admin testi](../tests/e2e/admin/poolManagement.spec.js#L3), URL regex'i nedeniyle korunan sayfada kalmayı da kabul eder. Bu testler tamamlanmış iş akışları olarak sunulmamalıdır.

## B Diğer doğrulanabilir metrikler

| Metric | Değer | Ne ifade ediyor | Repository kanıtı | Impact veya Scope | CV değeri ve neden |
|---|---|---|---|---|---|
| Backend HTTP yüzeyi | 82 benzersiz method ve path | Alias ve bir kaldırılmış uç dâhil bağlı route tanımları | [Router bağlantıları](../backend/index.js#L212), [envanter](cv-metrics-evidence/inventory.json) | Scope | Orta; backend genişliği, bağımsız özellik sayısı değil. |
| Frontend route tanımları | 28 | React Router'a kayıtlı path kalıpları | [App.js](../frontend/src/App.js#L85) | Scope | Orta veya düşük; alias'lar nedeniyle ekran sayısı gibi kullanılmamalı. |
| Farklı route hedefleri | 23 bileşen | Aynı bileşene giden path'ler birleştirildi; yönlendirme ekranı dâhil | [App.js](../frontend/src/App.js#L3) | Scope | Orta; 23 bağımsız iş akışı anlamına gelmez. |
| JSX kaynak dosyaları | 48; 46'sı statik import zincirinde | Test dışı JSX içeren dosyalar ve giriş dosyasından statik erişilebilirlik | [Dosya ve import envanteri](cv-metrics-evidence/inventory.json) | Scope | Düşük; yeniden kullanılabilir bileşen kalitesini ölçmez. |
| Backend kayıt validation'ı | 28 alanda 50 benzersiz alan ve kural çifti | Yalnızca `backend/validations.js`; tekrarlar birleştirildi | [Validator](../backend/validations.js#L8), [kural listesi](cv-metrics-evidence/validation-rules.json) | Scope | Orta veya düşük; beş adımlı kayıt metriği CV'de daha doğal. |
| Paket türleri | 2 | `education` ve `free_swimming` | [Paket oluşturma](../backend/routes/member.js#L223) | Scope | Orta; Stripe katkısıyla birlikte anlamlı, satış kanıtı değil. |
| Dosya kategorileri | 3 | Kimlik belgesi, profil fotoğrafı, sağlık raporu | [Upload dizinleri](../backend/index.js#L51) | Scope | Orta; R2 ve Worker katkısını somutlaştırır. |
| Rate limit politikaları | 5 limiter nesnesi | Login, uniqueness, register, reset request, reset submit | [Login](../backend/routes/login.js#L7), [register](../backend/register.js#L197), [reset](../backend/register.js#L909) | Scope ve config | Düşük; saldırı engelleme oranı değildir. |
| Zamanlanmış görev | 1 saatlik cron | Sağlık raporu hatırlatma adaylarını saat başında kontrol eder | [Cron](../backend/index.js#L332) | Scope ve config | Orta; otomasyon kapsamı, ölçülmüş zaman tasarrufu değil. |
| Deployment tanımları | 2 Render servisi ve 1 Cloudflare Worker | Backend, statik frontend ve R2 proxy | [Render](../render.yaml#L5), [Worker](../cloudflare-worker/wrangler.toml#L1) | Scope ve config | Orta; canlılık veya uptime kanıtı değildir. |
| Tarayıcı test hedefi | 1 Chromium motoru | Mevcut 13 test Google Chrome ile çalıştırıldı; axe için 2 viewport kullanıldı | [Tarayıcı ölçümleri](local-measurements.md) | Yerel ölçüm ve Scope | Medium; diğer tarayıcılar veya gerçek cihazlar için kanıt değil. |
| Backend line coverage | %21,83 | Unit ve integration sayaç birleşimi; 488/2.235 instrument edilmiş satır | [Birleşik coverage](cv-metrics-evidence/local-measurements/backend-combined-coverage.json) | Yerel ölçüm; iyileşme değil | Low; yüksek coverage iddiasını desteklemiyor. |
| Frontend line coverage | %31,43 | Test dışı src JS/JSX; 1.021/3.248 satır | [Coverage](cv-metrics-evidence/local-measurements/frontend-coverage/coverage-summary.json) | Yerel ölçüm; iyileşme değil | Low; geliştirme alanını gösteriyor. |
| Ana JS gzip boyutu | 344.738 byte | Production build asset'inin yerel sıkıştırılmış boyutu | [Bundle](cv-metrics-evidence/local-measurements/bundle.json) | Yerel ölçüm | Low; küçülme veya optimizasyon iddiası değil. |
| Mobil Lighthouse performance | 3 route için 75, 74, 75 medyan | Route başına üç koşu; dış servisler engellendi | [Lighthouse](local-measurements.md) | Yerel benchmark | Low; canlı site skoru olarak kullanılmamalı. |
| API yük ölçümü | 2 endpoint, 18 koşu, 389.483 istek | 1/10/50 bağlantı seviyeleri; gözlenen dört hata sayacı 0 | [Load sonuçları](cv-metrics-evidence/local-measurements/load-results.json) | Yerel benchmark | Medium; yalnızca ortam ve fixture sınırlarıyla kullanılabilir. |
| Accessibility taraması | 6 route × 2 viewport | 12 taramada 2 farklı ihlal kuralı; tüm taramalarda ihlal var | [Axe sonuçları](cv-metrics-evidence/local-measurements/accessibility.json) | Yerel ölçüm | Low; uygunluk başarısı olarak sunulamaz. |

### Backend HTTP envanteri

| Grup | Method ve path sayısı |
|---|---:|
| `/auth` register ve login router'ları | 22 |
| `/api/admin` | 12 |
| `/api/member` | 24 |
| `/api/payment` | 6 |
| `/api/doctor` | 9 |
| `/api/reminders` | 3 |
| `/api/staff` | 2 |
| `/api/coach` | 2 |
| `/pools` ve `/api/pools` | 2 |
| Toplam | 82 |

Başlangıç dosyası `backend/index.js` üzerinden bağlı router'lar izlendi. Her benzersiz HTTP method ve tam path bir kayıt sayıldı; path dizileri açıldı. Tam liste [envanterdeki `api` alanında](cv-metrics-evidence/inventory.json) bulunur.

`POST /auth/verify-email` ve `POST /auth/verify-email/:token` aynı handler'ın iki path'idir. `/pools` ve `/api/pools` aynı ürün amacına hizmet eden alternatif adreslerdir. Doktor grubundaki `POST /upload-health-report/:userId` yalnızca **410 Gone** döndürür. Bu uç çıkarıldığında 81 tanım kalır; bu da “81 çalışan özellik” iddiasını desteklemez. [Path dizisi](../backend/register.js#L601), [kaldırılmış uç](../backend/routes/doctor.js#L208)

`/uploads` dosya sunumu, Worker GET/POST/OPTIONS davranışları, otomatik HTTP davranışları ve frontend route'ları 82'ye eklenmedi. Ayrı `backend/app.js` parçası ikinci bir aktif uygulama olarak sayılmadı.

### Frontend ekranları ve bileşenler

23 farklı route hedefi: `LandingPage`, `MultiStepForm`, `Terms`, `PrivacyPolicy`, `SocialLogin`, `LoginPage`, `HomePage`, `Dashboard`, `EmailVerification`, `VerifyResult`, `AdminDashboard`, `DoctorDashboard`, `HealthReportUpload`, `CoachDashboard`, `MemberDashboard`, `CheckInPage`, `Billing`, `EditProfile`, `EducationPackage`, `FreeSwimmingPackage`, `ResetPassword`, `ForgotPassword`, `StaffVerification`.

`Dashboard` esasen yönlendirme ekranıdır. Kayıt, e-posta doğrulama, sağlık raporu yükleme ve parola sıfırlama alias'ları ayrı ekran kabul edilmedi. Bu statik route sayımı, ekranların tarayıcıda başarıyla çalıştırıldığı anlamına gelmez.

Admin ekranı havuz, doğrulama, seans ve geri bildirim sekmelerini içerir. Doktor ekranında sağlık incelemesi ve hatırlatmalar vardır. [Admin sekmeleri](../frontend/src/components/AdminDashboard/AdminDashboard.js#L13), [doktor ekranı](../frontend/src/components/DoctorDashboard/DoctorDashboard.js#L30)

`HealthReportReviews` ve `ReservationDetails` JSX dosyaları uygulamanın statik import zincirinde bulunmaz; testlerinin olması kullanıcı arayüzünde kullanıldıklarını göstermez. `CheckInPageFix.js` bir React bileşeni değil, tarayıcı konsolu için yardımcı script'tir. 48 sayısı bileşen tanımı sayısı değil, JSX içeren kaynak dosyası sayısıdır; `src/index.js` de bu sayıdadır.

### Validation sayım yöntemi

| Kural grubu | Alan | Benzersiz kural |
|---|---:|---:|
| Kimlik belgesi ve profil fotoğrafı | 2 | 6 |
| Kişisel bilgiler, parola ve parola tekrarı | 9 | 22 |
| Boy, kilo, kan grubu ve alerji | 4 | 6 |
| Acil durum kişisi | 3 | 6 |
| Sağlık soruları ve koşullu açıklama | 8 | 8 |
| Şartlar ve gizlilik onayları | 2 | 2 |
| Toplam | 28 | 50 |

Zorunluluk, format, uzunluk ve alanlar arası karşılaştırmalar ayrı kurallardır. Aynı alanın yinelenen zorunluluk kontrolleri tek kural; sayısal aralık koşulu tek kural sayıldı. Döngüdeki yedi sağlık sorusu alan bazında açıldı. Frontend tekrarları ve route içindeki diğer iş kuralları eklenmedi. Bu sayı, proje genelindeki bütün validation kurallarının toplamı değildir.

Frontend ve backend davranışları tamamen eşleşmez. Ayrıca `validatePersonalInfo` async olmasına rağmen formun adım doğrulaması sonucu `await` etmeden kullanır. Bu nedenle “tüm adımlarda eksiksiz validation garantisi” iddiası uygun değildir. [Async validator](../frontend/src/utils/validations.js#L29), [çağrı noktası](../frontend/src/components/MultiStepForm/MultiStepForm.js#L133)

### İşlevler ve entegrasyonlar

Doğrulanan işlevsel kapsam; kayıt ve kimlik doğrulama, yönetici onayı, havuz ve seans yönetimi, rezervasyon ve iptal, paket ve ödeme, sağlık değerlendirmesi, belge yükleme, hatırlatmalar, QR giriş kontrolü, antrenör değerlendirmesi, profil ve geri bildirim yönetimidir. Bunları keyfî bir modül sayısı yerine adlarıyla anlatmak daha güçlüdür.

| Entegrasyon | Kaynakta doğrulanan kapsam | Kanıt |
|---|---|---|
| Google OAuth | Tek sosyal giriş sağlayıcısı; logo dosyaları GitHub veya Facebook entegrasyonunu kanıtlamaz | [Google route'ları](../backend/register.js#L650) |
| Stripe | Payment Intent, ödeme sonucu kontrolü, ödeme yöntemi yönetimi | [Ödeme router'ı](../backend/routes/payment.js#L45) |
| PostgreSQL | Uygulama verisi ve oturum deposu | [Database helper](../backend/config/database.js), [session store](../backend/index.js#L96) |
| Cloudflare R2 ve Worker | Doğrudan veya Worker üzerinden yükleme; aynı depolamanın farklı erişim yolları | [R2 helper](../backend/utils/r2Storage.js#L38) |
| E-posta | Yapılandırmaya göre Gmail API, Resend veya SMTP; üçünün üretimde kullanıldığı doğrulanmadı | [Provider seçimi](../backend/utils/sendEmail.js#L94) |
| Harita | Leaflet arayüzünde OpenStreetMap tile kullanımı | [MapPicker](../frontend/src/components/AdminDashboard/MapPicker.js#L46) |

### Güvenlik ve operasyon sınırları

Session authentication, rol kontrolleri, bazı işlemlerde sahiplik kontrolü, bcrypt parola hash'i, SHA-256 token hash'i, Helmet/CSP, CORS, rate limiting ve dosya MIME/uzantı kontrolleri vardır. Bunlar uygulanmış önlemlerdir; penetrasyon testi veya uyumluluk sonucu değildir. Worker GET erişiminin Origin/Referer veya ortak secret üzerinden çalışması, kullanıcı bazlı dosya yetkilendirmesiyle eşdeğer sayılmamalıdır. [Güvenlik yardımcıları](../backend/utils/security.js), [Worker erişim kontrolü](../cloudflare-worker/src/index.js#L24)

Beş limiter nesnesinin limitleri: login 10 istek/15 dakika, e-posta ve telefon uniqueness kontrolünün paylaştığı limiter 5 istek/15 dakika, register 5 istek/saat, reset request 5 istek/15 dakika, reset submit 10 istek/15 dakika. Bunlar yük kapasitesi ölçümü değildir.

Cron saat başında çalışacak şekilde tanımlıdır; başlangıçtaki tek seferlik çağrı ikinci bir cron sayılmadı. Hatırlatma sorgusunda rapor talebinden itibaren en az beş gün ve son hatırlatmadan itibaren en az yedi gün koşulları vardır. Gönderilmiş e-posta sayısı veya teslimat başarısı ölçülmemiştir. [Hatırlatma koşulları](../backend/index.js#L253)

## C Kullanılmaması gereken metrikler

| İddia | Neden kullanılmamalı |
|---|---|
| “164 tests” | Eski doküman sayımıydı; kaynak ve yeni çalıştırma 165 gösteriyor. |
| “165 fully verified business workflows” | Artık 165 test geçtiği doğrulandı; fakat bunlar 165 tamamlanmış iş akışı değil. |
| “Full coverage” veya “100% coverage” | Ölçülen line coverage backend %21,83, frontend %31,43; bu iddiaları desteklemiyor. |
| “13 end-to-end business workflows” | Tarayıcı testleri sayfa yükleme ve URL kontrolü düzeyinde. |
| “82 fully functional REST APIs” | Alias, OAuth yönlendirmesi ve 410 döndüren uç dâhil; çalışma başarısı ölçülmedi. |
| “28 screens” veya “48 reusable components” | Route, ekran, dosya ve bileşen farklı birimler; alias ve kullanılmayan kod var. |
| “22 database tables” | İki şema aynı tablo adlarını tanımlar. |
| “Eliminated double bookings” veya “eliminated race conditions” | Transaction varlığı yeterli değil; eşzamanlılık testi yok. |
| “Reduced registration time by X%” veya “saved X hours” | Öncesi ve sonrası ölçümü ya da kullanıcı araştırması yok. |
| “Supports X concurrent users” | Havuz kapasitesi, request ve upload limitleri yük testi sonucu değil. |
| “Cross-browser tested” | Chrome/Chromium çalıştırıldı; Firefox, WebKit veya gerçek cihaz testi yapılmadı. |
| “Automated CI/CD pipeline” | İncelenen çalışma ağacında CI workflow/job tanımı bulunmadı; Render Blueprint testli CI pipeline kanıtı değil. |
| “Production-grade security” veya “GDPR/HIPAA compliant” | Denetim, uygunluk veya güvenlik testi kanıtı yok. |

Kimlik ve profil dosyaları için 5 MiB, sağlık raporları için 10 MiB sınırı; 12/18 seans, üç aylık paket süresi ve üç saatlik iptal sınırı ürün kurallarıdır. Mühendislik performansı veya ticari etki olarak kullanılmamalıdır. [Dosya limitleri](../backend/routes/member.js#L75), [paket kuralları](../backend/routes/member.js#L223), [iptal sınırı](../backend/routes/member.js#L631)

Kod satırı, dosya veya dependency sayısını ana başarı metriği yapmak da katkının niteliğini açıklamaz. Sayılar, somut bir mühendislik katkısına bağlandığında kullanılmalıdır.

## D Mevcut CV bullet ifadelerine uygulama

Analiz sırasında mevcut CV bullet'ları paylaşılmadığı için birebir düzenleme yapılmadı. Teknoloji ve özellikleri koruyan doğal metrik eklemeleri:

| Bullet konusu | Eklenebilecek İngilizce ifade |
|---|---|
| React ve Node.js full-stack geliştirme | “…supporting 5 user roles across an 11-table PostgreSQL schema.” |
| PostgreSQL ve veri tutarlılığı | “…using database transactions across 6 operations spanning bookings, packages, payments, and QR verification.” |
| Kayıt formu ve frontend | “…through a 5-step registration flow with a 7-question health questionnaire.” |
| Stripe entegrasyonu | “…for 2 swimming package types, with payment verification and saved payment methods.” |
| Test doğrulama | “…validated with 165 passing tests across backend unit, PostgreSQL integration, frontend component, and browser smoke suites.” |

Test sayılarının tamamını tek bullet'a yığmak yerine başvurunun odağına göre seçmek daha okunabilirdir. Test yazarlığı doğrulanmadan “authored” iddiası kullanılmamalıdır.

## E İngilizce CV bullet önerileri

### Full Stack platform geliştirme

> Built a React and Express swimming pool management platform supporting 5 user roles across an 11-table PostgreSQL schema, covering reservations, payments, health reviews, and QR check-in.

Kanıt: [Roller ve şema](../backend/sql/schema_postgres.sql#L97), [backend modülleri](../backend/index.js#L212), [frontend route'ları](../frontend/src/App.js#L85).

### Backend veri işlemleri

> Implemented PostgreSQL transactions across 6 operations spanning package creation, reservation booking and cancellation, payment processing, payment preferences, and QR verification.

Kanıt: [Transaction helper](../backend/config/database.js#L35) ve A bölümündeki altı çağrı noktası. Bu ifade eşzamanlılık sorunlarının tamamen giderildiğini iddia etmez.

### Frontend kayıt deneyimi

> Developed a 5-step React registration flow combining document uploads, a 7-question health questionnaire, emergency contacts, and consent collection.

Kanıt: [Form adımları](../frontend/src/components/MultiStepForm/MultiStepForm.js#L67), [sağlık soruları](../frontend/src/components/MultiStepForm/Steps/HealthQuestionsStep.js).

### Stripe ödeme entegrasyonu

> Integrated Stripe Payment Intents for 2 swimming package types, with server-side payment verification, transactional package creation, and saved payment method management.

Kanıt: [Payment Intent oluşturma](../backend/routes/payment.js#L45), [ödeme kontrolü ve paket oluşturma](../backend/routes/payment.js#L97), [ödeme yöntemleri](../backend/routes/payment.js#L240).

### Belge depolama

> Implemented Cloudflare R2 uploads through a Worker proxy for 3 document categories: identity documents, profile photos, and health reports.

Kanıt: [R2 upload yolları](../backend/utils/r2Storage.js#L38), [Worker kategori kontrolü](../cloudflare-worker/src/index.js#L91).

Software Engineer / Full-Stack başvurularında platform, transaction ve ödeme bullet'ları önceliklidir. Frontend ağırlığında kayıt deneyimi; backend ve deployment ağırlığında belge depolama daha değerlidir. Aynı projede beşini birden kullanmak yerine ilgili üç veya dört bullet seçilebilir.

### Yeni ölçümlere dayalı test alternatifi

> Validated a React and Express application with 165 passing tests across backend unit, PostgreSQL integration, frontend component, and browser smoke suites in an isolated local environment.

Kanıt: [yeni test özeti](cv-metrics-evidence/local-measurements/summary.json), [ölçüm yöntemi](local-measurements.md). Bu ifade test yazarlığını veya 165 tam iş akışını iddia etmez. Test altyapısı vurgulanacaksa belge depolama bullet'ının yerine seçilebilir. Düşük coverage yüzdeleri ve yerel Lighthouse skorları ana başarı bullet'ına eklenmemelidir.

## F Hâlâ doğrulanamayan metrikler

| Alan | Güvenilir ölçüm çıktısı bulunmayan bilgiler |
|---|---|
| Coverage sınırı | Worker coverage, E2E ile instrument edilmiş coverage ve önceki sürüme göre artış ölçülmedi; backend/frontend yüzdeleri artık mevcut |
| Üretim performansı | Yerel API p50/p99 ve Lighthouse artık mevcut; canlı trafik gecikmesi, bağımsız sorgu benchmark'ı ve ölçülmüş iyileşme yok |
| Bundle iyileşmesi | Production build ve gzip/Brotli boyutları artık mevcut; önce ve sonra karşılaştırması yok |
| Üretim ölçeği | Sınırlı yerel load testi mevcut; gerçek eşzamanlı kullanıcı kapasitesi, uzun süreli soak/stress ve maksimum kapasite doğrulanmadı |
| Accessibility uygunluğu | Public ekranlar için axe/Lighthouse mevcut; tüm ekranlar, manuel klavye/ekran okuyucu ve WCAG uygunluk denetimi yok |
| Üretim kullanımı | Gerçek kullanıcı, aktif üye, rezervasyon, ödeme hacmi, gelir, dönüşüm oranı |
| Operasyon | Uptime, hata oranı, deployment sıklığı, MTTR, CI başarı geçmişi |
| İş etkisi | Kayıt süresinde azalma, personel zaman tasarrufu, no-show azalması, kullanıcı memnuniyeti |
| Tam akış doğrulaması | Gerçek ödeme, OAuth, kayıt, rezervasyon ve QR akışlarının tamamlandığını gösteren çalıştırma raporları |

Web Vitals için konsola ölçüm gönderme kodu vardır; gerçek kullanıcı ölçümleri saklanmış değildir. Yeni Lighthouse sonuçları laboratuvar ölçümüdür, gerçek kullanıcı verisi yerine geçmez. Coverage artık script varlığına değil, saklanan çalıştırma raporlarına dayanır. [Web Vitals çağrısı](../frontend/src/index.js#L41), [Web Vitals helper](../frontend/src/reportWebVitals.js)

## Gelecekte güncelleme yöntemi

1. Yeni commit ve analiz tarihini kaydet; eski ölçüm tarihini yeni sonuç gibi sunma.
2. `backend/index.js` router bağlantılarından başlayarak method/path envanterini yeniden çıkar; alias, kaldırılmış uç, Worker ve dosya sunumunu ayır.
3. Test dosyası, bildirim ve çalıştırma sonucunu ayrı tut. Mock ve assertion sınırlarını yeniden kontrol et.
4. Şema tablo adlarını, frontend route hedeflerini, statik import erişilebilirliğini ve transaction çağrılarını yeniden say.
5. Validation sayımında bu dokümandaki alan/kural tanımını koru; kapsamı genişletirsen yeni sayımın sınırını açıkça yaz.
6. Yeni coverage, performans veya kullanım ölçümlerini ortam, tarih, yöntem ve karşılaştırma tabanıyla ekle. Sonuç dosyalarını kanıt klasöründe sakla.
7. İngilizce bullet'ları, doğrulanmış kişisel katkıya ve hedef pozisyona göre güncelle.
