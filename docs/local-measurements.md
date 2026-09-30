# Yerel Test ve Performans Ölçümleri

Bu rapor, CV metrik analizini yeni test ve benchmark çıktılarıyla tamamlar. Ölçümler 30 Eylül 2026 tarihinde uygulama kaynakları değiştirilmeden, izole geçici kopyada yapıldı. Sonuçlar mevcut durumun başlangıç ölçümüdür; üretim kapasitesi, gerçek kullanıcı trafiği veya geçmişe göre iyileşme değildir.

Sayısal sonuçların tamamı [ölçüm özeti](cv-metrics-evidence/local-measurements/summary.json) ve aynı klasördeki ham raporlarla doğrulanabilir. CV'de kullanılabilecek kapsam değerleri ve İngilizce öneriler için [CV metrik analizi](cv-metrics-analysis.md) dosyasına bakın.

## Ortam ve izolasyon

- Kaynak commit: `98c6c7e7cd5d7fee764b0ccf9b6475241180d2e6`. Önceki analizden sonra uygulama kodu değişmedi; önceki commit yalnızca dokümantasyon ekledi.
- Makine: Apple M5, arm64, 10 mantıksal CPU, 16 GiB RAM; Darwin 27.0.0; Node.js v26.5.0.
- Veritabanı: yeni yerel PostgreSQL 18.2 kümesi. Paket sürüm dizesi `x86_64-apple-darwin24.6.0` bildiriyor; bunu arm64 native PostgreSQL sonucu olarak yorumlamayın.
- Tarayıcı: kurulu Google Chrome 154.0.8037.92, headless Chromium motoru. Gerçek mobil cihaz veya farklı tarayıcı motoru test edilmedi.
- Araçlar: Jest 29.7.0 backend; Lighthouse 13.5.0; axe-core Playwright paketi 4.13.0; Autocannon 8.0.0. Mevcut E2E testleri kendi lockfile'ından kuruldu; ek axe taramalarının Playwright sürümü 1.63.0.
- Geçici kopyaya `.env` dosyaları, gerçek upload'lar veya mevcut veritabanı verileri alınmadı. Test kimlik bilgileri yalnızca yerel fixture'lar içindir.
- Application Node süreçlerinin dış sunuculara socket bağlantıları engellendi. Browser ölçümlerinde dış servisler engellendi. Stripe, OAuth, e-posta ve R2 canlı akışları çalıştırılmadı.
- Frontend production build olarak statik sunuldu; backend `NODE_ENV=development` ile çalıştı. Backend debug logging açıktı; statik sunucuda HTTP compression middleware yoktu. Bunlar Render üretim ayarlarının birebir kopyası değildir.
- Yük üretici, tarayıcı, uygulama ve veritabanı aynı makinededir. Yük testleri, Lighthouse ve tarayıcı taramaları birbirinden sonra çalıştırıldı.

