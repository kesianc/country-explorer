import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { CountryDetail, CountryRegion, CountrySummary } from '../models/country.model';

interface RestCountry {
  name?: {
    common?: string;
    official?: string;
    nativeName?: Record<string, { official?: string; common?: string }>;
  };
  cca3?: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  flags?: {
    svg?: string;
    png?: string;
    alt?: string;
  };
  tld?: string[];
  currencies?: Record<string, { name?: string; symbol?: string }>;
  languages?: Record<string, string>;
  borders?: string[];
  continents?: string[];
  maps?: {
    googleMaps?: string;
  };
  timezones?: string[];
  startOfWeek?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CountriesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://restcountries.com/v3.1';

  private countriesCache$?: Observable<CountrySummary[]>;

  getAllCountries(): Observable<CountrySummary[]> {
    if (!this.countriesCache$) {
      const fields = [
        'name',
        'cca3',
        'capital',
        'region',
        'subregion',
        'population',
        'area',
        'flags',
      ].join(',');

      this.countriesCache$ = this.http
        .get<RestCountry[]>(`${this.baseUrl}/all?fields=${fields}`)
        .pipe(
          map((countries) => countries.map((country) => this.toCountrySummary(country))),
          map(sortByName),
          catchError((error) => {
            this.countriesCache$ = undefined;
            return throwError(() => error);
          }),
          shareReplay(1),
        );
    }

    return this.countriesCache$;
  }

  clearCountriesCache(): void {
    this.countriesCache$ = undefined;
  }

  getCountryByCode(code: string): Observable<CountryDetail> {
    const fields = [
      'name',
      'cca3',
      'capital',
      'region',
      'subregion',
      'population',
      'area',
      'flags',
      'tld',
      'currencies',
      'languages',
      'borders',
      'continents',
      'maps',
      'timezones',
      'startOfWeek',
    ].join(',');

    return this.http
      .get<RestCountry>(`${this.baseUrl}/alpha/${code}?fields=${fields}`)
      .pipe(map((country) => this.toCountryDetail(country)));
  }

  getCountriesByCodes(codes: string[]): Observable<CountrySummary[]> {
    if (!codes.length) {
      return of([]);
    }

    const normalizedCodes = [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
    const fields = ['name', 'cca3', 'capital', 'region', 'subregion', 'population', 'area', 'flags'].join(',');

    return this.http
      .get<RestCountry[]>(`${this.baseUrl}/alpha?codes=${normalizedCodes.join(',')}&fields=${fields}`)
      .pipe(map((countries) => countries.map((country) => this.toCountrySummary(country))), map(sortByName));
  }

  private toCountrySummary(country: RestCountry): CountrySummary {
    return {
      code: country.cca3 ?? '',
      name: country.name?.common ?? 'Nome indisponível',
      officialName: country.name?.official ?? 'Nome oficial indisponível',
      region: this.normalizeRegion(country.region),
      subregion: country.subregion ?? 'Sub-região indisponível',
      capital: country.capital?.join(', ') ?? 'Capital indisponível',
      population: country.population ?? 0,
      area: country.area ?? 0,
      flagAlt: country.flags?.alt ?? `Bandeira de ${country.name?.common ?? 'um país'}`,
      flagUrl: country.flags?.svg ?? country.flags?.png ?? '',
    };
  }

  private toCountryDetail(country?: RestCountry): CountryDetail {
    const summary = this.toCountrySummary(country ?? {});
    const nativeNameEntry = country?.name?.nativeName ? Object.values(country.name.nativeName)[0] : undefined;

    return {
      ...summary,
      nativeName: nativeNameEntry?.official ?? nativeNameEntry?.common ?? summary.officialName,
      topLevelDomain: country?.tld ?? [],
      currencies: Object.values(country?.currencies ?? {}).map((currency) => {
        const parts = [currency.name, currency.symbol ? `(${currency.symbol})` : ''].filter(Boolean);
        return parts.join(' ');
      }),
      languages: Object.values(country?.languages ?? {}),
      borders: country?.borders ?? [],
      continents: country?.continents ?? [],
      mapsUrl: country?.maps?.googleMaps ?? '',
      timezones: country?.timezones ?? [],
      startOfWeek: country?.startOfWeek ?? 'Não informado',
    };
  }

  private normalizeRegion(region?: string): CountryRegion {
    const validRegions: CountryRegion[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Antarctic', 'Unknown'];

    if (region && validRegions.includes(region as CountryRegion)) {
      return region as CountryRegion;
    }

    return 'Unknown';
  }
}

function sortByName(countries: CountrySummary[]): CountrySummary[] {
  return [...countries].sort((left, right) => left.name.localeCompare(right.name));
}
