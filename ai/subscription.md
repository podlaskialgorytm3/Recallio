# Request: Panel administracyjny "Plany Subskrybcyjne" (/admin)

## Cel

Stworzenie panelu administracyjnego dostępnego pod podstroną `/admin`, w którym administrator może tworzyć i zarządzać **pakietami limitów** (model "kup paczkę X pytań", a nie klasyczna subskrypcja czasowa). Użytkownik kupuje pakiet zawierający określoną pulę: limitu sprawdzonych pytań oraz limitu wygenerowanych pytań/odpowiedzi. Po wykupieniu pakiet jest automatycznie przypisywany do konta użytkownika, a administrator ma również możliwość ręcznego przypisania/nadpisania planu z poziomu panelu.

## 1. Dostęp i routing

- Panel dostępny pod `/admin` (z odpowiednim middleware/guardem — dostęp wyłącznie dla roli `admin`; pozostali użytkownicy przekierowani lub błąd 403)
- Sekcja w panelu: **"Plany Subskrybcyjne"**
- Layout spójny z resztą panelu admina (jeśli panel admina już częściowo istnieje — dopasować styl; jeśli nie istnieje, zaproponować bazowy layout: sidebar/nawigacja + obszar treści)

## 2. Lista planów (widok główny)

Tabela/lista istniejących planów z kolumnami:
- 🏷️ Nazwa planu
- 🔍 Limit sprawdzonych pytań
- ✨ Limit wygenerowanych pytań/odpowiedzi
- 🔄 Typ resetu limitu (cykliczny / jednorazowy — patrz pkt 3)
- 💰 Cena pakietu
- 👥 Liczba aktywnych użytkowników na tym planie
- 🟢/⚪ Status (aktywny / wycofany — nieaktywny plan nie jest dostępny do zakupu, ale istniejący użytkownicy go zachowują)
- Akcje: Edytuj / Dezaktywuj / Usuń (usuń tylko jeśli nikt nie ma przypisanego planu)

Przycisk: **➕ Nowy plan**

## 3. Formularz tworzenia/edycji planu

| Pole | Typ | Opis |
|---|---|---|
| 🏷️ Nazwa planu | Tekst | np. "Pakiet Starter", "Pakiet Pro" |
| 📝 Opis planu | Tekst (opcjonalnie) | Krótki opis widoczny dla użytkownika przy zakupie |
| 🔍 Limit sprawdzonych pytań | Liczba | np. 1000 |
| ✨ Limit wygenerowanych pytań/odpowiedzi | Liczba | np. 1000 |
| 💰 Cena | Liczba + waluta | Cena jednorazowa za pakiet |
| 🔄 Typ resetu limitu | Wybór | **Jednorazowy** (limit wykorzystuje się i wygasa, brak odnowienia) / **Cykliczny** (limit odnawia się co wybrany okres — np. miesiąc) |
| ⏱️ Okres odnawiania (jeśli cykliczny) | Wybór | np. co 30 dni / co miesiąc kalendarzowy |
| ⏳ Ważność pakietu (jeśli jednorazowy) | Liczba dni / "bez wygaśnięcia" | Po jakim czasie niewykorzystany pakiet przepada (opcjonalnie) |
| 🟢 Status planu | Toggle | Aktywny (dostępny do zakupu) / Ukryty (niewidoczny dla nowych zakupów) |

## 4. Automatyczne przypisanie po zakupie

- Po sfinalizowaniu zakupu przez użytkownika system automatycznie:
  - przypisuje wybrany plan do konta użytkownika
  - inicjalizuje liczniki wykorzystania (sprawdzone pytania: 0/limit, wygenerowane pytania: 0/limit)
  - jeśli użytkownik ma już aktywny plan tego samego typu — limity się **sumują** (a nie nadpisują), zgodnie z modelem "dokupywania puli"
  - zapisuje datę zakupu i (jeśli dotyczy) datę wygaśnięcia/odnowienia

## 5. Ręczne zarządzanie przypisaniem przez admina

Osobna zakładka/widok: **"Użytkownicy i przypisania"**
- Lista użytkowników z aktualnym planem, wykorzystaniem limitów (pasek postępu np. 320/1000 sprawdzonych) i datą ostatniego zakupu
- Możliwość ręcznego:
  - przypisania planu użytkownikowi (np. w ramach promocji/wsparcia)
  - **doładowania** limitu o dowolną wartość (np. gratis +100 pytań jako rekompensata)
  - zresetowania licznika wykorzystania
  - cofnięcia/anulowania planu

## 6. Dodatkowe elementy warte uwzględnienia

- 📊 **Dashboard/statystyki** — łączna liczba sprzedanych pakietów, przychód, najpopularniejszy plan, średnie wykorzystanie limitów
- 🚦 **Mechanizm blokady po przekroczeniu limitu** — co dzieje się z użytkownikiem po wyczerpaniu puli: blokada akcji + komunikat "Wykorzystałeś limit, dokup pakiet" + CTA do zakupu
- 🔔 **Powiadomienia progowe** — np. e-mail/notyfikacja w aplikacji przy 80% i 100% wykorzystania limitu
- 🧾 **Historia transakcji** — log zakupów per użytkownik (data, plan, cena, metoda płatności) do celów księgowych/supportu
- 🆓 **Plan darmowy/domyślny** — limit przyznawany każdemu nowemu użytkownikowi bez zakupu (np. 10 sprawdzeń / 10 generacji za darmo), żeby mógł przetestować funkcję przed zakupem
- 🔁 **Łączenie limitów z różnych zakupów** — jasna logika, czy limity z wielu pakietów się sumują, czy obowiązuje tylko najnowszy (rekomendacja: sumowanie, zgodnie z modelem "kupuję pulę")
- 📜 **Audit log działań admina** — kto i kiedy utworzył/edytował/usunął plan lub ręcznie zmienił limit użytkownika (ważne przy sporach/reklamacjach)
- 🛡️ **Walidacja formularza** — limity i cena nie mogą być ujemne lub zerowe; nazwa planu unikalna

## Poza zakresem tego requestu (do ustalenia osobno)

- Integracja z konkretnym dostawcą płatności (Stripe/PayU/Przelewy24 itd.) — wymaga osobnej decyzji i konfiguracji
- Faktury VAT / dokumenty księgowe
- Zwroty i obsługa reklamacji zakupu