Kaynaklar: [ortam](cv-metrics-evidence/local-measurements/environment.json), [veritabanı](cv-metrics-evidence/local-measurements/database.json), [tarayıcı](cv-metrics-evidence/local-measurements/browser-version.json), [kaynak dosya hash'leri](cv-metrics-evidence/local-measurements/source-manifest.json).

## Test sonuçları

| Grup | Dosya | Geçen | Başarısız |
|---|---:|---:|---:|
| Backend unit | 15 | 52 | 0 |
| Backend integration | 9 | 29 | 0 |
| Frontend unit ve component | 50 | 71 | 0 |
| Mevcut Playwright tarayıcı smoke testleri | 12 | 13 | 0 |
| Toplam | 86 | 165 | 0 |

Test dosyaları ve assertion'lar değiştirilmedi. Integration testleri gerçek, izole PostgreSQL kullandı. E2E testleri production frontend build'e karşı çalıştırıldı; retry kapalıydı. Jest frontend ve integration çalıştırmaları `--forceExit` kullanır; sonuçlar açık handle bulunmadığını kanıtlamaz. Unit/component mock'ları ve mevcut zayıf assertion'lar önceki analizdeki sınırlarını korur. 165 testin geçmesi, 165 farklı iş akışının uçtan uca doğrulandığı anlamına gelmez.

Kaynaklar: [backend unit](cv-metrics-evidence/local-measurements/backend-unit.json), [integration](cv-metrics-evidence/local-measurements/backend-integration.json), [frontend](cv-metrics-evidence/local-measurements/frontend-tests.json), [E2E](cv-metrics-evidence/local-measurements/e2e.json).

## Coverage ölçümü

| Kapsam | Statement | Branch | Function | Line |
|---|---:|---:|---:|---:|
| Backend unit ve mevcut config | %19,09 | %8,65 | %10,11 | %19,71 |
| Backend integration ve genişletilmiş dosya kapsamı | %15,84 | %5,67 | %13,82 | %16,33 |
| Backend unit ve integration birleşimi | %21,18 | %11,14 | %17,97 | %21,83 |
| Frontend kaynak kapsamı | %30,81 | %12,45 | %22,66 | %31,43 |

Backend unit config yalnızca `routes/**/*.js`, `register.js` ve `validations.js` toplar. Integration koşusunda bunlara `middleware`, `utils`, `config` ve gerçek giriş dosyası `index.js` eklendi. Çalıştırılmayan dosyalar da paydaya dâhildir. Çalıştırılabilir giriş noktası olmayan `app.js`, bakım script'leri, testler ve Worker bu backend coverage kapsamının dışındadır.

Birleşik coverage, iki koşunun Istanbul sayaçları dosya bazında birleştirilerek hesaplandı; yüzdeler toplanmadı veya ortalanmadı. Backend birleşiminde 2.235 instrument edilmiş satırın 488'i; frontend'de 3.248 satırın 1.021'i çalıştırıldı. Bunlar fiziksel LOC sayımı değildir. Frontend kapsamı `src` içindeki JS/JSX kaynaklarını, kullanılmayan kaynak dosyaları dâhil, kapsar; testler ve `setupTests.js` hariçtir. E2E çalışması coverage birleşimine eklenmedi.

Bu yüzdeler CV'de güçlü kalite başarıları olarak sunulmamalı. Öncelikle hangi iş mantığının henüz test edilmediğini gösterir.

Kaynaklar: [backend unit coverage](cv-metrics-evidence/local-measurements/backend-unit-coverage/coverage-summary.json), [integration coverage](cv-metrics-evidence/local-measurements/backend-integration-coverage/coverage-summary.json), [birleşik coverage](cv-metrics-evidence/local-measurements/backend-combined-coverage.json), [frontend coverage](cv-metrics-evidence/local-measurements/frontend-coverage/coverage-summary.json).

## Production build ve bundle boyutu

Production build başarıyla tamamlandı ve ESLint uyarıları üretti. `CI=false` kullanıldı; dolayısıyla bu sonuç, uyarıları hata kabul eden katı CI kontrolünün geçtiği anlamına gelmez. Kaynak kod veya lint ayarları değiştirilmedi.

| Asset | Ham byte | Gzip byte | Brotli byte |
|---|---:|---:|---:|
| Ana JavaScript | 1.277.678 | 344.738 | 266.629 |
| Ana CSS | 166.124 | 33.445 | 27.786 |
| Tüm JavaScript dosyaları | 1.282.196 | 346.518 | 268.229 |

Ana JS gzip boyutu yaklaşık **336,66 KiB**; ana CSS yaklaşık **32,66 KiB**. Boyutlar Node zlib ile yerelde hesaplandı. Bunlar sunucudan ölçülmüş transfer boyutu veya önceki sürüme göre küçülme oranı değildir. Source map'ler runtime toplamlarına eklenmedi. Bütün asset'lerin toplamı da ilk sayfa yüklemesinin transfer boyutu olarak kullanılmamalıdır.

Kaynaklar: [asset ve entrypoint listesi](cv-metrics-evidence/local-measurements/bundle.json), [build logu](cv-metrics-evidence/local-measurements/frontend-build.txt).

## Lighthouse yöntemi

Üç public route (`/`, `/login`, `/register`) için üçer bağımsız headless Chrome koşusu yapıldı. Her koşuda yeni Chrome profili kullanıldı. Lighthouse varsayılan mobil emülasyonu: 412 × 823 viewport, simüle throttling, 150 ms RTT, 1.638,4 Kbps throughput, 4 kat CPU slowdown. Bu ayarlar gerçek cihaz ölçümü değildir.

| Route | Performance medyan | Aralık | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|---:|
| `/` | 75 | 74–75 | 89 | 96 | 92 |
| `/login` | 74 | 74–74 | 79 | 96 | 100 |
| `/register` | 75 | 75–75 | 87 | 96 | 100 |

Skorlar 100 üzerinden verilmiştir. Dış servis engeli nedeniyle Stripe.js yüklenmedi; bu durum axe taramalarında sayfa hatası olarak da kaydedildi. Bu kontrollü koşullar, canlı sitenin dış script yükünü ve davranışını tam temsil etmez. Ölçümler “production Lighthouse score” olarak CV'ye taşınmamalıdır.

| Route | FCP medyan | LCP medyan | TBT medyan | CLS medyan |
|---|---:|---:|---:|---:|
| `/` | 1,652 s | 9,124 s | 40 ms | 0 |
| `/login` | 1,651 s | 11,668 s | 37 ms | 0 |
| `/register` | 1,651 s | 9,120 s | 39 ms | 0 |

Bu mobil simülasyondaki LCP değerleri, yüksek hız başarısı iddiasını desteklemez. Landing sayfasında CLS medyanı 0 olsa da koşulardan birinde yaklaşık 0,055 ölçülmüştür; medyan bütün koşuların sıfır olduğu anlamına gelmez. FCP, LCP, TBT, CLS ve Speed Index için koşu bazlı değerler ve medyan/aralıklar [özet JSON'da](cv-metrics-evidence/local-measurements/summary.json) yer alır.

Kaynaklar: [dokuz koşunun özeti](cv-metrics-evidence/local-measurements/lighthouse-summary.json), örnek tam raporlar [landing](cv-metrics-evidence/local-measurements/lighthouse-landing-1.json), [login](cv-metrics-evidence/local-measurements/lighthouse-login-1.json), [register](cv-metrics-evidence/local-measurements/lighthouse-register-1.json).

## Accessibility ve responsive kontrolleri

axe taraması altı route üzerinde, 1440 × 900 ve 390 × 844 viewport'larında yapıldı: `/`, `/login`, `/register`, `/forgot-password`, `/education-package`, `/free-swimming-package`. Toplam 12 route/viewport taraması, WCAG 2 A/AA ve WCAG 2.1 A/AA etiketleriyle çalıştırıldı. Register taraması yalnızca ilk görünen form adımını kapsar; authenticated ekranlar ve formun sonraki adımları bu taramada yoktur.

İki farklı ihlal kuralı bulundu: `color-contrast` ve `button-name`. Bunlar yalnızca iki sorunlu DOM elementi olduğu anlamına gelmez; aynı kural birden fazla elementte ve ekranda ihlal edilir. 12 taramanın tamamında en az bir ihlal vardır.

| Route | Her viewport'ta bulunan ihlaller | Yatay taşma |
|---|---|---|
| `/` | `color-contrast`, 14 element | Yok |
| `/login` | `button-name`, 1 element | Mobil: 390 px viewport'ta 401 px içerik |
| `/register` | `button-name`, 2 element; `color-contrast`, 6 element | Desktop: 1440 → 1472 px; mobil: 390 → 549 px |
| `/forgot-password` | `color-contrast`, 1 element | Yok |
| `/education-package` | `color-contrast`, 1 element | Mobil: 390 → 451 px |
| `/free-swimming-package` | `color-contrast`, 1 element | Mobil: 390 → 451 px |

axe, `button-name` ihlallerini critical ve kontrast ihlallerini serious olarak işaretledi. Yatay taşma kontrolü `document.documentElement.scrollWidth > innerWidth` karşılaştırmasıdır; tam responsive uyumluluk testi değildir. Otomatik tarama, manuel klavye/ekran okuyucu değerlendirmesinin veya WCAG uygunluk denetiminin yerine geçmez.

Kaynak: [ayrıntılı axe sonuçları ve element hedefleri](cv-metrics-evidence/local-measurements/accessibility.json).

## API yük testi yöntemi

Fixture seti 10 havuz, 1.000 seans ve beş rol için beş sentetik kullanıcıdan oluşur. Bu veri büyüklüğü uygulamanın desteklediği maksimum record sayısı değildir. Integration testlerinden sonra şema yeniden kuruldu; gerçek kayıt, ödeme veya upload kullanılmadı.

İki okuma endpoint'i ölçüldü: public `GET /pools` ve gerçek login/session cookie ile `GET /api/member/sessions`. Login süresi ölçümün dışındadır. Her endpoint önce beş bağlantıyla üç saniye ısıtıldı. Sonra 1, 10 ve 50 bağlantının her biri için üç adet 10 saniyelik koşu yapıldı; pipelining 1. Sonuçlar açık uçlu trafik üretimiyle elde edilen yerel endpoint benchmark'larıdır, gerçek kullanıcı oturumu simülasyonu değildir.

Her yanıtın JSON dizi uzunluğu fixture kontrol yanıtıyla karşılaştırıldı. Bağlantı hataları, timeout, non-2xx ve body mismatch değerleri ayrı tutuldu. 18 ölçüm koşusunda toplam **389.483 istek** tamamlandı; dört hata sayacının tamamı sıfırdı. Isıtma ve kontrol istekleri bu toplama dâhil değildir. İstek sayısı aynı küçük fixture setine yapılan tekrarlı okumadır; farklı kullanıcı veya işlem sayısı değildir.

| Endpoint | Bağlantı | Yanıttaki kayıt | İstek/s medyan | İstek/s aralığı | p50 ms medyan | p99 ms medyan |
|---|---:|---:|---:|---|---:|---:|
| `/pools` | 1 | 10 | 1.116,30 | 1.112,91–1.126,20 | 0 | 1 |
| `/pools` | 10 | 10 | 4.813,20 | 4.754,11–4.840,19 | 1 | 4 |
| `/pools` | 50 | 10 | 5.002,37 | 4.760,19–5.087,10 | 9 | 17 |
| `/api/member/sessions` | 1 | 1.000 | 440,00 | 438,70–451,80 | 2 | 4 |
| `/api/member/sessions` | 10 | 1.000 | 489,00 | 487,90–499,00 | 20 | 34 |
| `/api/member/sessions` | 50 | 1.000 | 484,80 | 472,90–494,30 | 100 | 153 |

Latency sütunları üç koşunun percentile değerlerinin medyanıdır; bütün istekler birleştirilerek hesaplanan percentile değildir. Autocannon'un milisaniye histogramında 0 görünen değer “sıfır sürede yanıt” anlamına gelmez. Her koşu 10 saniye hedeflenmiş olsa da araç raporlarındaki gerçek süreler yaklaşık 10–11,02 saniyedir. Authenticated endpoint'te bağlantıyı 10'dan 50'ye çıkarmak throughput'u artırmamış, p99 gecikmesini yükseltmiştir; bu durum yüksek kapasite iddiasını desteklemez.

Sayısal throughput ve p50/p99 latency medyan/aralıkları [özet JSON'un `load` bölümünde](cv-metrics-evidence/local-measurements/summary.json), bütün koşular [load-results.json](cv-metrics-evidence/local-measurements/load-results.json) dosyasında bulunur. Bu test maksimum kapasite veya dayanıklılık sınırı arayan uzun süreli stres testi değildir.

Kaynak: [fixture büyüklükleri](cv-metrics-evidence/local-measurements/fixtures.json), [ölçüm kodu](../tests/measurements/run.mjs).

## CV için yorum

Yeni kanıtla kullanılabilecek ifade:

> Validated a React and Express application with 165 passing tests across backend unit, PostgreSQL integration, frontend component, and browser smoke suites in an isolated local environment.

“Validated” burada yerel çalıştırma sonucunu anlatır; testlerin yazarlığını veya bütün iş akışlarının test edildiğini iddia etmez. Eski kapsam bullet'ları hâlâ geçerlidir. Coverage yüzdeleri ve accessibility bulguları iyileştirme alanıdır; “high coverage” veya “accessible application” iddiası yapılmamalıdır. Yerel load ve Lighthouse değerleri, ortam kısıtları çıkarılarak üretim kapasitesi gibi sunulmamalıdır.

## Tekrar çalıştırma

Önkoşullar: Node/npm, kurulu Google Chrome, backend bağımlılıkları ve işletim sistemine uygun `embedded-postgres` binary'si. Backend lockfile ile kurulum için `npm --prefix backend ci`; ölçüm araçları için `npm --prefix tests/measurements ci` kullanılabilir. PostgreSQL paketinin kurulum script'leri gerekli binary izinlerini/symlink'leri hazırlamalıdır.

Repository kökünden:

```sh
npm --prefix tests/measurements run measure
npm --prefix tests/measurements run summarize
```

Runner yeni geçici kopya oluşturur; frontend ve mevcut E2E bağımlılıklarını kendi lockfile'larıyla kurar. İlk kurulum ağ erişimi gerektirir. Varsayılan rapor klasörü `docs/cv-metrics-evidence/local-measurements` şeklindedir. Önceki ölçümü korumak için iki komutta da `MEASUREMENT_OUTPUT` ile yeni bir dizin seçin. `MEASUREMENT_WORKDIR` önceki geçici kopyayı yeniden kullanabilir; normalde yeni kopya tercih edilmelidir. `MEASUREMENT_PHASE` değerleri `all`, `tests`, `build`, `browser`, `load` olup varsayılan `all` değeridir. `summarize`, bütün aşamaların dosyalarının mevcut olmasını gerektirir.

Yerel portlar: UI 3300, API 3301, PostgreSQL 55439. Runner yalnızca kendi başlattığı süreçleri kapatır; geçici cluster verisini ve ayrıntılı backend logunu geçici kopyada bırakır. Runtime backend logunun son kısmı kanıt klasöründe tutulur. Coverage JSON dosyaları yeniden birleştirme için saklanır. Raporlardaki makineye özel repository/geçici dizin yolları normalize edilir; ölçüm sayıları değiştirilmez.

Araç referansları: [Lighthouse programatik kullanım](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md), [Autocannon API](https://github.com/mcollina/autocannon/blob/master/README.md), [Embedded PostgreSQL](https://github.com/leinelissen/embedded-postgres). Bu bağlantılar ölçüm yönteminin araç kaynaklarıdır; proje sonuçlarının kanıtı yerel JSON raporlarıdır.
