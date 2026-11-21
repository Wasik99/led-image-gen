# led-image-gen

Konfigurator przeglądarkowy do tworzenia dekoracyjnych obrazów 3D. Użytkownik podaje docelowe wymiary obrazu, a aplikacja generuje jedną kompozycję i dzieli ją na kwadratowe kafelki do osobnego druku 3D. Ułożone obok siebie kafelki tworzą spójny obraz. Aplikacja ma być dostępna pod adresem WWW.

## Pierwszy etap

- Dobór kafelków do ręcznie podanego pola roboczego stołu. Wymiary w pełnych milimetrach i minimalny bok kafelka 50 mm. Domyślna propozycja to największy pasujący rozmiar z listy dopuszczalnych boków. Gdy dokładny podział jest niemożliwy, aplikacja pokazuje jedną najbliższą propozycję wymiarów obrazu do zatwierdzenia. Propozycja może przekraczać podany wymiar. Kafelki w obrębie obrazu mają ten sam rozmiar.
- Kafelki są jednakowymi gładkimi kwadratami o grubości 5 mm. Materiał prototypu to PLA.
- Podgląd 3D pokazuje całą kompozycję. Eksport to jeden ZIP z osobnym plikiem STL dla każdego kafelka. Nazwa pliku wskazuje jego rząd i kolumnę.

### Próba prototypu

Obraz 200 × 200 mm, siatka 2 × 2, cztery kafelki 100 × 100 mm. Sprawdzamy, czy podgląd pokazuje jeden obraz, ZIP zawiera cztery właściwie oznaczone modele, a po wydrukowaniu i ułożeniu kafelków obok siebie przylegają do siebie i tworzą płaską powierzchnię.

## Ustalenia na późniejsze etapy

- Wzór z kwadratów o różnych wysokościach, wspólny dla całej kompozycji. Regulacja liczby kwadratów na boku kafelka i maksymalnej wysokości reliefu. Tryb losowy losuje wysokości z ciągłego zakresu i pozwala ponowić losowanie przy zachowaniu ustawień. Tryb fali obejmuje cały obraz i pozwala ustawić jej gęstość oraz kierunek. Podgląd ma odzwierciedlać zmiany na bieżąco i umożliwiać przełączanie obrysów kafelków.
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
- `src/geometry.ts` tworzy model kafelka o wybranym boku i stałej grubości. Geometria jest wspólna dla podglądu i eksportu.
- `src/preview.ts` ustawia kamerę, oświetlenie i obracanie obrazu w Three.js.
- `src/export.ts` tworzy modele STL i archiwum ZIP.
- `index.html`, `src/main.ts` i `src/style.css` odpowiadają za pola wymiarów, reakcję na zmiany i wygląd strony.

## Wznowienie pracy

Prototyp generuje modele w przeglądarce. Obraz ma limit 2000 mm na oś. Domyślne pole robocze 180 × 180 mm pozwala wygenerować dla obrazu 200 × 200 mm cztery kafelki 100 × 100 mm. Na pierwszy test fizyczny pobierz ZIP dla obrazu 200 × 200 mm i sprawdź złożenie czterech wydruków PLA.
