# Wymagania aplikacji – System Nauki Fiszek

## Opis ogólny

Aplikacja webowa do nauki metodą pytań i odpowiedzi, oparta na plikach JSON. Użytkownik wgrywa własne zestawy pytań, odpowiada na nie, a system ocenia odpowiedzi przy pomocy AI i prowadzi użytkownika przez kolejne tury, aż do osiągnięcia wymaganego progu wiedzy.

---

## Technologie

- **Frontend / Backend:** Next.js 15 (App Router)
- **Baza danych:** PostgreSQL
- **ORM:** Prisma
- **Ocenianie odpowiedzi:** Gemini Flesh 1.5 – porównanie semantyczne odpowiedzi użytkownika z wzorcową
- **Autentykacja:** NextAuth.js

---

## Model danych

### Tabele

```
User
  - id, email, passwordHash, createdAt

QuestionSet (zestaw pytań z pliku JSON)
  - id, userId, name, createdAt
  - questions: Question[]

Question
  - id, questionSetId, externalId (z JSON), question, answer

Session (sesja nauki)
  - id, userId, questionSetId, createdAt, status (active/finished)
  - mode: "random" | "sequential"
  - threshold: Int (próg %, np. 70)

Round (tura w ramach sesji)
  - id, sessionId, roundNumber, createdAt, completedAt
  - averageScore: Float

RoundAnswer (odpowiedź użytkownika na pytanie w danej turze)
  - id, roundId, questionId
  - userAnswer: Text
  - score: Int (0–100)
  - feedback: Text (komentarz AI)
  - answeredAt
```

---

## Scenariusz działania

### 1. Wgranie pliku JSON

- Użytkownik wgrywa plik `.json` w formacie:
```json
[
  {
    "id": 1,
    "question": "Co to jest ARP?",
    "answer": "ARP jest protokołem..."
  }
]
```
- System waliduje format pliku (sprawdza obecność pól `id`, `question`, `answer`).
- W przypadku błędu – czytelny komunikat z podaniem problematycznego wiersza.
- Po poprawnej walidacji plik jest zapisywany w bazie jako `QuestionSet` z przypisanymi pytaniami (`Question`).
- Użytkownik nadaje zestawowi nazwę (domyślnie nazwa pliku).

### 2. Konfiguracja sesji

Po wgraniu pliku użytkownik konfiguruje sesję:
- **Tryb pytań:** losowy lub po kolei.
- **Próg zaliczenia (%):** np. 70% – pytania, na które użytkownik odpowie poniżej tego progu, trafią do kolejnej tury.

### 3. Przebieg tury

- System wyświetla pytania jedno po drugim (według wybranego trybu).
- Widoczny jest pasek postępu (np. „Pytanie 3 / 12") oraz numer tury.
- Użytkownik wpisuje odpowiedź w polu tekstowym i zatwierdza.

### 4. Ocenianie odpowiedzi przez AI

- System wysyła odpowiedź użytkownika i wzorcową odpowiedź Google Gemini API – darmowy tier jest bardzo hojny (1500 requestów/dzień na Gemini 1.5 Flash). .

- AI zwraca:
  - **Wynik (0–100%)** – stopień pokrycia treści odpowiedzi wzorcowej.
  - **Feedback (2–3 zdania)** – co zostało pominięte lub błędnie podane.
- Wynik i feedback są wyświetlane natychmiast po zatwierdzeniu odpowiedzi.

### 5. Podsumowanie tury

Po odpowiedzeniu na wszystkie pytania w turze system wyświetla:
- Średni wynik całej tury.
- Listę pytań z wynikami (oznaczenie: zaliczone / niezaliczone względem progu).
- Jeśli jakieś pytania nie przekroczyły progu → zachęta do wzięcia udziału w kolejnej turze (tylko z tymi pytaniami).
- Jeśli wszystkie pytania przekroczyły próg → komunikat o ukończeniu sesji z gratulacjami.

### 6. Kolejne tury

- Każda kolejna tura zawiera tylko pytania, których wynik był poniżej progu w poprzedniej turze.
- Liczba tur jest nieograniczona – sesja kończy się, gdy wszystkie pytania osiągną próg **lub** gdy użytkownik zdecyduje się zakończyć ręcznie.

---

## Historia sesji

Użytkownik ma dostęp do zakładki **Historia**, gdzie może przeglądać:
- Listę wszystkich sesji z datą, nazwą zestawu i wynikiem końcowym.
- Szczegóły każdej sesji: tury, pytania, odpowiedzi użytkownika, wyniki AI i feedback.
- Wykres postępu między turami (średni wynik tury 1 → 2 → 3...).

---

## Widoki aplikacji

| Widok | Opis |
|---|---|
| `/login` | Logowanie / rejestracja |
| `/dashboard` | Lista zestawów pytań użytkownika |
| `/sets/upload` | Wgrywanie nowego pliku JSON |
| `/session/[id]/config` | Konfiguracja sesji (tryb + próg) |
| `/session/[id]/question` | Aktywne pytanie |
| `/session/[id]/result` | Podsumowanie odpowiedzi |
| `/session/[id]/round-summary` | Podsumowanie tury |
| `/history` | Historia wszystkich sesji |
| `/history/[sessionId]` | Szczegóły sesji |

---

## Wymagania niefunkcjonalne

- Odpowiedź AI powinna pojawić się w ciągu maksymalnie 5 sekund – w tym czasie wyświetlany jest wskaźnik ładowania.
- Aplikacja powinna działać responsywnie (mobile + desktop).
- Dane użytkownika są izolowane – każdy widzi tylko swoje zestawy i historię.
- Plik JSON może zawierać maksymalnie 200 pytań na zestaw.