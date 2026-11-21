# led-image-gen

Konfigurator przeglądarkowy do tworzenia dekoracyjnych obrazów 3D. Użytkownik podaje docelowe wymiary obrazu, a aplikacja generuje jedną kompozycję i dzieli ją na kwadratowe kafelki do osobnego druku 3D. Ułożone obok siebie kafelki tworzą spójny obraz. Aplikacja ma być dostępna pod adresem WWW.

## Pierwszy etap

- Dobór kafelków do ręcznie podanego pola roboczego stołu. Wymiary w pełnych milimetrach i minimalny bok kafelka 50 mm. Domyślna propozycja to największy pasujący rozmiar z listy dopuszczalnych boków. Gdy dokładny podział jest niemożliwy, aplikacja pokazuje jedną najbliższą propozycję wymiarów obrazu do zatwierdzenia. Propozycja może przekraczać podany wymiar. Kafelki w obrębie obrazu mają ten sam rozmiar.
- Kafelki mają kwadratową podstawę o grubości 5 mm. Domyślny wzór to „Gładki”. Opcjonalna „Fala z kwadratów” dodaje siatkę 5 × 5 pól na kafelek. Wysokości są obliczane dla całego obrazu. Można ustawić maksimum od 1 do 30 mm ponad podstawą (domyślnie 14 mm), od 1 do 3 powtórzeń i kierunek poziomy, pionowy lub ukośny. „Losowe kwadraty” mają 5 × 5 pól na kafelek i losują wysokości z ciągłego zakresu od 0 do ustawionego maksimum. Przycisk „Losuj ponownie” zmienia układ, zachowując pozostałe ustawienia. Materiał prototypu to PLA.
- „Równoległe łuki” oferują pięć tras: łuk U, zakręt 90°, eskę oraz pasy poziome i pionowe. Motyw można obracać co 90° i przesuwać w obu osiach o ±25% odpowiedniego wymiaru obrazu. Pasy mają zaokrąglony profil o nominalnej wysokości 8 mm ponad podstawą i zachowują ciągłość na stykach kafelków.
- „Własny układ” pozwala swobodnie rozmieścić proste pasy i zakręty 90° na planszy całego obrazu. Elementy obraca się co 90°, a pasujące końce przyciągają się. Rozmiar (50–150%) i liczba pasów (1–7) dotyczą zaznaczonego elementu lub jego połączonej grupy. Przesuwany element przy podłączeniu przejmuje ustawienia elementu docelowego. Ułożona kompozycja trafia do podglądu i STL.
- Dla obu wzorów z kwadratami opcja „Delikatne rowki” ścina górne krawędzie o 0,6 mm. Na styku pól o tej samej wysokości powstaje rowek o szerokości 1,2 mm. W najniższych rowkach grubość wynosi 4,4 mm.
- Podgląd 3D pokazuje całą kompozycję. Pole „Ukryj podział” przełącza obrysy kafelków. Eksport to jeden ZIP z osobnym plikiem STL dla każdego kafelka. Nazwa pliku wskazuje jego rząd i kolumnę.

### Próba prototypu

Obraz 200 × 200 mm, siatka 2 × 2, cztery kafelki 100 × 100 mm. Sprawdzamy, czy podgląd pokazuje jeden obraz, ZIP zawiera cztery właściwie oznaczone modele, a po wydrukowaniu i ułożeniu kafelków obok siebie przylegają do siebie i tworzą płaską powierzchnię.

## Ustalenia na późniejsze etapy

- Regulacja liczby kwadratów na boku kafelka.
- Osobno drukowane klipsy PLA do rozłączalnego montażu od tyłu. Klipsy mieszczą się w grubości kafelków, aby obraz przylegał do ściany. Eksport grupuje klipsy na płytach mieszczących się na zadeklarowanym stole i dobiera odstępy.
- Otwory do zawieszenia w górnym rzędzie. Konfigurator proponuje liczbę i pozycje na podstawie wymiarów oraz orientacji obrazu i pozwala je zmienić w granicach wymaganego minimum. Opcjonalna rama jest osobnym elementem. Oświetlenie pozostaje tematem na później.

## Uruchomienie prototypu

Wymagany jest Node.js 24. W katalogu repozytorium uruchom:

```sh
npm ci
npm run dev
```

Otwórz adres podany przez Vite. Po zapisaniu zmian w kodzie Vite odświeży podgląd. Komenda `npm run build` sprawdza TypeScript i buduje wersję do publikacji w katalogu `dist/`.

## Gdzie edytować kod

- `src/layout.ts` dobiera pasujące rozmiary kafelków i proponuje korektę wymiarów obrazu. Przy remisie w odległości od podanych wymiarów wybiera propozycję z większym kafelkiem.
- `src/patterns.ts` definiuje dostępne wzory i wysokości poszczególnych pól.
- `src/layout-editor.ts` obsługuje planszę 2D. `src/custom-layout.ts` definiuje elementy, przyciąganie końców i geometrię pasów.
- `src/geometry.ts` dzieli powierzchnię obrazu na zamknięte modele kafelków. Geometria jest wspólna dla podglądu i eksportu.
- `src/preview.ts` ustawia kamerę, oświetlenie i obracanie obrazu w Three.js.
- `src/export.ts` tworzy modele STL i archiwum ZIP.
- `index.html`, `src/main.ts` i `src/style.css` odpowiadają za pola wymiarów, reakcję na zmiany i wygląd strony.

## Wznowienie pracy

Prototyp generuje modele w przeglądarce. Obraz ma limit 2000 mm na oś. Domyślne pole robocze 180 × 180 mm pozwala wygenerować dla obrazu 200 × 200 mm cztery kafelki 100 × 100 mm. Na pierwszy test fizyczny pobierz ZIP dla obrazu 200 × 200 mm i sprawdź złożenie czterech wydruków PLA.
