import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { CountryDetail, CountrySummary } from '../../../../core/models/country.model';
import { CountriesApiService } from '../../../../core/services/countries-api.service';

interface CountryDetailState {
  loading: boolean;
  country: CountryDetail | null;
  borderCountries: CountrySummary[];
  error: string | null;
}

@Component({
  selector: 'app-country-detail-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './country-detail-page.html',
  styleUrl: './country-detail-page.scss',
})
export class CountryDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly countriesApi = inject(CountriesApiService);

  readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('code')?.trim().toUpperCase() ?? ''),
      distinctUntilChanged(),
      switchMap((code) => {
        if (!code) {
          return of<CountryDetailState>({
            loading: false,
            country: null,
            borderCountries: [],
            error: 'Código de país inválido.',
          });
        }

        return this.countriesApi.getCountryByCode(code).pipe(
          switchMap((country) =>
            forkJoin({
              country: of(country),
              borderCountries: this.countriesApi.getCountriesByCodes(country.borders),
            }),
          ),
          map(
            ({ country, borderCountries }): CountryDetailState => ({
              loading: false,
              country,
              borderCountries,
              error: null,
            }),
          ),
          startWith({
            loading: true,
            country: null,
            borderCountries: [],
            error: null,
          }),
          catchError(() =>
            of({
              loading: false,
              country: null,
              borderCountries: [],
              error: 'Não foi possível carregar os detalhes deste país.',
            }),
          ),
        );
      }),
    ),
    {
      initialValue: {
        loading: true,
        country: null,
        borderCountries: [],
        error: null,
      },
    },
  );
}
