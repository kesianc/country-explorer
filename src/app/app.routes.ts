import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/countries/pages/countries-page/countries-page').then((module) => module.CountriesPage),
    title: 'Explorador de Paises',
  },
  {
    path: 'country/:code',
    loadComponent: () =>
      import('./features/country-detail/pages/country-detail-page/country-detail-page').then(
        (module) => module.CountryDetailPage,
      ),
    title: 'Detalhes do Pais',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
