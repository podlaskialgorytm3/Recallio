# Inteligentne tworzenie zestawów — specyfikacja funkcjonalności

## 1. Strona wyboru trybu tworzenia

Nazwa funkcjonalności zastępująca osobne strony "Wgraj Zestaw" i "Utwórz zestaw": **"Kreacja zestawu"**.

Po wejściu w "Kreacja zestawu" użytkownik widzi 3 opcje do wyboru:
- 📤 Wgraj zestaw (istniejąca funkcjonalność)
- ✍️ Utwórz zestaw ręcznie (istniejąca funkcjonalność)
- 🧠 Inteligentne tworzenie zestawów (nowa funkcjonalność)

Layout tej strony ma wyglądać analogicznie do istniejącej strony wyboru trybu nauki ("Pojedyncze pytania" vs "Wszystkie pytania") — czyli te same karty/przyciski, ten sam styl wizualny. Przy każdej opcji zastosować emotki.

## 2. Formularz "Inteligentne tworzenie zestawów"

Aplikacja jest uniwersalna — pytania mogą dotyczyć dowolnej tematyki (brak ograniczenia do jednej dziedziny). Po wybraniu tej opcji użytkownik konfiguruje generowanie zestawu za pomocą poniższych parametrów:

| Parametr | Typ kontrolki | Zakres / opcje |
|---|---|---|
| 📄 Plik źródłowy | Upload (1-2 pliki) | .pdf, .md, .txt |
| 🔢 Ilość pytań | Suwak | np. 3-50 |
| 📏 Długość odpowiedzi (słowa) | Suwak | 10-200 |
| 🎯 Poziom trudności | Wybór (przyciski/select) | Łatwy / Średni / Trudny / Mieszany |
| 🗣️ Język generowanych pytań | Select | Polski / Angielski / Auto-wykryj z pliku |
| 📚 Zakres tematyczny (opcjonalnie) | Pole tekstowe | np. "skup się tylko na rozdziale 3" |
| 🔁 Unikaj duplikatów z poprzednich zestawów | Checkbox/toggle | Tak / Nie |

**Ważne ograniczenie formatu pytań:** Wygenerowane pytania mają mieć wyłącznie formę **pytanie-odpowiedź otwartą**. Nie ma możliwości generowania innych form (jednokrotny wybór, wielokrotny wybór, prawda/fałsz, luki do uzupełnienia itd.) — to jedyny akceptowalny format, bez wyjątków. Z tego powodu parametr "Typ pytań" nie występuje w formularzu — tryb otwarty jest jedynym i domyślnym zachowaniem całej funkcjonalności.

Po zatwierdzeniu formularza aplikacja na podstawie zawartości pliku oraz wybranych parametrów generuje zestaw pytań poprzez wywołanie modelu AI.

## 3. Format odpowiedzi z AI

Zapytanie do AI musi wymuszać odpowiedź **wyłącznie** w poniższym formacie JSON — żaden inny format nie jest akceptowalny (bez preambuły, bez markdown code fence w treści odpowiedzi modelu, sam czysty JSON). Każde pytanie musi być w formie otwartej pytanie-odpowiedź — bez wyjątków, bez wariantów wielokrotnego wyboru czy prawda/fałsz:

```json
[
  {
    "id": 1,
    "question": "Co to jest model OSI? Dlaczego jest użyteczny?",
    "answer": "Model OSI to 7-warstwowy referencyjny model komunikacji sieciowej standaryzujący działanie sieci. Jest użyteczny, ponieważ porządkuje komunikację (podział na niezależne warstwy) i pozwala na bezproblemową współpracę sprzętu i oprogramowania pochodzącego od różnych producentów."
  },
  {
    "id": 2,
    "question": "Co oznaczają akronimy: PAN, LAN, MAN, WAN, GAN?",
    "answer": "PAN (Personal Area Network) - sieć osobista. LAN (Local Area Network) - sieć lokalna. MAN (Metropolitan Area Network) - sieć miejska. WAN (Wide Area Network) - sieć rozległa. GAN (Global Area Network) - sieć globalna."
  },
  {
    "id": 3,
    "question": "Do czego służy protokół DHCP?",
    "answer": "DHCP (Dynamic Host Configuration Protocol) służy do zautomatyzowanej konfiguracji hostów w sieci. Działa wg schematu DORA (Discover, Offer, Request, Acknowledge). Klient otrzymuje: adres IP, maskę sieciową, adres bramy domyślnej."
  }
]
```

Struktura każdego obiektu:
- `id` — liczba całkowita, kolejny numer pytania w zestawie
- `question` — treść pytania otwartego (string)
- `answer` — treść odpowiedzi otwartej (string), długość zgodna z parametrem "Długość odpowiedzi (słowa)"

Po wygenerowaniu odpowiedzi aplikacja parsuje JSON i [tu dopisz: zapisuje jako nowy zestaw / pokazuje podgląd do edycji przed zapisem].