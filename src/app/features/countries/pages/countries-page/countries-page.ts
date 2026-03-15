import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import worldMapData from '@svg-maps/world';

import { CountryRegion, CountrySortOption, CountrySummary } from '../../../../core/models/country.model';
import { CountriesApiService } from '../../../../core/services/countries-api.service';
import { CountryCardComponent } from '../../../../shared/components/country-card/country-card';

type RegionFilter = 'all' | Extract<CountryRegion, 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania'>;

interface CountriesState {
  loading: boolean;
  countries: CountrySummary[];
  error: string | null;
}

@Component({
  selector: 'app-countries-page',
  imports: [CommonModule, FormsModule, CountryCardComponent],
  templateUrl: './countries-page.html',
  styleUrl: './countries-page.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CountriesPage {
  private readonly countriesApi = inject(CountriesApiService);
  private readonly reloadToken = signal(0);
  private readonly hoveredMapCountryName = signal<string | null>(null);
  private readonly selectedMapCountryName = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly selectedRegion = signal<RegionFilter>('all');
  readonly sortBy = signal<CountrySortOption>('name');

  readonly regions: Array<{ value: RegionFilter; label: string }> = [
    { value: 'all', label: 'Todas as regiões' },
    { value: 'Africa', label: 'Africa' },
    { value: 'Americas', label: 'Americas' },
    { value: 'Asia', label: 'Asia' },
    { value: 'Europe', label: 'Europa' },
    { value: 'Oceania', label: 'Oceania' },
  ];

  readonly sortOptions: Array<{ value: CountrySortOption; label: string }> = [
    { value: 'name', label: 'Nome' },
    { value: 'population', label: 'População' },
    { value: 'area', label: 'Área' },
  ];

  readonly state = toSignal(
    toObservable(this.reloadToken).pipe(switchMap(() => this.buildCountriesState())),
    {
      initialValue: {
        loading: true,
        countries: [],
        error: null,
      },
    },
  );

  readonly filteredCountries = computed(() => {
    const { countries } = this.state();
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const region = this.selectedRegion();
    const sortOption = this.sortBy();

    return [...countries]
      .filter((country) => {
        const matchesRegion = region === 'all' || country.region === region;
        const matchesSearch =
          !normalizedSearch ||
          country.name.toLowerCase().includes(normalizedSearch) ||
          country.officialName.toLowerCase().includes(normalizedSearch);

        return matchesRegion && matchesSearch;
      })
      .sort((left, right) => compareCountries(left, right, sortOption));
  });

  readonly resultSummary = computed(() => {
    const visibleCountries = this.filteredCountries().length;
    const totalCountries = this.state().countries.length;

    if (this.state().loading) {
      return 'Carregando países...';
    }

    if (this.state().error) {
      return 'Não foi possível consultar a API no momento.';
    }

    return `${visibleCountries} de ${totalCountries} países exibidos`;
  });

  readonly hasActiveFilters = computed(
    () => !!this.searchTerm().trim() || this.selectedRegion() !== 'all' || this.sortBy() !== 'name',
  );
  readonly hoveredMapCountry = computed(() => this.findCountryByName(this.hoveredMapCountryName()));
  readonly selectedMapCountry = computed(() => this.findCountryByName(this.selectedMapCountryName()));
  readonly selectedMapCountryNameValue = computed(() => this.selectedMapCountryName());
  readonly worldMap = worldMapData;
  readonly worldLocations = worldMapData.locations as Array<{ id: string; name: string; path: string }>;

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedRegion.set('all');
    this.sortBy.set('name');
  }

  retry(): void {
    this.countriesApi.clearCountriesCache();
    this.reloadToken.update((value) => value + 1);
  }

  protected trackByCode(_: number, country: CountrySummary): string {
    return country.code;
  }

  protected clearMapSelection(): void {
    this.selectedMapCountryName.set(null);
    this.hoveredMapCountryName.set(null);
  }

  @HostListener('document:keydown.escape')
  protected closeMapModalOnEscape(): void {
    if (this.selectedMapCountry()) {
      this.clearMapSelection();
    }
  }

  protected onMapCountryHover(countryName: string | null): void {
    this.hoveredMapCountryName.set(countryName);
  }

  protected onMapCountryClick(countryName: string): void {
    this.selectedMapCountryName.set(countryName);
  }

  protected isMapCountrySelected(countryName: string): boolean {
    return this.selectedMapCountryName() === countryName;
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  private findCountryByName(name: string | null): CountrySummary | null {
    if (!name) {
      return null;
    }

    const normalizedTarget = normalizeText(name);
    const normalizedAliasTarget = countryNameAliases[normalizedTarget] ?? normalizedTarget;

    return (
      this.state().countries.find(
        (country) =>
          normalizeText(country.name) === normalizedTarget ||
          normalizeText(country.officialName) === normalizedTarget ||
          normalizeText(country.name) === normalizedAliasTarget ||
          normalizeText(country.officialName) === normalizedAliasTarget,
      ) ?? null
    );
  }

  private buildCountriesState() {
    return this.countriesApi.getAllCountries().pipe(
      map(
        (countries): CountriesState => ({
          loading: false,
          countries,
          error: null,
        }),
      ),
      startWith({
        loading: true,
        countries: [],
        error: null,
      }),
      catchError(() =>
        of({
          loading: false,
          countries: [],
          error: 'Não foi possível carregar a lista de países.',
        }),
      ),
    );
  }
}

function compareCountries(
  left: CountrySummary,
  right: CountrySummary,
  sortOption: CountrySortOption,
): number {
  if (sortOption === 'population') {
    return right.population - left.population || left.name.localeCompare(right.name);
  }

  if (sortOption === 'area') {
    return right.area - left.area || left.name.localeCompare(right.name);
  }

  return left.name.localeCompare(right.name);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const countryNameAliases: Record<string, string> = {
  'united states of america': 'united states',
  'russian federation': 'russia',
  bolivia: 'bolivia (plurinational state of)',
  tanzania: 'tanzania, united republic of',
  'czech republic': 'czechia',
  'lao peoples democratic republic': 'laos',
  'syrian arab republic': 'syria',
  'iran, islamic republic of': 'iran',
  'moldova, republic of': 'moldova',
  'venezuela, bolivarian republic of': 'venezuela',
  'viet nam': 'vietnam',
  korea: 'south korea',
  "korea (democratic peoples republic of)": 'north korea',
  "democratic republic of the congo": 'dr congo',
  "congo": 'republic of the congo',
  "myanmar": 'myanmar',
  "cape verde": 'cabo verde',
  "swaziland": 'eswatini',
  "macedonia": 'north macedonia',
};
