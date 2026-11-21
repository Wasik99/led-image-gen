# led-image-gen

Konfigurator przeglądarkowy do tworzenia dekoracyjnych obrazów 3D. Użytkownik podaje docelowe wymiary obrazu, a aplikacja generuje jedną kompozycję i dzieli ją na kwadratowe kafelki do osobnego druku 3D. Ułożone obok siebie kafelki tworzą spójny obraz. Aplikacja ma być dostępna pod adresem WWW.

## Pierwszy etap

- Użytkownik podaje szerokość i wysokość obrazu.
- Aplikacja generuje jeden gotowy wzór z siatki kwadratów o różnych wysokościach. Każdy kafelek zawiera kilka kwadratów. Kwadraty mają płaskie wierzchy i ostre krawędzie oraz stykają się bez dekoracyjnych rowków. Siatka zachowuje ciągłość na granicach kafelków.
- Kafelki są jednakowe i kwadratowe, z płaskim, pełnym tyłem i podstawą o grubości 5 mm. Wysokość reliefu liczy się od wierzchu podstawy i lokalnie może wynosić 0 mm. Materiał prototypu to PLA.
- Podgląd 3D pokazuje całą kompozycję. Eksport to jeden ZIP z osobnym plikiem STL dla każdego kafelka. Nazwa pliku wskazuje jego rząd i kolumnę.

### Próba prototypu

Obraz 200 × 200 mm, siatka 2 × 2, cztery kafelki 100 × 100 mm. Sprawdzamy, czy podgląd pokazuje jeden obraz, ZIP zawiera cztery właściwie oznaczone modele, a po wydrukowaniu i ułożeniu kafelków obok siebie wzór jest spójny na wszystkich stykach.

## Ustalenia na późniejsze etapy

- Dobór kafelków do ręcznie podanego pola roboczego stołu. Wymiary w pełnych milimetrach i minimalny bok kafelka 50 mm. Domyślna propozycja to największy pasujący rozmiar z listy dopuszczalnych boków. Gdy dokładny podział jest niemożliwy, aplikacja pokazuje jedną najbliższą propozycję wymiarów obrazu do zatwierdzenia. Propozycja może przekraczać podany wymiar. Kafelki w obrębie obrazu mają ten sam rozmiar.
- Regulacja liczby kwadratów na boku kafelka i maksymalnej wysokości reliefu. Tryb losowy losuje wysokości z ciągłego zakresu i pozwala ponowić losowanie przy zachowaniu ustawień. Tryb fali obejmuje cały obraz i pozwala ustawić jej gęstość oraz kierunek. Podgląd ma odzwierciedlać zmiany na bieżąco i umożliwiać przełączanie obrysów kafelków.
- Osobno drukowane klipsy PLA do rozłączalnego montażu od tyłu. Klipsy mieszczą się w grubości kafelków, aby obraz przylegał do ściany. Eksport grupuje klipsy na płytach mieszczących się na zadeklarowanym stole i dobiera odstępy.
- Otwory do zawieszenia w górnym rzędzie. Konfigurator proponuje liczbę i pozycje na podstawie wymiarów oraz orientacji obrazu i pozwala je zmienić w granicach wymaganego minimum. Opcjonalna rama jest osobnym elementem. Oświetlenie pozostaje tematem na później.

## Wznowienie pracy

Projekt jest na etapie założeń. Następna decyzja to wybór technologii podglądu 3D i generowania geometrii do STL, w tym ustalenie, czy modele powstają w przeglądarce, czy na serwerze. Punktem odniesienia przy tym wyborze jest próba 200 × 200 mm opisana wyżej.
